/**
 * Проверка задачи 3.8 (ядро разбора, стоп-фразы): 30 ответов из тестовой группы прогоняются через evaluatePrompt,
 * в разборах считаются стоп-фразы и цитаты из ответа. Для сравнения те же ответы берутся из прошлого прогона
 * (content/seeds/critical-thinking-ai-group.evaluated.json, промпт до правки). Ничего не пишет в Supabase.
 *
 *   env -u ANTHROPIC_BASE_URL node --env-file=../../../.env.local --import ./scripts/register.mjs scripts/tone-core-check.ts run
 *   node --import ./scripts/register.mjs scripts/tone-core-check.ts report
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { FeedbackSchema, LessonContentSchema, type Feedback } from "@/lib/lessons/types";
import { evaluatePrompt } from "@/lib/prompts/evaluate";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { estimateCostUsd } from "@/lib/ai/provider";
import { formatRub, usdToRub } from "@/lib/utils/money";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const seed = path.join(root, "content/seeds/critical-thinking-ai-group.json");
const oldFile = path.join(root, "content/seeds/critical-thinking-ai-group.evaluated.json");
const outFile = path.join(root, "content/seeds/tone-core-check.evaluated.json");
const course = z.object({ tone: z.enum(["ty", "vy"]), lessons: z.array(LessonContentSchema) }).parse(JSON.parse(fs.readFileSync(path.join(root, "content/courses/critical-thinking-ai.json"), "utf8")));
const group = JSON.parse(fs.readFileSync(seed, "utf8")) as { answers: Array<{ student: number; lesson: number; answer: string; objection: string | null }> };

/** Стоп-фразы: из system.ts и из интервью. Основы слов, поиск без учёта регистра и ё. */
export const STOP = [
  "в современном мире", "в эпоху цифровизации", "важно отметить", "стоит отметить", "следует отметить", "давайте разберёмся", "погрузим",
  "ключев", "эффективн", "уникальн", "инновацион", "это не просто", "безусловно", "несомненно", " итак", "в заключение", "подводя итог",
  "надеюсь, это поможет", "отличный вопрос", "как опытный специалист", "комплексн", "не упустите", "мы рады", "революцион",
  "стоит подчеркнуть", "мир возможностей", "проделали большую работу", "потенциал для улучшения", "рекомендуем обратить внимание",
  "молодец", "отличная работа", "на верном пути", "отличная попытка",
];

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");

function texts(f: Feedback): Record<string, string> {
  return {
    summary: f.summary, worked: f.worked ?? "", nextStep: f.nextStep ?? "",
    criteria: f.criteria.map((c) => c.comment).join(" "), strengths: f.strengths.join(" "), improvements: f.improvements.join(" "),
  };
}

export function stopHits(f: Feedback): string[] {
  const all = norm(Object.values(texts(f)).join(" "));
  const hits = STOP.filter((p) => all.includes(norm(p)));
  if (all.includes("!")) hits.push("!");
  return hits;
}

/** Цитата: фрагмент в «ёлочках» или „лапках“, не короче 10 знаков, дословно есть в ответе. */
function quotes(text: string, answer: string): string[] {
  const a = norm(answer).replace(/[«»„“”"]/g, "");
  const found: string[] = [];
  for (const m of text.matchAll(/[«„]([^»“]{10,})[»“]/g)) {
    const q = norm(m[1]).replace(/[«»„“”"]/g, "").replace(/[…\s.,;:!?-]+$/g, "").replace(/^[…\s.,;:!?-]+/g, "").split("…")[0].trim();
    if (q.length >= 10 && a.includes(q)) found.push(q);
  }
  return found;
}

export function hasQuote(f: Feedback, answer: string, scope: "any" | "summary"): boolean {
  const t = texts(f);
  const fields = scope === "any" ? Object.values(t) : [t.summary, t.worked];
  return fields.some((x) => quotes(x, answer).length > 0);
}

function pick(): Array<{ student: number; lesson: number; answer: string }> {
  const rows: Array<{ student: number; lesson: number; answer: string }> = [];
  for (const l of [1, 2, 3]) {
    const cand = group.answers.filter((a) => a.lesson === l && !a.objection);
    rows.push(...cand.slice(0, 10));
  }
  return rows;
}

interface Row { student: number; lesson: number; answer: string; feedback: Feedback }
interface Saved { costUsd: number; calls: number; results: Row[] }

async function run(): Promise<void> {
  const rows = pick();
  const usage = { cost: 0, calls: 0 };
  const results: Row[] = [];
  const queue = [...rows];
  const worker = async () => {
    for (;;) {
      const a = queue.shift();
      if (!a) return;
      const r = await anthropicProvider().complete({ task: evaluatePrompt(course.lessons[a.lesson - 1], a.answer, { tone: course.tone, samples: [] }), messages: [{ role: "user", content: "Оцени ответ по критериям." }], maxTokens: 8000, effort: "medium", jsonSchema: FeedbackSchema });
      usage.cost += estimateCostUsd(r.usage, r.model);
      usage.calls += 1;
      results.push({ ...a, feedback: FeedbackSchema.parse(JSON.parse(r.text)) });
      console.log(`студент ${a.student} урок ${a.lesson}: готово`);
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  results.sort((x, y) => x.lesson - y.lesson || x.student - y.student);
  fs.writeFileSync(outFile, JSON.stringify({ costUsd: usage.cost, calls: usage.calls, results } satisfies Saved, null, 2));
  console.log(`Вызовов: ${usage.calls}, расход $${usage.cost.toFixed(2)} ≈ ${formatRub(usdToRub(usage.cost))}`);
}

function stats(label: string, rows: Row[]): void {
  const withStop = rows.filter((r) => stopHits(r.feedback).length > 0);
  const qAny = rows.filter((r) => hasQuote(r.feedback, r.answer, "any")).length;
  const qSum = rows.filter((r) => hasQuote(r.feedback, r.answer, "summary")).length;
  const oneStep = rows.filter((r) => r.feedback.nextStep && r.feedback.nextStep.trim().length > 0).length;
  const ratio = rows.map((r) => (r.feedback.summary.length + (r.feedback.worked ?? "").length + (r.feedback.nextStep ?? "").length) / r.answer.length).sort((a, b) => a - b);
  console.log(`${label}: n=${rows.length}; со стоп-фразой ${withStop.length}${withStop.length ? ` (${withStop.map((r) => `с${r.student}/у${r.lesson}: ${stopHits(r.feedback).join(", ")}`).join("; ")})` : ""}; цитата в любом поле ${qAny} (${Math.round((qAny / rows.length) * 100)}%); цитата в summary или worked ${qSum} (${Math.round((qSum / rows.length) * 100)}%); nextStep заполнен ${oneStep}; длина разбора к ответу, медиана ${ratio[Math.floor(ratio.length / 2)].toFixed(2)}; средний балл ${(rows.reduce((s, r) => s + r.feedback.score, 0) / rows.length).toFixed(2)}`);
}

function report(): void {
  const now = JSON.parse(fs.readFileSync(outFile, "utf8")) as Saved;
  const old = JSON.parse(fs.readFileSync(oldFile, "utf8")) as { results: Array<{ student: number; lesson: number; answer: string; feedback: Feedback }> };
  const before = now.results.map((r) => old.results.find((o) => o.student === r.student && o.lesson === r.lesson && o.answer === r.answer)).filter((x): x is NonNullable<typeof x> => Boolean(x));
  stats("до правки (прошлый прогон)", before);
  stats("после правки", now.results);
  const same = now.results.filter((r) => before.find((b) => b.student === r.student && b.lesson === r.lesson)?.feedback.score === r.feedback.score).length;
  const near = now.results.filter((r) => Math.abs((before.find((b) => b.student === r.student && b.lesson === r.lesson)?.feedback.score ?? 99) - r.feedback.score) <= 1).length;
  console.log(`балл совпал с прошлым прогоном: ${same} из ${now.results.length}, в пределах ±1: ${near}`);
  console.log(`расход: $${now.costUsd.toFixed(2)} ≈ ${formatRub(usdToRub(now.costUsd))}, вызовов ${now.calls}`);
}

const cmd = process.argv[2];
if (cmd === "run") await run();
else if (cmd === "report") report();
else console.error("Команда: run | report");
