/**
 * Тестовая группа для прототипа «курс учится у студентов» (docs/concepts/learning-course/prototype-spec.md, раздел 5).
 * Создаёт вымышленных студентов, записывает их на курс-пример и прогоняет ответы из
 * content/seeds/critical-thinking-ai-group.json через настоящего наставника (evaluateAnswer),
 * чтобы сигналы считались по настоящим разборам, а не по написанным руками.
 *
 * Запуск из корня рабочей копии (ключи берём из .env.local основного чекаута; переменная оболочки
 * ANTHROPIC_BASE_URL перекрывает --env-file, поэтому её снимаем):
 *
 *   env -u ANTHROPIC_BASE_URL ALLOW_TEST_GROUP=1 node --env-file=../../../.env.local \
 *     --import ./scripts/register.mjs scripts/seed-test-group.ts <команда> --supabase-host <хост из plan> [--course <uuid>]
 *
 * Команды:
 *   plan      что будет сделано: курс, число новых студентов и оценок, оценка расхода. Базу не меняет.
 *   run       создать тестового преподавателя и курс (если --course не задан), студентов, записать их
 *             и прогнать ответы. Повторный запуск пропускает уже сданные уроки и денег не тратит.
 *   report    посчитать сигналы по курсу функцией computeSignals и сверить с закладками planted.
 *   cleanup   удалить тестовых студентов и преподавателя (ответы и курс уйдут каскадом).
 *
 * Защита: работает только при ALLOW_TEST_GROUP=1 и NODE_ENV != production; в пробном режиме без ключа
 * модели run отказывается, иначе сигнал строился бы на заглушках. Идёт под service role, поэтому
 * курс проверяется по названию и названиям уроков, прежде чем в него что-то писать.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { createServiceClient, runAsService } from "@/lib/supabase/server";
import {
  addMaterial,
  addSubmission,
  createCourse,
  enroll,
  ensureConsents,
  getCourse,
  getLatestSubmission,
  getUserById,
  insertLessons,
  listCalibrationSamples,
  listLessonAnswersForSignals,
  listLessons,
  setAllLessonsStatus,
  updateCourseSettings,
  updateUserProgress,
  upsertFlashcards,
  type Course,
  type Lesson,
} from "@/lib/db/queries";
import { evaluateAnswer, isDemoMode, providerLabel, reevaluateAnswer } from "@/lib/ai";
import { LessonContentSchema } from "@/lib/lessons/types";
import { computeSignals, SIGNAL_LABELS, type CourseSignals } from "@/lib/learning/signals";
import { firstDueAt } from "@/lib/progress/flashcards";
import { nextStreak, xpForLesson } from "@/lib/progress/streak";
import { CONSENT_VERSION } from "@/lib/legal/versions";
import { formatRub, usdToRub } from "@/lib/utils/money";

const GroupSchema = z.object({
  course: z.string(),
  students: z.array(z.object({ n: z.number().int().positive(), name: z.string().min(2) })),
  answers: z.array(
    z.object({
      student: z.number().int().positive(),
      lesson: z.number().int().min(1),
      answer: z.string().min(10),
      objection: z.string().nullable(),
      planted: z.object({ criterion: z.number().int().min(0), expect: z.literal("fail") }).nullable(),
    }),
  ),
});
type Group = z.infer<typeof GroupSchema>;

const CourseSeedSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  audience: z.string(),
  outcomes: z.string(),
  tone: z.enum(["ty", "vy"]),
  materials: z.array(z.object({ filename: z.string(), kind: z.string(), content: z.string() })),
  lessons: z.array(LessonContentSchema),
});

/** Зарезервированный домен (RFC 2606): письма никуда не уходят, email_confirm ставим сами. */
const EMAIL_DOMAIN = "example.com";
const EMAIL_PREFIX = "tg-ct-";
const TEACHER_EMAIL = `${EMAIL_PREFIX}teacher@${EMAIL_DOMAIN}`;
const studentEmail = (n: number) => `${EMAIL_PREFIX}${String(n).padStart(2, "0")}@${EMAIL_DOMAIN}`;
/** Оценка по README: одна проверка ответа $0,02–0,04. */
const COST_PER_EVAL_USD = 0.03;
const CONCURRENCY = 3;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const groupFile = path.join(root, "content", "seeds", "critical-thinking-ai-group.json");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function guard(): void {
  if (process.env.ALLOW_TEST_GROUP !== "1") fail("Нужна переменная ALLOW_TEST_GROUP=1: сценарий пишет тестовых пользователей в базу.");
  if (process.env.NODE_ENV === "production") fail("В production тестовую группу не загружаем.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) fail("Не задан SUPABASE_SERVICE_ROLE_KEY (см. .env.local основного чекаута).");
  // NODE_ENV для обычного node не задан, поэтому проверки production мало: хост базы называем явно.
  const host = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https?:\/\//, "");
  if (process.argv[2] !== "plan" && arg("supabase-host") !== host) fail(`Запись только с явным --supabase-host ${host || "<хост>"}: так вы подтверждаете, в какую базу пишем. Сначала команда plan.`);
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function loadGroup(): Group {
  const group = GroupSchema.parse(JSON.parse(fs.readFileSync(groupFile, "utf8")));
  const ids = new Set(group.students.map((s) => s.n));
  for (const a of group.answers) if (!ids.has(a.student)) fail(`Ответ ссылается на студента ${a.student}, которого нет в списке.`);
  return group;
}

function loadCourseSeed(slug: string) {
  return CourseSeedSchema.parse(JSON.parse(fs.readFileSync(path.join(root, "content", "courses", `${slug}.json`), "utf8")));
}

// ---------- пользователи через Auth admin API ----------

async function listTestUsers(): Promise<Map<string, string>> {
  const admin = createServiceClient();
  const out = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    for (const u of data.users) if (u.email?.startsWith(EMAIL_PREFIX) && u.email.endsWith(`@${EMAIL_DOMAIN}`)) out.set(u.email, u.id);
    if (data.users.length < 1000) return out;
  }
}

async function ensureUser(existing: Map<string, string>, email: string, name: string, role: "teacher" | "student"): Promise<{ id: string; created: boolean }> {
  const have = existing.get(email);
  if (have) return { id: have, created: false };
  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name, role } });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message ?? "нет пользователя"}`);
  existing.set(email, data.user.id);
  return { id: data.user.id, created: true };
}

// ---------- курс ----------

async function findOrCreateCourse(teacherId: string, slug: string, courseId: string | undefined): Promise<{ course: Course; created: boolean }> {
  const seed = loadCourseSeed(slug);
  if (courseId) {
    const course = await getCourse(courseId);
    if (!course) fail(`Курс ${courseId} не найден.`);
    if (course.owner_id !== teacherId) fail(`Курс ${courseId} принадлежит не тестовому преподавателю ${TEACHER_EMAIL}. В чужой курс не пишем.`);
    if (course.title !== seed.title) fail(`Курс ${courseId} называется «${course.title}», а ожидался «${seed.title}». В чужой курс не пишем.`);
    return { course, created: false };
  }
  const sb = createServiceClient();
  const { data: mine } = await sb.from("courses").select("*").eq("owner_id", teacherId).eq("title", seed.title).order("created_at").limit(1);
  if (mine && mine[0]) return { course: mine[0], created: false };
  const course = await createCourse({ ownerId: teacherId, title: seed.title, description: seed.description, audience: seed.audience });
  await updateCourseSettings(course.id, { title: seed.title, description: seed.description, audience: seed.audience, outcomes: seed.outcomes, tone: seed.tone, daily_limit: 1 });
  for (const m of seed.materials) await addMaterial({ courseId: course.id, filename: m.filename, kind: m.kind, contentText: m.content });
  await insertLessons(course.id, seed.lessons);
  await setAllLessonsStatus(course.id, "published");
  return { course: (await getCourse(course.id)) ?? course, created: true };
}

function lessonsByPosition(lessons: Lesson[], group: Group, seedTitles: string[]): Map<number, Lesson> {
  const byPos = new Map(lessons.map((l) => [l.position, l]));
  const positions = [...new Set(group.answers.map((a) => a.lesson))];
  for (const p of positions) {
    const l = byPos.get(p);
    if (!l) fail(`В курсе нет опубликованного урока с позицией ${p}.`);
    if (l.title !== seedTitles[p - 1]) fail(`Урок ${p} в базе называется «${l.title}», в курсе-примере «${seedTitles[p - 1]}». Курс не тот или его правили.`);
    for (const a of group.answers) {
      if (a.lesson === p && a.planted && !l.content.rubricCriteria[a.planted.criterion]) fail(`Закладка на критерий ${a.planted.criterion} урока ${p}: такого критерия в уроке нет.`);
    }
  }
  return byPos;
}

// ---------- команды ----------

async function plan(group: Group): Promise<void> {
  const existing = await listTestUsers();
  const teacherId = existing.get(TEACHER_EMAIL);
  const courseId = arg("course");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  console.log(`Supabase: ${url.replace(/^https?:\/\//, "")}`);
  console.log(`Модель: ${isDemoMode() ? "ПРОБНЫЙ РЕЖИМ, run откажется" : providerLabel()}`);
  console.log(`Преподаватель ${TEACHER_EMAIL}: ${teacherId ? "есть" : "будет создан"}`);
  console.log(`Курс: ${courseId ?? `будет найден или создан из content/courses/${group.course}.json`}`);
  const newStudents = group.students.filter((s) => !existing.has(studentEmail(s.n))).length;
  console.log(`Студентов: ${group.students.length}, новых: ${newStudents}`);
  const evals = group.answers.length;
  const reevals = group.answers.filter((a) => a.objection).length;
  console.log(`Оценок наставника: ${evals} + переоценок по возражениям: ${reevals} ≈ $${((evals + reevals) * COST_PER_EVAL_USD).toFixed(2)} (${formatRub(usdToRub((evals + reevals) * COST_PER_EVAL_USD))}), при повторном запуске уже сданное пропускается.`);
}

async function run(group: Group): Promise<void> {
  if (isDemoMode()) fail("Модель в пробном режиме: разборы были бы заглушками, сигнал по ним бессмысленный. Нужен ключ модели в .env.local.");
  const startedAt = new Date().toISOString();
  const existing = await listTestUsers();
  const teacher = await ensureUser(existing, TEACHER_EMAIL, "Тестовый преподаватель", "teacher");
  await runAsService(async () => {
    await ensureConsents(teacher.id, [{ kind: "processing", version: CONSENT_VERSION.processing }, { kind: "terms", version: CONSENT_VERSION.terms }]);
    const { course, created } = await findOrCreateCourse(teacher.id, group.course, arg("course"));
    console.log(`${created ? "Создан" : "Курс"} «${course.title}» ${course.id}, владелец ${TEACHER_EMAIL}${teacher.created ? " (создан)" : ""}`);
    const lessons = await listLessons(course.id, { publishedOnly: true });
    const byPos = lessonsByPosition(lessons, group, loadCourseSeed(group.course).lessons.map((l) => l.title));

    const students = new Map<number, string>();
    for (const s of group.students) {
      const u = await ensureUser(existing, studentEmail(s.n), s.name, "student");
      students.set(s.n, u.id);
      await ensureConsents(u.id, [{ kind: "processing", version: CONSENT_VERSION.processing }, { kind: "terms", version: CONSENT_VERSION.terms }]);
      await enroll(u.id, course.id);
    }
    console.log(`Студентов записано: ${students.size}`);

    // Порядок как у живой группы: студент идёт по урокам 1 → 3. Параллельно не больше CONCURRENCY студентов.
    const queue = [...group.students];
    let done = 0;
    let skipped = 0;
    const worker = async () => {
      for (;;) {
        const s = queue.shift();
        if (!s) return;
        const userId = students.get(s.n)!;
        const mine = group.answers.filter((a) => a.student === s.n).sort((a, b) => a.lesson - b.lesson);
        for (const a of mine) {
          const lesson = byPos.get(a.lesson)!;
          const previous = await getLatestSubmission(lesson.id, userId);
          if (previous) {
            skipped += 1;
            continue;
          }
          const ctx = { userId, courseId: course.id };
          const samples = (await listCalibrationSamples(course.id, lesson.id)).map((x) => ({ answer: x.answer, score: x.score, comment: x.comment }));
          const feedback = await evaluateAnswer(ctx, lesson.content, a.answer, { tone: course.tone, samples });
          await addSubmission({ lessonId: lesson.id, userId, answer: a.answer, feedback });
          const profile = await getUserById(userId);
          if (profile) {
            await updateUserProgress(userId, { streak: nextStreak(profile.streak, profile.last_lesson_at), last_lesson_at: new Date().toISOString(), xp: profile.xp + xpForLesson(feedback.score) });
          }
          await upsertFlashcards(userId, lesson.id, lesson.content.flashcards.length, firstDueAt());
          let line = `${s.name.padEnd(12)} урок ${a.lesson}: ${feedback.score}/5 ${feedback.criteria.map((c) => (c.met ? "+" : "-")).join("")}`;
          if (a.objection) {
            // Как в api/evaluate: возражение становится отдельной записью с переоценкой, прогресс не меняется.
            const again = await reevaluateAnswer(ctx, lesson.content, a.answer, feedback, a.objection, { tone: course.tone });
            await addSubmission({ lessonId: lesson.id, userId, answer: a.answer, feedback: again, objection: a.objection });
            line += ` → возражение: ${again.score}/5 ${again.criteria.map((c) => (c.met ? "+" : "-")).join("")}`;
          }
          done += 1;
          console.log(line);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(`Оценено: ${done}, пропущено как уже сданное: ${skipped}`);

    const sb = createServiceClient();
    const { data: calls } = await sb.from("ai_calls").select("cost_usd, kind").eq("course_id", course.id).gte("created_at", startedAt);
    const cost = (calls ?? []).reduce((sum, c) => sum + Number(c.cost_usd), 0);
    console.log(`Расход за прогон: ${calls?.length ?? 0} вызовов, $${cost.toFixed(2)} ≈ ${formatRub(usdToRub(cost))} (курс ${process.env.USD_RUB_RATE ?? 90} ₽/$)`);
    console.log(`Вкладка: http://localhost:3000/teach/${course.id}/signals (нужен CONCEPT_SIGNALS=1, вход как ${TEACHER_EMAIL})`);
  });
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function renderReport(r: CourseSignals): string {
  const lines: string[] = [];
  lines.push("| Урок | Сдали | Средний балл | Худший критерий | Возражений | Несовпавших критериев | Сигналы |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const l of r.lessons) {
    const worst = l.worstCriterion ? `${l.worstCriterion.index + 1}: ${l.worstCriterion.failed} из ${l.worstCriterion.of} (${pct(l.worstCriterion.share)})` : "—";
    const signals = l.signals.length === 0 ? (l.enoughData ? "нет" : "мало данных") : l.signals.map((s) => `${SIGNAL_LABELS[s.kind]} (${s.level === "proposal" ? "предложение" : "наблюдение"}): ${s.text}`).join("<br>");
    lines.push(`| ${l.position}. ${l.title} | ${l.submitters} | ${l.avgScore ?? "—"} | ${worst} | ${l.objections}${l.objectionsScoreChanged ? ` (балл изменился у ${l.objectionsScoreChanged})` : ""} | ${l.mismatched} | ${signals} |`);
  }
  lines.push("");
  lines.push(`Данных достаточно: ${r.enoughData ? "да" : "нет"}${r.mostAnswered ? `; больше всего ответов на уроке ${r.mostAnswered.position}: ${r.mostAnswered.count}` : ""}`);
  lines.push("");
  lines.push("Сильнейшие сигналы курса:");
  for (const s of r.top) lines.push(`- Урок ${s.lessonPosition}, ${SIGNAL_LABELS[s.kind]} (${s.level === "proposal" ? "предложение" : "наблюдение"}): ${s.text}. ${s.detail}`);
  if (r.top.length === 0) lines.push("- нет");
  return lines.join("\n");
}

async function report(group: Group): Promise<void> {
  const existing = await listTestUsers();
  const teacherId = existing.get(TEACHER_EMAIL);
  await runAsService(async () => {
    const sbc = createServiceClient();
    const found = teacherId ? (await sbc.from("courses").select("id").eq("owner_id", teacherId).order("created_at").limit(1)).data?.[0]?.id : undefined;
    const courseId = arg("course") ?? found ?? fail("Нет --course и курса тестового преподавателя: сначала run.");
    const course = await getCourse(courseId);
    if (!course) fail(`Курс ${courseId} не найден.`);
    const [lessons, answers, calibration] = await Promise.all([listLessons(course.id, { publishedOnly: true }), listLessonAnswersForSignals(course.id), listCalibrationSamples(course.id)]);
    const r = computeSignals({
      lessons: lessons.map((l) => ({ id: l.id, position: l.position, title: l.title, rubricCriteria: l.content.rubricCriteria })),
      answers,
      calibration: calibration.map((c) => ({ lesson_id: c.lesson_id, answer: c.answer, score: c.score })),
      excludeUserIds: [course.owner_id],
    });
    console.log(renderReport(r));

    // Сверка с закладками: наставник действительно провалил заложенный критерий?
    const byPos = new Map(lessons.map((l) => [l.position, l]));
    const emailById = new Map([...existing.entries()].map(([email, id]) => [id, email]));
    console.log("\nЗакладки:");
    const planted = group.answers.filter((a) => a.planted);
    const byLesson = new Map<number, { planted: number; failed: number }>();
    for (const a of planted) {
      const lesson = byPos.get(a.lesson);
      if (!lesson) continue;
      const first = answers
        .filter((x) => x.lesson_id === lesson.id && emailById.get(x.user_id) === studentEmail(a.student) && !x.objection)
        .sort((x, y) => x.created_at.localeCompare(y.created_at))[0];
      const c = first?.feedback.criteria[a.planted!.criterion];
      const entry = byLesson.get(a.lesson) ?? { planted: 0, failed: 0 };
      entry.planted += 1;
      if (c && !c.met) entry.failed += 1;
      byLesson.set(a.lesson, entry);
    }
    for (const [pos, e] of byLesson) console.log(`- урок ${pos}: заложено ${e.planted}, наставник провалил критерий у ${e.failed}`);
    if (arg("json")) fs.writeFileSync(arg("json")!, JSON.stringify({ course: course.id, signals: r, answers: answers.map((a) => ({ lesson: byPos.get(lessons.find((l) => l.id === a.lesson_id)?.position ?? 0)?.position, student: emailById.get(a.user_id), score: a.score, objection: a.objection, feedback: a.feedback })) }, null, 2));
  });
}

async function cleanup(): Promise<void> {
  const existing = await listTestUsers();
  if (existing.size === 0) {
    console.log("Тестовых пользователей нет.");
    return;
  }
  const admin = createServiceClient();
  for (const [email, id] of existing) {
    const { error } = await admin.auth.admin.deleteUser(id);
    console.log(`${email}: ${error ? `ошибка ${error.message}` : "удалён"}`);
  }
  console.log("Ответы, записи, карточки и курс тестового преподавателя ушли каскадом.");
}

const command = process.argv[2];
guard();
const group = loadGroup();
if (command === "plan") await plan(group);
else if (command === "run") await run(group);
else if (command === "report") await report(group);
else if (command === "cleanup") await cleanup();
else fail("Команда: plan | run | report | cleanup");
