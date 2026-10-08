import type { PostgrestMaybeSingleResponse, PostgrestResponse, PostgrestSingleResponse } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/server";
import type {
  AiCallRow,
  CalibrationSampleRow,
  ChatMessageRow,
  EnrollmentRow,
  ConsentKind,
  ConsentRow,
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
  Tone,
  UsageByKindRow,
  UsageSummaryRow,
} from "@/lib/supabase/types";
import { newJoinCode, nowIso } from "@/lib/utils/ids";
import {
  normalizeLessonContent,
  type Feedback,
  type HomeworkResults,
  type LessonContent,
  type LessonReviewNote,
} from "@/lib/lessons/types";

/** Все запросы идут от имени текущего пользователя (cookie-сессия Supabase):
 *  RLS из supabase/migrations/0001_init.sql решает, какие строки видны и что можно менять.
 *  Проверки в src/lib/auth/access.ts остаются как второй слой.
 *  Фоновые задачи без пользователя (крон) оборачивают вызовы в runAsService(). */

export type { Role, LessonStatus, ConsentKind, ConsentRow } from "@/lib/supabase/types";

export type User = ProfileRow;
export type Course = CourseRow;
export type Material = MaterialRow;
export type Flashcard = FlashcardRow;
export type Generation = GenerationRow;
export type ChatMessage = ChatMessageRow;
export type { CalibrationSampleRow };

export interface Lesson extends Omit<LessonRow, "content" | "review"> {
  content: LessonContent;
  review: LessonReviewNote | null;
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

export async function setUserRole(id: string, role: Role): Promise<void> {
  await updateProfile(id, { role });
}

export async function setDailyEmail(id: string, enabled: boolean): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("profiles").update({ daily_email: enabled }).eq("id", id), "daily email");
}

/** Только внутри runAsService: обычному пользователю RLS отдаст лишь его профиль. */
export async function listUsersForDigest(): Promise<User[]> {
  const sb = await getSupabase();
  return unwrap(await sb.from("profiles").select("*").eq("daily_email", true), "digest users");
}

export async function markDigestSent(id: string): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("profiles").update({ last_digest_at: nowIso() }).eq("id", id), "digest sent");
}

export async function updateUserProgress(id: string, p: { streak: number; last_lesson_at: string; xp: number }): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("profiles").update(p).eq("id", id), "progress update");
}

// ---------- consents ----------

export interface ConsentInput {
  kind: ConsentKind;
  version: string;
}

/** Записывает согласия, которых у пользователя ещё нет в этой версии. accepted_at ставит база
 *  (на колонку нет гранта), поэтому передаём только user_id, kind и version. */
export async function ensureConsents(userId: string, items: ConsentInput[]): Promise<void> {
  if (items.length === 0) return;
  const sb = await getSupabase();
  const existing = unwrap(
    await sb.from("consents").select("kind, version").eq("user_id", userId).is("withdrawn_at", null),
    "consents",
  );
  const have = new Set(existing.map((c) => `${c.kind}:${c.version}`));
  const rows = items.filter((i) => !have.has(`${i.kind}:${i.version}`)).map((i) => ({ user_id: userId, kind: i.kind, version: i.version }));
  if (rows.length === 0) return;
  check(await sb.from("consents").insert(rows), "consents insert");
}

export async function listConsents(userId: string): Promise<ConsentRow[]> {
  const sb = await getSupabase();
  return unwrap(
    await sb.from("consents").select("*").eq("user_id", userId).order("accepted_at", { ascending: false }),
    "consents list",
  );
}

/** Есть ли действующее (не отозванное) согласие этого вида в этой версии. */
export async function hasActiveConsent(userId: string, kind: ConsentKind, version: string): Promise<boolean> {
  const sb = await getSupabase();
  const row = unwrapMaybe(
    await sb.from("consents").select("id").eq("user_id", userId).eq("kind", kind).eq("version", version).is("withdrawn_at", null).limit(1).maybeSingle(),
    "consent check",
  );
  return Boolean(row);
}

export async function withdrawConsent(userId: string, kind: ConsentKind): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb.from("consents").update({ withdrawn_at: nowIso() }).eq("user_id", userId).eq("kind", kind).is("withdrawn_at", null),
    "consent withdraw",
  );
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

export async function updateCourseSettings(
  id: string,
  p: { title: string; description: string; audience: string; outcomes: string; tone: Tone; daily_limit: number },
): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb
      .from("courses")
      .update({
        title: p.title.trim(),
        description: p.description.trim(),
        audience: p.audience.trim(),
        outcomes: p.outcomes.trim(),
        tone: p.tone,
        daily_limit: p.daily_limit,
      })
      .eq("id", id),
    "course settings",
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

export interface CourseSummary {
  course: Course;
  lessons: number;
  published: number;
  materials: number;
  students: number;
}

/** Курсы преподавателя со счётчиками для списка: один запрос вместо трёх на каждый курс. */
export async function listCourseSummariesByOwner(ownerId: string): Promise<CourseSummary[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("courses")
      .select("*, lessons(status), materials(id), enrollments(user_id)")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .overrideTypes<
        Array<CourseRow & { lessons: Array<{ status: LessonStatus }>; materials: Array<{ id: string }>; enrollments: Array<{ user_id: string }> }>,
        { merge: false }
      >(),
    "course summaries",
  );
  return rows.map(({ lessons, materials, enrollments, ...course }) => ({
    course,
    lessons: lessons.length,
    published: lessons.filter((l) => l.status === "published").length,
    materials: materials.length,
    students: enrollments.length,
  }));
}

/** Курсы студента с опубликованными уроками (RLS отдаёт студенту только опубликованные). */
export async function listCoursesForStudentWithLessons(userId: string): Promise<Array<{ course: Course; lessons: LessonSummary[] }>> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("enrollments")
      .select(`joined_at, course:courses(*, lessons(${LESSON_SUMMARY_COLUMNS}))`)
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .overrideTypes<Array<{ joined_at: string; course: (CourseRow & { lessons: LessonSummary[] }) | null }>, { merge: false }>(),
    "courses for student",
  );
  return rows.flatMap((r) => {
    if (!r.course) return [];
    const { lessons, ...course } = r.course;
    return [{ course, lessons: lessons.filter((l) => l.status === "published").sort((a, b) => a.position - b.position) }];
  });
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

/** Сколько материалов у курса, без выборки их текста. */
export async function countMaterials(courseId: string): Promise<number> {
  const sb = await getSupabase();
  const res = await sb.from("materials").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  check(res, "materials count");
  return res.count ?? 0;
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
    reviewed_at: r.reviewed_at,
    reviewed_by: r.reviewed_by,
    content: normalizeLessonContent(r.content),
    review: r.review ? (r.review as unknown as LessonReviewNote) : null,
  };
}

/** reviewed: `{ by }` — текст сохранил преподаватель, урок считается проверенным им;
 *  `null` — текст переписала модель, прежняя проверка снимается. Параметр обязателен,
 *  чтобы каждое место вызова решало это явно. */
export async function updateLessonContent(id: string, courseId: string, content: LessonContent, reviewed: { by: string } | null): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb
      .from("lessons")
      .update({
        title: content.title,
        concept: content.concept,
        content: content as unknown as Json,
        reviewed_at: reviewed ? nowIso() : null,
        reviewed_by: reviewed ? reviewed.by : null,
      })
      .eq("id", id)
      .eq("course_id", courseId),
    "lesson content",
  );
}

export async function setLessonReview(id: string, courseId: string, note: LessonReviewNote | null): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb
      .from("lessons")
      .update({ review: note ? (note as unknown as Json) : null })
      .eq("id", id)
      .eq("course_id", courseId),
    "lesson review",
  );
}

/** Меняет урок местами с соседом: direction -1 — вверх, +1 — вниз. */
export async function moveLesson(id: string, courseId: string, direction: -1 | 1): Promise<void> {
  const sb = await getSupabase();
  const lessons = unwrap(
    await sb.from("lessons").select("id, position").eq("course_id", courseId).order("position"),
    "lesson positions",
  );
  const idx = lessons.findIndex((l) => l.id === id);
  const other = lessons[idx + direction];
  if (idx === -1 || !other) return;
  const a = lessons[idx];
  check(await sb.from("lessons").update({ position: -1 }).eq("id", a.id), "move lesson");
  check(await sb.from("lessons").update({ position: a.position }).eq("id", other.id), "move lesson");
  check(await sb.from("lessons").update({ position: other.position }).eq("id", a.id), "move lesson");
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

const LESSON_SUMMARY_COLUMNS = "id, course_id, position, title, concept, status";
export type LessonSummary = Pick<LessonRow, "id" | "course_id" | "position" | "title" | "concept" | "status">;

/** Уроки без контента: для списков, выбора следующего урока и счётчиков. */
export async function listLessonSummaries(courseId: string, opts: { publishedOnly?: boolean } = {}): Promise<LessonSummary[]> {
  const sb = await getSupabase();
  let q = sb.from("lessons").select(LESSON_SUMMARY_COLUMNS).eq("course_id", courseId);
  if (opts.publishedOnly) q = q.eq("status", "published");
  return unwrap(await q.order("position"), "lesson summaries");
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
    objection: r.objection,
    created_at: r.created_at,
    feedback: r.feedback as unknown as Feedback,
  };
}

export async function addSubmission(input: { lessonId: string; userId: string; answer: string; feedback: Feedback; objection?: string }): Promise<Submission> {
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
        objection: input.objection ?? null,
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

/** Последний балл студента по каждому уроку, сгруппировано по курсу: course_id → (lesson_id → score).
 *  Для списка курсов: только три колонки вместо текстов ответов и разборов. */
export async function latestScoresByCourse(userId: string): Promise<Map<string, Map<string, number>>> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("submissions")
      .select("lesson_id, score, created_at, lessons!inner(course_id)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .overrideTypes<Array<{ lesson_id: string; score: number; created_at: string; lessons: { course_id: string } }>, { merge: false }>(),
    "scores by course",
  );
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    let m = out.get(r.lessons.course_id);
    if (!m) out.set(r.lessons.course_id, (m = new Map()));
    if (!m.has(r.lesson_id)) m.set(r.lesson_id, r.score);
  }
  return out;
}

/** Сколько уроков курса студент начал сегодня (первая сдача за день). Для лимита «один урок в день». */
export async function countLessonsStartedToday(userId: string, courseId: string, now = new Date()): Promise<number> {
  const sb = await getSupabase();
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  return unwrap(await sb.rpc("count_lessons_started_today", { u: userId, c: courseId, since }), "lessons started today");
}

export interface SubmissionHistoryItem extends Submission {
  lesson_title: string;
  lesson_position: number;
  course_id: string;
  course_title: string;
}

export async function listUserSubmissions(userId: string): Promise<SubmissionHistoryItem[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("submissions")
      .select("*, lesson:lessons!inner(title, position, course_id, course:courses(title))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200)
      .overrideTypes<
        Array<SubmissionRow & { lesson: { title: string; position: number; course_id: string; course: { title: string } | null } }>,
        { merge: false }
      >(),
    "user submissions",
  );
  return rows.map((r) => ({
    ...rowToSubmission(r),
    lesson_title: r.lesson.title,
    lesson_position: r.lesson.position,
    course_id: r.lesson.course_id,
    course_title: r.lesson.course?.title ?? "",
  }));
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

export async function upsertFlashcards(userId: string, lessonId: string, cardCount: number, nextDueAt: string): Promise<void> {
  if (cardCount <= 0) return;
  const sb = await getSupabase();
  const rows = Array.from({ length: cardCount }, (_, i) => ({ user_id: userId, lesson_id: lessonId, card_index: i, next_due_at: nextDueAt }));
  check(
    await sb.from("flashcards").upsert(rows, { onConflict: "user_id,lesson_id,card_index", ignoreDuplicates: true }),
    "flashcards upsert",
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
      card_index: r.card_index,
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

// ---------- ai calls (учёт расхода) ----------

export interface AiCallRecord {
  courseId: string | null;
  userId: string;
  kind: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  durationMs: number;
}

export async function addAiCall(r: AiCallRecord): Promise<void> {
  const sb = await getSupabase();
  const row: Omit<AiCallRow, "id" | "created_at"> = {
    course_id: r.courseId,
    user_id: r.userId,
    kind: r.kind,
    provider: r.provider,
    model: r.model,
    input_tokens: r.inputTokens,
    output_tokens: r.outputTokens,
    cache_read_tokens: r.cacheReadTokens,
    cache_write_tokens: r.cacheWriteTokens,
    cost_usd: r.costUsd,
    duration_ms: r.durationMs,
  };
  check(await sb.from("ai_calls").insert(row), "ai call insert");
}

export type UsageSummary = UsageSummaryRow;
export type UsageByKind = UsageByKindRow;

const EMPTY_USAGE: UsageSummary = { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cost_usd: 0 };

export async function courseUsage(courseId: string): Promise<UsageSummary> {
  const sb = await getSupabase();
  const rows = unwrap(await sb.rpc("course_usage", { c: courseId }), "course usage");
  return rows[0] ?? EMPTY_USAGE;
}

export async function courseUsageByKind(courseId: string): Promise<UsageByKind[]> {
  const sb = await getSupabase();
  return unwrap(await sb.rpc("course_usage_by_kind", { c: courseId }), "course usage by kind");
}

// ---------- calibration samples ----------

export async function addCalibrationSample(input: { courseId: string; lessonId: string | null; answer: string; score: number; comment: string }): Promise<void> {
  const sb = await getSupabase();
  check(
    await sb.from("calibration_samples").insert({
      course_id: input.courseId,
      lesson_id: input.lessonId,
      answer: input.answer.trim(),
      score: input.score,
      comment: input.comment.trim(),
    }),
    "calibration insert",
  );
}

/** С lessonId: образцы для этого урока и общие по курсу (общие в конце), не больше шести. */
export async function listCalibrationSamples(courseId: string, lessonId?: string): Promise<CalibrationSampleRow[]> {
  const sb = await getSupabase();
  if (lessonId) {
    const rows = unwrap(
      await sb
        .from("calibration_samples")
        .select("*")
        .eq("course_id", courseId)
        .or(`lesson_id.eq.${lessonId},lesson_id.is.null`)
        .order("created_at"),
      "calibration samples",
    );
    return [...rows.filter((r) => r.lesson_id !== null), ...rows.filter((r) => r.lesson_id === null)].slice(0, 6);
  }
  return unwrap(await sb.from("calibration_samples").select("*").eq("course_id", courseId).order("created_at"), "calibration samples");
}

export async function deleteCalibrationSample(id: string, courseId: string): Promise<void> {
  const sb = await getSupabase();
  check(await sb.from("calibration_samples").delete().eq("id", id).eq("course_id", courseId), "calibration delete");
}

// ---------- мои данные: выгрузка и удаление ----------

/** PostgREST отдаёт не больше 1000 строк за запрос: читаем страницами. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<PostgrestResponse<T>>, what: string): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const rows = unwrap(await page(from, from + size - 1), what);
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

export interface UserDataExport {
  profile: ProfileRow;
  consents: ConsentRow[];
  enrollments: Array<EnrollmentRow & { course_title: string }>;
  submissions: SubmissionRow[];
  flashcards: FlashcardRow[];
  ai_calls: AiCallRow[];
  /** Для преподавателя: его курсы и всё внутри них, кроме ответов и записей других людей. */
  courses: CourseRow[];
  materials: MaterialRow[];
  lessons: LessonRow[];
  calibration_samples: CalibrationSampleRow[];
  generations: GenerationRow[];
  chat_messages: ChatMessageRow[];
  homework_checks: HomeworkCheckRow[];
}

/** Всё, что сервис хранит о пользователе (ст. 14 152-ФЗ). Запросы идут от его сессии с явным
 *  фильтром по user_id или owner_id: ответы и записи студентов на курсах преподавателя не входят,
 *  это данные других людей. */
export async function exportUserData(userId: string): Promise<UserDataExport | undefined> {
  const sb = await getSupabase();
  const profile = await getUserById(userId);
  if (!profile) return undefined;
  const [consents, enrollmentRows, submissions, flashcards, aiCalls, courses] = await Promise.all([
    listConsents(userId),
    fetchAll<EnrollmentRow & { course: { title: string } | null }>(
      (from, to) =>
        sb.from("enrollments").select("*, course:courses(title)").eq("user_id", userId).order("joined_at").range(from, to)
          .overrideTypes<Array<EnrollmentRow & { course: { title: string } | null }>, { merge: false }>(),
      "export enrollments",
    ),
    fetchAll<SubmissionRow>((from, to) => sb.from("submissions").select("*").eq("user_id", userId).order("created_at").range(from, to), "export submissions"),
    fetchAll<FlashcardRow>((from, to) => sb.from("flashcards").select("*").eq("user_id", userId).order("created_at").range(from, to), "export flashcards"),
    fetchAll<AiCallRow>((from, to) => sb.from("ai_calls").select("*").eq("user_id", userId).order("created_at").range(from, to), "export ai calls"),
    fetchAll<CourseRow>((from, to) => sb.from("courses").select("*").eq("owner_id", userId).order("created_at").range(from, to), "export courses"),
  ]);
  const courseIds = courses.map((c) => c.id);
  const inCourses = <T>(table: "materials" | "lessons" | "calibration_samples", what: string): Promise<T[]> =>
    courseIds.length === 0
      ? Promise.resolve([])
      : fetchAll<T>((from, to) => sb.from(table).select("*").in("course_id", courseIds).order("created_at").range(from, to).overrideTypes<T[], { merge: false }>(), what);
  const [materials, lessons, calibration, generations, chat, homework] = await Promise.all([
    inCourses<MaterialRow>("materials", "export materials"),
    inCourses<LessonRow>("lessons", "export lessons"),
    inCourses<CalibrationSampleRow>("calibration_samples", "export calibration"),
    fetchAll<GenerationRow>((from, to) => sb.from("generations").select("*").eq("user_id", userId).order("created_at").range(from, to), "export generations"),
    fetchAll<ChatMessageRow>((from, to) => sb.from("chat_messages").select("*").eq("user_id", userId).order("created_at").range(from, to), "export chat"),
    fetchAll<HomeworkCheckRow>((from, to) => sb.from("homework_checks").select("*").eq("user_id", userId).order("created_at").range(from, to), "export homework"),
  ]);
  return {
    profile,
    consents,
    enrollments: enrollmentRows.map(({ course, ...e }) => ({ ...e, course_title: course?.title ?? "" })),
    submissions,
    flashcards,
    ai_calls: aiCalls,
    courses,
    materials,
    lessons,
    calibration_samples: calibration,
    generations,
    chat_messages: chat,
    homework_checks: homework,
  };
}

export interface OwnedCourseWithStudents {
  id: string;
  title: string;
  students: number;
}

/** Курсы пользователя, где есть другие люди: записанные сейчас или оставившие ответы раньше
 *  (отчисленный студент теряет запись, а его ответы остаются на уроках). Пока такие курсы есть,
 *  аккаунт удалять нельзя, иначе каскад унесёт ответы студентов (docs/legal/data-map.md, раздел 6). */
export async function listOwnedCoursesWithStudents(userId: string): Promise<OwnedCourseWithStudents[]> {
  const sb = await getSupabase();
  const rows = unwrap(
    await sb
      .from("courses")
      .select("id, title, enrollments(user_id)")
      .eq("owner_id", userId)
      .overrideTypes<Array<{ id: string; title: string; enrollments: { user_id: string }[] }>, { merge: false }>(),
    "owned courses",
  );
  if (rows.length === 0) return [];
  const answered = unwrap(
    await sb
      .from("submissions")
      .select("user_id, lesson:lessons!inner(course_id)")
      .in("lesson.course_id", rows.map((c) => c.id))
      .neq("user_id", userId)
      .overrideTypes<Array<{ user_id: string; lesson: { course_id: string } }>, { merge: false }>(),
    "owned courses submissions",
  );
  return rows
    .map((c) => {
      const people = new Set(c.enrollments.map((e) => e.user_id).filter((id) => id !== userId));
      for (const s of answered) if (s.lesson.course_id === c.id) people.add(s.user_id);
      return { id: c.id, title: c.title, students: people.size };
    })
    .filter((c) => c.students > 0);
}
