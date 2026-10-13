/**
 * Локальный прогон тестовой группы без базы: настоящий наставник (те же промпты evaluate.ts) оценивает
 * ответы из content/seeds/critical-thinking-ai-group.json, разборы сохраняются в
 * content/seeds/critical-thinking-ai-group.evaluated.json, сигналы считаются по ним. Ничего не пишет в Supabase
 * и в ai_calls, расход считается здесь же.
 *
 *   env -u ANTHROPIC_BASE_URL node --env-file=../../../.env.local --import ./scripts/register.mjs scripts/evaluate-group-local.ts evaluate
 *   node --import ./scripts/register.mjs scripts/evaluate-group-local.ts report
 */
import fs from "node:fs";
import path from "node:path";
import { FeedbackSchema, LessonContentSchema, type Feedback } from "@/lib/lessons/types";
import { evaluatePrompt, reevaluatePrompt } from "@/lib/prompts/evaluate";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { estimateCostUsd } from "@/lib/ai/provider";
import { computeSignals, SIGNAL_LABELS, type SignalAnswer } from "@/lib/learning/signals";
import { formatRub, usdToRub } from "@/lib/utils/money";
import { z } from "zod";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const inFile = path.join(root, "content/seeds/critical-thinking-ai-group.json");
const outFile = path.join(root, "content/seeds/critical-thinking-ai-group.evaluated.json");
const course = z.object({ tone: z.enum(["ty", "vy"]), lessons: z.array(LessonContentSchema) }).parse(JSON.parse(fs.readFileSync(path.join(root, "content/courses/critical-thinking-ai.json"), "utf8")));
const group = JSON.parse(fs.readFileSync(inFile, "utf8")) as { students: Array<{ n: number; name: string }>; answers: Array<{ student: number; lesson: number; answer: string; objection: string | null; planted: { criterion: number } | null }> };

interface Evaluated { student: number; lesson: number; answer: string; planted: { criterion: number } | null; feedback: Feedback; objection: string | null; reevaluated: Feedback | null }
interface Saved { costUsd: number; calls: number; results: Evaluated[] }

async function ask(prompt: string, user: string, usage: { cost: number; calls: number }): Promise<Feedback> {
  const p = anthropicProvider();
  const r = await p.complete({ task: prompt, messages: [{ role: "user", content: user }], maxTokens: 8000, effort: "medium", jsonSchema: FeedbackSchema });
  usage.cost += estimateCostUsd(r.usage, r.model);
  usage.calls += 1;
  return FeedbackSchema.parse(JSON.parse(r.text));
}

async function evaluate(): Promise<void> {
  const usage = { cost: 0, calls: 0 };
  const results: Evaluated[] = [];
  // Неизменившиеся ответы берём из прошлого прогона: платим только за новые и изменённые.
  const old = fs.existsSync(outFile) ? (JSON.parse(fs.readFileSync(outFile, "utf8")) as Saved) : null;
  const reused: Evaluated[] = [];
  const queue = group.answers.filter((a) => {
    const prev = old?.results.find((r) => r.student === a.student && r.lesson === a.lesson && r.answer === a.answer && r.objection === a.objection);
    if (!prev) return true;
    reused.push({ ...prev, planted: a.planted });
    return false;
  });
  results.push(...reused);
  usage.cost = 0;
  const worker = async () => {
    for (;;) {
      const a = queue.shift();
      if (!a) return;
      const lesson = course.lessons[a.lesson - 1];
      const feedback = await ask(evaluatePrompt(lesson, a.answer, { tone: course.tone, samples: [] }), "Оцени ответ по критериям.", usage);
      let reevaluated: Feedback | null = null;
      if (a.objection) {
        reevaluated = await ask(reevaluatePrompt(lesson, a.answer, feedback.summary, feedback.score, a.objection, { tone: course.tone }), "Пересмотри оценку с учётом возражения.", usage);
      }
      results.push({ student: a.student, lesson: a.lesson, answer: a.answer, planted: a.planted, feedback, objection: a.objection, reevaluated });
      console.log(`студент ${a.student} урок ${a.lesson}: ${feedback.score}/5 ${feedback.criteria.map((c) => (c.met ? "+" : "-")).join("")}${reevaluated ? ` → ${reevaluated.score}/5` : ""}`);
    }
  };
  await Promise.all(Array.from({ length: 3 }, worker));
  results.sort((x, y) => x.student - y.student || x.lesson - y.lesson);
  const total = (old?.costUsd ?? 0) + usage.cost;
  fs.writeFileSync(outFile, JSON.stringify({ costUsd: total, calls: (old?.calls ?? 0) + usage.calls, results } satisfies Saved, null, 2));
  console.log(`Новых вызовов: ${usage.calls}, повторно использовано ответов: ${reused.length}, расход этого прогона $${usage.cost.toFixed(2)} ≈ ${formatRub(usdToRub(usage.cost))}, всего по группе $${total.toFixed(2)}`);
}

function report(): void {
  const saved = JSON.parse(fs.readFileSync(outFile, "utf8")) as Saved;
  const lessons = course.lessons.slice(0, 3).map((l, i) => ({ id: `L${i + 1}`, position: i + 1, title: l.title, rubricCriteria: l.rubricCriteria }));
  const answers: SignalAnswer[] = [];
  let t = 0;
  for (const r of saved.results) {
    const base = { lesson_id: `L${r.lesson}`, user_id: `s${r.student}`, answer: r.answer };
    answers.push({ ...base, id: `a${answers.length}`, score: r.feedback.score, feedback: r.feedback, objection: null, created_at: new Date(2026, 9, 1, 0, t++).toISOString() });
    if (r.reevaluated) answers.push({ ...base, id: `a${answers.length}`, score: r.reevaluated.score, feedback: r.reevaluated, objection: r.objection, created_at: new Date(2026, 9, 1, 0, t++).toISOString() });
  }
  const res = computeSignals({ lessons, answers });
  console.log("| Урок | Сдали | Средний балл | Худший критерий | Возражений | Несовпавших критериев | Сигналы |\n|---|---|---|---|---|---|---|");
  for (const l of res.lessons) {
    const w = l.worstCriterion ? `${l.worstCriterion.index + 1}: ${l.worstCriterion.failed} из ${l.worstCriterion.of} (${Math.round(l.worstCriterion.share * 100)}%)` : "—";
    const s = l.signals.length ? l.signals.map((x) => `${SIGNAL_LABELS[x.kind]} (${x.level === "proposal" ? "предложение" : "наблюдение"}): ${x.text}`).join("<br>") : "нет";
    console.log(`| ${l.position}. ${l.title} | ${l.submitters} | ${l.avgScore} | ${w} | ${l.objections}${l.objectionsScoreChanged ? ` (балл изменился у ${l.objectionsScoreChanged})` : ""} | ${l.mismatched} | ${s} |`);
  }
  console.log("\nПо критериям (провалили из сдавших):");
  for (const l of res.lessons) {
    const rubric = lessons[l.position - 1].rubricCriteria;
    const parts = rubric.map((_, i) => {
      let f = 0, n = 0;
      for (const a of answers) if (a.lesson_id === `L${l.position}` && !a.objection) { const c = a.feedback.criteria[i]; if (c) { n++; if (!c.met) f++; } }
      return `${i + 1}: ${f}/${n}`;
    });
    console.log(`- урок ${l.position}: ${parts.join(", ")}`);
  }
  console.log("\nЗакладки: наставник провалил заложенный критерий у");
  for (const pos of [2, 3]) {
    const rows = saved.results.filter((r) => r.lesson === pos && r.planted);
    const failed = rows.filter((r) => !r.feedback.criteria[r.planted!.criterion]?.met).length;
    console.log(`- урок ${pos}: ${failed} из ${rows.length}`);
  }
  console.log("\nСильнейшие:");
  for (const s of res.top) console.log(`- урок ${s.lessonPosition}, ${SIGNAL_LABELS[s.kind]} (${s.level}): ${s.text}. ${s.detail}`);
  console.log(`\nРасход прогона: $${saved.costUsd.toFixed(2)} ≈ ${formatRub(usdToRub(saved.costUsd))}, вызовов ${saved.calls}`);
}

/** Разброс модели: те же 13 ответов урока 2 оцениваются заново N раз, по каждому повтору считаются сигналы. */
async function repeat(times: number): Promise<void> {
  const usage = { cost: 0, calls: 0 };
  const lesson = course.lessons[1];
  const rows = group.answers.filter((a) => a.lesson === 2);
  const lessons = [{ id: "L2", position: 2, title: lesson.title, rubricCriteria: lesson.rubricCriteria }];
  const runs: Array<{ failedCriterion2: number; plantedFailed: number; unplantedFailed: number; signals: string[] }> = [];
  for (let k = 0; k < times; k += 1) {
    const feedbacks = new Array<Feedback>(rows.length);
    const queue = rows.map((a, i) => ({ a, i }));
    const worker = async () => {
      for (;;) {
        const q = queue.shift();
        if (!q) return;
        feedbacks[q.i] = await ask(evaluatePrompt(lesson, q.a.answer, { tone: course.tone, samples: [] }), "Оцени ответ по критериям.", usage);
      }
    };
    await Promise.all(Array.from({ length: 3 }, worker));
    const answers: SignalAnswer[] = rows.map((a, i) => ({ id: `a${i}`, lesson_id: "L2", user_id: `s${a.student}`, answer: a.answer, score: feedbacks[i].score, feedback: feedbacks[i], objection: null, created_at: new Date(2026, 9, 1, 0, i).toISOString() }));
    const sig = computeSignals({ lessons, answers }).lessons[0];
    const failed = (i: number) => !feedbacks[i].criteria[1]?.met;
    const run = {
      failedCriterion2: rows.filter((_, i) => failed(i)).length,
      plantedFailed: rows.filter((a, i) => a.planted && failed(i)).length,
      unplantedFailed: rows.filter((a, i) => !a.planted && failed(i)).length,
      signals: sig.signals.map((x) => `${SIGNAL_LABELS[x.kind]} (${x.level === "proposal" ? "предложение" : "наблюдение"}): ${x.text}`),
    };
    runs.push(run);
    console.log(`повтор ${k + 1}: критерий 2 провален у ${run.failedCriterion2} из ${rows.length} (заложенных ${run.plantedFailed} из ${rows.filter((a) => a.planted).length}, ложных ${run.unplantedFailed}); ${run.signals.join("; ") || "сигналов нет"}`);
  }
  fs.writeFileSync(path.join(root, "content/seeds/critical-thinking-ai-lesson2-repeats.json"), JSON.stringify({ costUsd: usage.cost, calls: usage.calls, runs }, null, 2));
  console.log(`Вызовов: ${usage.calls}, расход $${usage.cost.toFixed(2)} ≈ ${formatRub(usdToRub(usage.cost))}`);
}

const cmd = process.argv[2];
if (cmd === "evaluate") await evaluate();
else if (cmd === "report") report();
else if (cmd === "repeat") await repeat(Number(process.argv[3] ?? 5));
else console.error("Команда: evaluate | report | repeat [N]");
