import type { PostgrestMaybeSingleResponse, PostgrestSingleResponse } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";
import type {
  ChatMessageRow,
  CourseRow,
  FlashcardRow,
  GenerationRow,
  HomeworkCheckRow,
  Json,
  LessonRow,
  LessonStatus,
  MaterialRow,
  ProfileRow,
  Role,
  StudentStatsRow,
  SubmissionRow,
} from "@/lib/supabase/types";
import { newJoinCode, nowIso } from "@/lib/utils/ids";
import {
  LessonContentSchema,
  type Feedback,
  type HomeworkResults,
  type LessonContent,
} from "@/lib/lessons/types";

/** Все запросы идут от имени текущего пользователя (cookie-сессия Supabase):
 *  RLS из supabase/migrations/0001_init.sql решает, какие строки видны и что можно менять.
 *  Проверки в src/lib/auth/access.ts остаются как второй слой. */

export type { Role, LessonStatus } from "@/lib/supabase/types";

export type User = ProfileRow;
export type Course = CourseRow;
export type Material = MaterialRow;
export type Flashcard = FlashcardRow;
export type Generation = GenerationRow;
export type ChatMessage = ChatMessageRow;

export interface Lesson extends Omit<LessonRow, "content"> {
  content: LessonContent;
}

export interface Submission extends Omit<SubmissionRow, "feedback"> {
  feedback: Feedback;
}

export interface HomeworkCheck extends Omit<HomeworkCheckRow, "results"> {
  results: HomeworkResults;
}

/** Ошибка PostgREST превращается в исключение: route handlers отдадут её через handleRouteError. */
function unwrap<T>(res: PostgrestSingleResponse<T>, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

function unwrapMaybe<T>(res: PostgrestMaybeSingleResponse<T>, what: string): T | undefined {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data ?? undefined;
}

function check(res: { error: { message: string } | null }, what: string): void {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
}

// ---------- users ----------

export async function getUserById(id: string): Promise<User | undefined> {
  const sb = await getSupabase();
  return unwrapMaybe(await sb.from("profiles").select("*").eq("id", id).maybeSingle(), "profile");
}

export async function updateProfile(id: string, p: { name?: string; role?: Role }): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("profiles").update(p).eq("id", id), "profile update");
}

export async function updateUserProgress(id: string, p: { streak: number; last_lesson_at: string; xp: number }): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("profiles").update(p).eq("id", id), "progress update");
}

export async function setUserRole(id: string, role: Role): Promise<void> {
  await updateProfile(id, { role });
}

// ---------- courses ----------

export async function createCourse(input: { ownerId: string; title: string; description: string; audience: string }): Promise<Course> {
  const sb = await getSupabase();
  return unwrap(
    await sb
      .from("courses")
      .insert({
        owner_id: input.ownerId,
        title: input.title.trim(),
        description: input.description.trim(),
        audience: input.audience.trim(),
        join_code: newJoinCode(),
      })
      .select("*")
      .single(),
    "course insert",
  );
}

export async function getCourse(id: string): Promise<Course | undefined> {
  const sb = await getSupabase();
  return unwrapMaybe(await sb.from("courses").select("*").eq("id", id).maybeSingle(), "course");
}

/** Через RPC: до записи на курс RLS не даёт прочитать его напрямую. */
export async function getCourseByJoinCode(code: string): Promise<Course | undefined> {
  const sb = await getSupabase();
  const rows = unwrap(await sb.rpc("course_by_join_code", { code: code.trim().toUpperCase() }), "course by code");
  return rows[0];
}

export async function listCoursesByOwner(ownerId: string): Promise<Course[]> {
  const sb = await getSupabase();
  return unwrap(
    await sb.from("courses").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false }),
    "courses by owner",
  );
}

export async function listCoursesForStudent(userId: string): Promise<Course[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("enrollments")
      .select("joined_at, course:courses(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .overrideTypes<Array<{ joined_at: string; course: CourseRow | null }>, { merge: false }>(),
    "courses for student",
  );
  return rows.flatMap((r) => (r.course ? [r.course] : []));
}

export async function enroll(userId: string, courseId: string): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb
      .from("enrollments")
      .upsert({ user_id: userId, course_id: courseId }, { onConflict: "user_id,course_id", ignoreDuplicates: true }),
    "enroll",
  );
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const sb = await getSupabase();
  const row = unwrapMaybe(
    await sb.from("enrollments").select("course_id").eq("user_id", userId).eq("course_id", courseId).maybeSingle(),
    "enrollment",
  );
  return Boolean(row);
}

export type StudentStats = StudentStatsRow;

export async function listStudentsWithStats(courseId: string): Promise<StudentStats[]> {
  const sb = await getSupabase();
  return unwrap(await sb.rpc("course_students_stats", { c: courseId }), "students stats");
}

// ---------- materials ----------

export async function addMaterial(input: { courseId: string; filename: string; kind: string; contentText: string }): Promise<Material> {
  const sb = await getSupabase();
  return unwrap(
    await sb
      .from("materials")
      .insert({
        course_id: input.courseId,
        filename: input.filename,
        kind: input.kind,
        content_text: input.contentText,
        char_count: input.contentText.length,
      })
      .select("*")
      .single(),
    "material insert",
  );
}

export async function listMaterials(courseId: string): Promise<Material[]> {
  const sb = await getSupabase();
  return unwrap(await sb.from("materials").select("*").eq("course_id", courseId).order("created_at"), "materials");
}

export async function deleteMaterial(id: string, courseId: string): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("materials").delete().eq("id", id).eq("course_id", courseId), "material delete");
}

// ---------- lessons ----------

function rowToLesson(r: LessonRow): Lesson {
  return {
    id: r.id,
    course_id: r.course_id,
    position: r.position,
    title: r.title,
    concept: r.concept,
    status: r.status,
    created_at: r.created_at,
    content: LessonContentSchema.parse(r.content),
  };
}

export async function insertLessons(courseId: string, lessons: LessonContent[]): Promise<Lesson[]> {
  const sb = await getSupabase();
  // Отдельная переменная: при inline-передаче tsc выводит для этой цепочки never.
  const lastRes = await sb.from("lessons").select("position").eq("course_id", courseId).order("position", { ascending: false }).limit(1).maybeSingle();
  const last = unwrapMaybe(lastRes, "max position");
  let position = (last?.position ?? 0) + 1;
  const rows = lessons.map((content) => ({
    course_id: courseId,
    position: position++,
    title: content.title,
    concept: content.concept,
    content: content as unknown as Json,
    status: "draft" as const,
  }));
  if (rows.length === 0) return [];
  const inserted = unwrap(await sb.from("lessons").insert(rows).select("*").order("position"), "lessons insert");
  return inserted.map(rowToLesson);
}

export async function listLessons(courseId: string, opts: { publishedOnly?: boolean } = {}): Promise<Lesson[]> {
  const sb = await getSupabase();
  let q = sb.from("lessons").select("*").eq("course_id", courseId);
  if (opts.publishedOnly) q = q.eq("status", "published");
  const rows = unwrap(await q.order("position"), "lessons");
  return rows.map(rowToLesson);
}

export async function getLesson(id: string): Promise<Lesson | undefined> {
  const sb = await getSupabase();
  const r = unwrapMaybe(await sb.from("lessons").select("*").eq("id", id).maybeSingle(), "lesson");
  return r ? rowToLesson(r) : undefined;
}

export async function setLessonStatus(id: string, courseId: string, status: LessonStatus): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("lessons").update({ status }).eq("id", id).eq("course_id", courseId), "lesson status");
}

export async function setAllLessonsStatus(courseId: string, status: LessonStatus): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("lessons").update({ status }).eq("course_id", courseId), "lessons status");
}

export async function deleteLesson(id: string, courseId: string): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("lessons").delete().eq("id", id).eq("course_id", courseId), "lesson delete");
}

// ---------- submissions ----------

/** Собирает Submission по известным полям: вложенные embed-объекты PostgREST в результат не попадают. */
function rowToSubmission(r: SubmissionRow): Submission {
  return {
    id: r.id,
    lesson_id: r.lesson_id,
    user_id: r.user_id,
    answer: r.answer,
    score: r.score,
    created_at: r.created_at,
    feedback: r.feedback as unknown as Feedback,
  };
}

export async function addSubmission(input: { lessonId: string; userId: string; answer: string; feedback: Feedback }): Promise<Submission> {
  const sb = await getSupabase();
  const row = unwrap(
    await sb
      .from("submissions")
      .insert({
        lesson_id: input.lessonId,
        user_id: input.userId,
        answer: input.answer,
        score: input.feedback.score,
        feedback: input.feedback as unknown as Json,
      })
      .select("*")
      .single(),
    "submission insert",
  );
  return rowToSubmission(row);
}

export async function getLatestSubmission(lessonId: string, userId: string): Promise<Submission | undefined> {
  const sb = await getSupabase();
  const r = unwrapMaybe(
    await sb
      .from("submissions")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "latest submission",
  );
  return r ? rowToSubmission(r) : undefined;
}

/** Последний ответ студента на каждый урок курса: lesson_id → submission. */
export async function latestSubmissionsForCourse(userId: string, courseId: string): Promise<Map<string, Submission>> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("submissions")
      .select("*, lessons!inner(course_id)")
      .eq("user_id", userId)
      .eq("lessons.course_id", courseId)
      .order("created_at", { ascending: false })
      .overrideTypes<Array<SubmissionRow & { lessons: { course_id: string } }>, { merge: false }>(),
    "submissions for course",
  );
  const map = new Map<string, Submission>();
  for (const r of rows) if (!map.has(r.lesson_id)) map.set(r.lesson_id, rowToSubmission(r));
  return map;
}

export interface SubmissionWithContext extends Submission {
  student_name: string;
  lesson_title: string;
  lesson_position: number;
}

export async function listSubmissionsByCourse(courseId: string): Promise<SubmissionWithContext[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("submissions")
      .select("*, student:profiles(name), lesson:lessons!inner(title, position, course_id)")
      .eq("lesson.course_id", courseId)
      .order("created_at", { ascending: false })
      .limit(200)
      .overrideTypes<
        Array<SubmissionRow & { student: { name: string } | null; lesson: { title: string; position: number; course_id: string } }>,
        { merge: false }
      >(),
    "submissions by course",
  );
  return rows.map((r) => ({
    ...rowToSubmission(r),
    student_name: r.student?.name ?? "",
    lesson_title: r.lesson.title,
    lesson_position: r.lesson.position,
  }));
}

// ---------- flashcards ----------

export async function upsertFlashcard(userId: string, lessonId: string, nextDueAt: string): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb
      .from("flashcards")
      .upsert({ user_id: userId, lesson_id: lessonId, next_due_at: nextDueAt }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true }),
    "flashcard upsert",
  );
}

export interface DueFlashcard extends Flashcard {
  lesson: Lesson;
  course_title: string;
}

export async function listDueFlashcards(userId: string, now = nowIso()): Promise<DueFlashcard[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("flashcards")
      .select("*, lesson:lessons(*, course:courses(title))")
      .eq("user_id", userId)
      .lte("next_due_at", now)
      .order("next_due_at")
      .overrideTypes<Array<FlashcardRow & { lesson: (LessonRow & { course: { title: string } | null }) | null }>, { merge: false }>(),
    "due flashcards",
  );
  // Урок, снятый с публикации, RLS скроет — такую карточку не показываем.
  return rows.flatMap((r) => {
    if (!r.lesson) return [];
    return [{
      id: r.id,
      user_id: r.user_id,
      lesson_id: r.lesson_id,
      next_due_at: r.next_due_at,
      round: r.round,
      last_quality: r.last_quality,
      created_at: r.created_at,
      lesson: rowToLesson(r.lesson),
      course_title: r.lesson.course?.title ?? "",
    }];
  });
}

export async function countDueFlashcards(userId: string, now = nowIso()): Promise<number> {
  const sb = await getSupabase();
  const res = await sb.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", userId).lte("next_due_at", now);
  check(res, "due count");
  return res.count ?? 0;
}

export async function getFlashcard(id: string, userId: string): Promise<Flashcard | undefined> {
  const sb = await getSupabase();
  return unwrapMaybe(await sb.from("flashcards").select("*").eq("id", id).eq("user_id", userId).maybeSingle(), "flashcard");
}

export async function updateFlashcard(id: string, p: { nextDueAt: string; round: number; quality: string }): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb.from("flashcards").update({ next_due_at: p.nextDueAt, round: p.round, last_quality: p.quality }).eq("id", id),
    "flashcard update",
  );
}

// ---------- generations ----------

export async function addGeneration(input: { courseId: string; userId: string; kind: string; prompt: string; output: string }): Promise<Generation> {
  const sb = await getSupabase();
  return unwrap(
    await sb
      .from("generations")
      .insert({ course_id: input.courseId, user_id: input.userId, kind: input.kind, prompt: input.prompt, output: input.output })
      .select("*")
      .single(),
    "generation insert",
  );
}

export async function listGenerations(courseId: string): Promise<Generation[]> {
  const sb = await getSupabase();
  return unwrap(
    await sb.from("generations").select("*").eq("course_id", courseId).order("created_at", { ascending: false }).limit(50),
    "generations",
  );
}

// ---------- chat ----------

export async function addChatMessage(input: { courseId: string; userId: string; role: "user" | "assistant"; content: string }): Promise<ChatMessage> {
  const sb = await getSupabase();
  return unwrap(
    await sb
      .from("chat_messages")
      .insert({ course_id: input.courseId, user_id: input.userId, role: input.role, content: input.content })
      .select("*")
      .single(),
    "chat insert",
  );
}

export async function listChatMessages(courseId: string, userId: string, limit = 40): Promise<ChatMessage[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("chat_messages")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    "chat messages",
  );
  return rows.reverse();
}

export async function clearChat(courseId: string, userId: string): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("chat_messages").delete().eq("course_id", courseId).eq("user_id", userId), "chat clear");
}

// ---------- homework ----------

function rowToHomework(r: HomeworkCheckRow): HomeworkCheck {
  const { results, ...rest } = r;
  return { ...rest, results: results as unknown as HomeworkResults };
}

export async function addHomeworkCheck(input: { courseId: string; userId: string; task: string; criteria: string; results: HomeworkResults }): Promise<HomeworkCheck> {
  const sb = await getSupabase();
  const row = unwrap(
    await sb
      .from("homework_checks")
      .insert({
        course_id: input.courseId,
        user_id: input.userId,
        task: input.task,
        criteria: input.criteria,
        results: input.results as unknown as Json,
      })
      .select("*")
      .single(),
    "homework insert",
  );
  return rowToHomework(row);
}

export async function listHomeworkChecks(courseId: string): Promise<HomeworkCheck[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb.from("homework_checks").select("*").eq("course_id", courseId).order("created_at", { ascending: false }).limit(20),
    "homework checks",
  );
  return rows.map(rowToHomework);
}
