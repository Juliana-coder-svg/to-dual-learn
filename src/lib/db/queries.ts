import { getDb } from "./index";
import { newId, newJoinCode, nowIso } from "@/lib/utils/ids";
import {
  LessonContentSchema,
  type Feedback,
  type HomeworkResults,
  type LessonContent,
} from "@/lib/lessons/types";

export type Role = "teacher" | "student";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  streak: number;
  last_lesson_at: string | null;
  xp: number;
}

export interface Course {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  audience: string;
  join_code: string;
  created_at: string;
}

export interface Material {
  id: string;
  course_id: string;
  filename: string;
  kind: string;
  content_text: string;
  char_count: number;
  created_at: string;
}

export type LessonStatus = "draft" | "published";

export interface Lesson {
  id: string;
  course_id: string;
  position: number;
  title: string;
  concept: string;
  content: LessonContent;
  status: LessonStatus;
  created_at: string;
}

interface LessonRow extends Omit<Lesson, "content"> {
  content_json: string;
}

export interface Submission {
  id: string;
  lesson_id: string;
  user_id: string;
  answer: string;
  score: number;
  feedback: Feedback;
  created_at: string;
}

interface SubmissionRow extends Omit<Submission, "feedback"> {
  feedback_json: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  lesson_id: string;
  next_due_at: string;
  round: number;
  last_quality: string | null;
  created_at: string;
}

export interface Generation {
  id: string;
  course_id: string;
  user_id: string;
  kind: string;
  prompt: string;
  output: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  course_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface HomeworkCheck {
  id: string;
  course_id: string;
  user_id: string;
  task: string;
  criteria: string;
  results: HomeworkResults;
  created_at: string;
}

interface HomeworkCheckRow extends Omit<HomeworkCheck, "results"> {
  results_json: string;
}

// node:sqlite возвращает Record<string, SQLOutputValue>; наши таблицы типизированы вручную выше.
function one<T>(sql: string, ...params: (string | number | null)[]): T | undefined {
  return getDb().prepare(sql).get(...params) as unknown as T | undefined;
}
function many<T>(sql: string, ...params: (string | number | null)[]): T[] {
  return getDb().prepare(sql).all(...params) as unknown as T[];
}
function run(sql: string, ...params: (string | number | null)[]): void {
  getDb().prepare(sql).run(...params);
}

// ---------- users ----------

export function getUserById(id: string): User | undefined {
  return one<User>("SELECT * FROM users WHERE id = ?", id);
}

export function getUserByEmail(email: string): User | undefined {
  return one<User>("SELECT * FROM users WHERE email = ?", email.trim().toLowerCase());
}

export function upsertUser(input: { email: string; name: string; role: Role }): User {
  const email = input.email.trim().toLowerCase();
  const existing = getUserByEmail(email);
  if (existing) {
    run("UPDATE users SET name = ?, role = ? WHERE id = ?", input.name.trim(), input.role, existing.id);
    return getUserById(existing.id)!;
  }
  const id = newId();
  run(
    "INSERT INTO users (id, email, name, role, created_at) VALUES (?, ?, ?, ?, ?)",
    id, email, input.name.trim(), input.role, nowIso(),
  );
  return getUserById(id)!;
}

export function updateUserProgress(id: string, p: { streak: number; last_lesson_at: string; xp: number }): void {
  run("UPDATE users SET streak = ?, last_lesson_at = ?, xp = ? WHERE id = ?", p.streak, p.last_lesson_at, p.xp, id);
}

// ---------- courses ----------

export function createCourse(input: { ownerId: string; title: string; description: string; audience: string }): Course {
  const id = newId();
  run(
    "INSERT INTO courses (id, owner_id, title, description, audience, join_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, input.ownerId, input.title.trim(), input.description.trim(), input.audience.trim(), newJoinCode(), nowIso(),
  );
  return getCourse(id)!;
}

export function getCourse(id: string): Course | undefined {
  return one<Course>("SELECT * FROM courses WHERE id = ?", id);
}

export function getCourseByJoinCode(code: string): Course | undefined {
  return one<Course>("SELECT * FROM courses WHERE join_code = ?", code.trim().toUpperCase());
}

export function listCoursesByOwner(ownerId: string): Course[] {
  return many<Course>("SELECT * FROM courses WHERE owner_id = ? ORDER BY created_at DESC", ownerId);
}

export function listCoursesForStudent(userId: string): Course[] {
  return many<Course>(
    `SELECT c.* FROM courses c JOIN enrollments e ON e.course_id = c.id
     WHERE e.user_id = ? ORDER BY e.joined_at DESC`,
    userId,
  );
}

export function enroll(userId: string, courseId: string): void {
  run("INSERT OR IGNORE INTO enrollments (user_id, course_id, joined_at) VALUES (?, ?, ?)", userId, courseId, nowIso());
}

export function isEnrolled(userId: string, courseId: string): boolean {
  return Boolean(one("SELECT 1 AS x FROM enrollments WHERE user_id = ? AND course_id = ?", userId, courseId));
}

export interface StudentStats {
  user_id: string;
  name: string;
  email: string;
  streak: number;
  xp: number;
  completed: number;
  avg_score: number | null;
  joined_at: string;
}

export function listStudentsWithStats(courseId: string): StudentStats[] {
  return many<StudentStats>(
    `SELECT u.id AS user_id, u.name, u.email, u.streak, u.xp, e.joined_at,
            COUNT(DISTINCT s.lesson_id) AS completed,
            AVG(s.score) AS avg_score
     FROM enrollments e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN submissions s ON s.user_id = u.id
       AND s.lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)
     WHERE e.course_id = ?
     GROUP BY u.id ORDER BY e.joined_at`,
    courseId, courseId,
  );
}

// ---------- materials ----------

export function addMaterial(input: { courseId: string; filename: string; kind: string; contentText: string }): Material {
  const id = newId();
  run(
    "INSERT INTO materials (id, course_id, filename, kind, content_text, char_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, input.courseId, input.filename, input.kind, input.contentText, input.contentText.length, nowIso(),
  );
  return one<Material>("SELECT * FROM materials WHERE id = ?", id)!;
}

export function listMaterials(courseId: string): Material[] {
  return many<Material>("SELECT * FROM materials WHERE course_id = ? ORDER BY created_at", courseId);
}

export function deleteMaterial(id: string, courseId: string): void {
  run("DELETE FROM materials WHERE id = ? AND course_id = ?", id, courseId);
}

// ---------- lessons ----------

function rowToLesson(r: LessonRow): Lesson {
  const { content_json, ...rest } = r;
  return { ...rest, content: LessonContentSchema.parse(JSON.parse(content_json)) };
}

export function insertLessons(courseId: string, lessons: LessonContent[]): Lesson[] {
  const max = one<{ m: number | null }>("SELECT MAX(position) AS m FROM lessons WHERE course_id = ?", courseId);
  let position = (max?.m ?? 0) + 1;
  const ids: string[] = [];
  for (const content of lessons) {
    const id = newId();
    run(
      "INSERT INTO lessons (id, course_id, position, title, concept, content_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)",
      id, courseId, position++, content.title, content.concept, JSON.stringify(content), nowIso(),
    );
    ids.push(id);
  }
  return ids.map((id) => getLesson(id)!);
}

export function listLessons(courseId: string, opts: { publishedOnly?: boolean } = {}): Lesson[] {
  const rows = opts.publishedOnly
    ? many<LessonRow>("SELECT * FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY position", courseId)
    : many<LessonRow>("SELECT * FROM lessons WHERE course_id = ? ORDER BY position", courseId);
  return rows.map(rowToLesson);
}

export function getLesson(id: string): Lesson | undefined {
  const r = one<LessonRow>("SELECT * FROM lessons WHERE id = ?", id);
  return r ? rowToLesson(r) : undefined;
}

export function setLessonStatus(id: string, courseId: string, status: LessonStatus): void {
  run("UPDATE lessons SET status = ? WHERE id = ? AND course_id = ?", status, id, courseId);
}

export function setAllLessonsStatus(courseId: string, status: LessonStatus): void {
  run("UPDATE lessons SET status = ? WHERE course_id = ?", status, courseId);
}

export function deleteLesson(id: string, courseId: string): void {
  run("DELETE FROM lessons WHERE id = ? AND course_id = ?", id, courseId);
}

// ---------- submissions ----------

function rowToSubmission(r: SubmissionRow): Submission {
  const { feedback_json, ...rest } = r;
  return { ...rest, feedback: JSON.parse(feedback_json) as Feedback };
}

export function addSubmission(input: { lessonId: string; userId: string; answer: string; feedback: Feedback }): Submission {
  const id = newId();
  run(
    "INSERT INTO submissions (id, lesson_id, user_id, answer, score, feedback_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, input.lessonId, input.userId, input.answer, input.feedback.score, JSON.stringify(input.feedback), nowIso(),
  );
  return rowToSubmission(one<SubmissionRow>("SELECT * FROM submissions WHERE id = ?", id)!);
}

export function getLatestSubmission(lessonId: string, userId: string): Submission | undefined {
  const r = one<SubmissionRow>(
    "SELECT * FROM submissions WHERE lesson_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
    lessonId, userId,
  );
  return r ? rowToSubmission(r) : undefined;
}

/** Последний ответ студента на каждый урок курса: lesson_id → submission. */
export function latestSubmissionsForCourse(userId: string, courseId: string): Map<string, Submission> {
  const rows = many<SubmissionRow>(
    `SELECT s.* FROM submissions s
     WHERE s.user_id = ? AND s.lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)
     ORDER BY s.created_at DESC`,
    userId, courseId,
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

export function listSubmissionsByCourse(courseId: string): SubmissionWithContext[] {
  const rows = many<SubmissionRow & { student_name: string; lesson_title: string; lesson_position: number }>(
    `SELECT s.*, u.name AS student_name, l.title AS lesson_title, l.position AS lesson_position
     FROM submissions s JOIN users u ON u.id = s.user_id JOIN lessons l ON l.id = s.lesson_id
     WHERE l.course_id = ? ORDER BY s.created_at DESC LIMIT 200`,
    courseId,
  );
  return rows.map((r) => ({ ...rowToSubmission(r), student_name: r.student_name, lesson_title: r.lesson_title, lesson_position: r.lesson_position }));
}

// ---------- flashcards ----------

export function upsertFlashcard(userId: string, lessonId: string, nextDueAt: string): void {
  run(
    `INSERT INTO flashcards (id, user_id, lesson_id, next_due_at, round, created_at) VALUES (?, ?, ?, ?, 0, ?)
     ON CONFLICT(user_id, lesson_id) DO NOTHING`,
    newId(), userId, lessonId, nextDueAt, nowIso(),
  );
}

export interface DueFlashcard extends Flashcard {
  lesson: Lesson;
  course_title: string;
}

export function listDueFlashcards(userId: string, now = nowIso()): DueFlashcard[] {
  const rows = many<Flashcard & LessonRow & { fc_id: string; course_title: string; lesson_created_at: string }>(
    `SELECT f.id AS fc_id, f.user_id, f.lesson_id, f.next_due_at, f.round, f.last_quality, f.created_at,
            l.id, l.course_id, l.position, l.title, l.concept, l.content_json, l.status, l.created_at AS lesson_created_at,
            c.title AS course_title
     FROM flashcards f JOIN lessons l ON l.id = f.lesson_id JOIN courses c ON c.id = l.course_id
     WHERE f.user_id = ? AND f.next_due_at <= ? ORDER BY f.next_due_at`,
    userId, now,
  );
  return rows.map((r) => ({
    id: r.fc_id,
    user_id: r.user_id,
    lesson_id: r.lesson_id,
    next_due_at: r.next_due_at,
    round: r.round,
    last_quality: r.last_quality,
    created_at: r.created_at,
    course_title: r.course_title,
    lesson: rowToLesson({
      id: r.id, course_id: r.course_id, position: r.position, title: r.title, concept: r.concept,
      content_json: r.content_json, status: r.status, created_at: r.lesson_created_at,
    }),
  }));
}

export function countDueFlashcards(userId: string, now = nowIso()): number {
  return one<{ n: number }>("SELECT COUNT(*) AS n FROM flashcards WHERE user_id = ? AND next_due_at <= ?", userId, now)?.n ?? 0;
}

export function getFlashcard(id: string, userId: string): Flashcard | undefined {
  return one<Flashcard>("SELECT * FROM flashcards WHERE id = ? AND user_id = ?", id, userId);
}

export function updateFlashcard(id: string, p: { nextDueAt: string; round: number; quality: string }): void {
  run("UPDATE flashcards SET next_due_at = ?, round = ?, last_quality = ? WHERE id = ?", p.nextDueAt, p.round, p.quality, id);
}

// ---------- generations ----------

export function addGeneration(input: { courseId: string; userId: string; kind: string; prompt: string; output: string }): Generation {
  const id = newId();
  run(
    "INSERT INTO generations (id, course_id, user_id, kind, prompt, output, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, input.courseId, input.userId, input.kind, input.prompt, input.output, nowIso(),
  );
  return one<Generation>("SELECT * FROM generations WHERE id = ?", id)!;
}

export function listGenerations(courseId: string): Generation[] {
  return many<Generation>("SELECT * FROM generations WHERE course_id = ? ORDER BY created_at DESC LIMIT 50", courseId);
}

// ---------- chat ----------

export function addChatMessage(input: { courseId: string; userId: string; role: "user" | "assistant"; content: string }): ChatMessage {
  const id = newId();
  run(
    "INSERT INTO chat_messages (id, course_id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id, input.courseId, input.userId, input.role, input.content, nowIso(),
  );
  return one<ChatMessage>("SELECT * FROM chat_messages WHERE id = ?", id)!;
}

export function listChatMessages(courseId: string, userId: string, limit = 40): ChatMessage[] {
  return many<ChatMessage>(
    `SELECT * FROM (SELECT * FROM chat_messages WHERE course_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?)
     ORDER BY created_at ASC`,
    courseId, userId, limit,
  );
}

export function clearChat(courseId: string, userId: string): void {
  run("DELETE FROM chat_messages WHERE course_id = ? AND user_id = ?", courseId, userId);
}

// ---------- homework ----------

function rowToHomework(r: HomeworkCheckRow): HomeworkCheck {
  const { results_json, ...rest } = r;
  return { ...rest, results: JSON.parse(results_json) as HomeworkResults };
}

export function addHomeworkCheck(input: { courseId: string; userId: string; task: string; criteria: string; results: HomeworkResults }): HomeworkCheck {
  const id = newId();
  run(
    "INSERT INTO homework_checks (id, course_id, user_id, task, criteria, results_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    id, input.courseId, input.userId, input.task, input.criteria, JSON.stringify(input.results), nowIso(),
  );
  return rowToHomework(one<HomeworkCheckRow>("SELECT * FROM homework_checks WHERE id = ?", id)!);
}

export function listHomeworkChecks(courseId: string): HomeworkCheck[] {
  return many<HomeworkCheckRow>("SELECT * FROM homework_checks WHERE course_id = ? ORDER BY created_at DESC LIMIT 20", courseId).map(rowToHomework);
}

export function setUserRole(id: string, role: Role): void {
  run("UPDATE users SET role = ? WHERE id = ?", role, id);
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

export function addAiCall(r: AiCallRecord): void {
  run(
    `INSERT INTO ai_calls (id, course_id, user_id, kind, provider, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(), r.courseId, r.userId, r.kind, r.provider, r.model, r.inputTokens, r.outputTokens, r.cacheReadTokens, r.cacheWriteTokens, r.costUsd, r.durationMs, nowIso(),
  );
}

export interface UsageSummary {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
}

export function courseUsage(courseId: string): UsageSummary {
  return (
    one<UsageSummary>(
      `SELECT COUNT(*) AS calls, COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens,
              COALESCE(SUM(cache_read_tokens),0) AS cache_read_tokens, COALESCE(SUM(cost_usd),0) AS cost_usd
       FROM ai_calls WHERE course_id = ?`,
      courseId,
    ) ?? { calls: 0, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cost_usd: 0 }
  );
}

export interface UsageByKind extends UsageSummary {
  kind: string;
}

export function courseUsageByKind(courseId: string): UsageByKind[] {
  return many<UsageByKind>(
    `SELECT kind, COUNT(*) AS calls, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens,
            SUM(cache_read_tokens) AS cache_read_tokens, SUM(cost_usd) AS cost_usd
     FROM ai_calls WHERE course_id = ? GROUP BY kind ORDER BY cost_usd DESC`,
    courseId,
  );
}
