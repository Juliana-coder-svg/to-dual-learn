// Проверка функции сигналов на синтетической группе: 12 студентов, 3 урока.
// Запуск: node --import ./scripts/register.mjs --test scripts/signals.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { computeSignals, THRESHOLDS, type SignalAnswer, type SignalLesson } from "@/lib/learning/signals";
import type { Feedback } from "@/lib/lessons/types";

const lessons: SignalLesson[] = [
  { id: "L1", position: 1, title: "Один", rubricCriteria: ["A1", "B1", "C1", "D1"] },
  { id: "L2", position: 2, title: "Два", rubricCriteria: ["A2", "B2", "C2", "D2"] },
  { id: "L3", position: 3, title: "Три", rubricCriteria: ["A3", "B3", "C3", "D3"] },
];

function feedback(lesson: SignalLesson, met: boolean[], improvements: string[]): Feedback {
  const score = met.every(Boolean) ? 4 : met.filter(Boolean).length >= 2 ? 3 : 2;
  return {
    score,
    criteria: lesson.rubricCriteria.map((criterion, i) => ({ criterion, met: met[i], comment: "" })),
    strengths: [],
    improvements,
    worked: null,
    nextStep: null,
    summary: "",
  };
}

function buildGroup(students = 12): SignalAnswer[] {
  const answers: SignalAnswer[] = [];
  let tick = 0;
  const add = (lesson: SignalLesson, user: string, met: boolean[], improvements: string[], objection: string | null = null) => {
    const f = feedback(lesson, met, improvements);
    answers.push({ id: `s${answers.length}`, lesson_id: lesson.id, user_id: user, answer: `ответ ${user} ${lesson.id}`, score: f.score, feedback: f, objection, created_at: new Date(2026, 9, 1, 0, tick++).toISOString() });
  };
  for (let u = 0; u < students; u += 1) {
    const user = `u${u}`;
    // Урок 1 без закладок: редкие ошибки по разным критериям.
    const weak = u % 4;
    add(lessons[0], user, [0, 1, 2, 3].map((i) => !(u % 3 === 0 && i === weak)), u % 3 === 0 ? [`Добавь подробности про пункт ${weak}`] : []);
    // Урок 2: критерий 2 провален у 8 из 12, замечание наставника одно и то же.
    const fails = u < 8;
    add(lessons[1], user, [true, !fails, true, u % 5 !== 0], fails ? ["Объясни, почему спор о цене не выводит из рамки модели"] : ["Процитируй реплику точнее"]);
    // Урок 3: три возражения, одно из них меняет балл.
    add(lessons[2], user, [true, true, u % 2 === 0, true], u % 2 ? ["Назови расхождение формулировок между отчётом и утверждением"] : []);
    if (u < 3) add(lessons[2], user, [true, true, true, true], [], "Я же написал про 48%");
  }
  // Владелец курса сдал урок 2 с провалом: не должен считаться.
  add(lessons[1], "owner", [false, false, false, false], ["Всё не так"]);
  // Повторная сдача студента u0 на урок 1 без ошибок: первой остаётся первая.
  add(lessons[0], "u0", [true, true, true, true], []);
  return answers;
}

test("заложенная ошибка на уроке 2 найдена, урок 1 чистый, возражения на уроке 3 видны", () => {
  const r = computeSignals({ lessons, answers: buildGroup(), excludeUserIds: ["owner"] });
  assert.equal(r.enoughData, true);
  const [l1, l2, l3] = r.lessons;
  assert.equal(l1.submitters, 12);
  assert.deepEqual(l1.signals, []);
  assert.equal(l2.submitters, 12);
  const crit = l2.signals.find((s) => s.kind === "criterion_failed");
  assert.ok(crit);
  assert.equal(crit.criterionIndex, 1);
  assert.equal(crit.count, 8);
  assert.equal(crit.n, 12);
  assert.equal(crit.level, "observation", "8 из 12 без независимого второго сигнала остаётся наблюдением: замечание наставника из того же разбора не в счёт");
  assert.ok(l2.signals.some((s) => s.kind === "repeated_improvement" && s.count === 8));
  const obj = l3.signals.find((s) => s.kind === "objections");
  assert.ok(obj);
  assert.equal(obj.count, 3);
  assert.equal(l3.objectionsScoreChanged, 1);
  assert.ok(r.top.length <= THRESHOLDS.maxSignalsPerCourse);
  assert.ok(r.top.some((s) => s.kind === "criterion_failed" && s.lessonPosition === 2));
});

test("независимый второй сигнал (возражения) поднимает критерий при 10–19 сдавших до предложения", () => {
  const answers = buildGroup();
  const withObjections = [...answers];
  for (const a of answers.filter((x) => x.lesson_id === "L2" && x.user_id !== "owner").slice(0, 3)) {
    withObjections.push({ ...a, id: `o${a.id}`, objection: "Я же объяснил", created_at: new Date(2026, 9, 2).toISOString() });
  }
  const r = computeSignals({ lessons, answers: withObjections, excludeUserIds: ["owner"] });
  const crit = r.lessons[1].signals.find((s) => s.kind === "criterion_failed");
  assert.ok(crit);
  assert.equal(crit.level, "proposal");
});

test("мало данных: меньше 10 сдавших на каждом уроке", () => {
  const answers = buildGroup().filter((a) => a.user_id !== "owner" && Number(a.user_id.slice(1)) < 9);
  const r = computeSignals({ lessons, answers });
  assert.equal(r.enoughData, false);
  assert.deepEqual(r.mostAnswered, { position: 1, title: "Один", count: 9 });
  assert.ok(r.lessons.every((l) => l.signals.length === 0));
  assert.equal(r.top.length, 0);
});

test("критерий с другим текстом при той же длине разбора учитывается по номеру и считается в mismatched", () => {
  const answers = buildGroup().map((a) => (a.lesson_id === "L2" ? { ...a, feedback: { ...a.feedback, criteria: a.feedback.criteria.map((c, i) => (i === 1 ? { ...c, criterion: "Другой текст" } : c)) } } : a));
  const r = computeSignals({ lessons, answers, excludeUserIds: ["owner"] });
  const l2 = r.lessons[1];
  assert.equal(l2.mismatched, 12);
  assert.ok(l2.signals.some((s) => s.kind === "criterion_failed"));
  const shorter = answers.map((a) => (a.lesson_id === "L2" ? { ...a, feedback: { ...a.feedback, criteria: a.feedback.criteria.slice(0, 3).map((c, i) => (i === 1 ? { ...c, criterion: "Другой текст" } : c)) } } : a));
  const r2 = computeSignals({ lessons, answers: shorter, excludeUserIds: ["owner"] });
  assert.ok(!r2.lessons[1].signals.some((s) => s.kind === "criterion_failed"), "урок правили: без точного совпадения текста строка не берётся");
});

test("уровень предложения зависит от размера группы", () => {
  const big: SignalAnswer[] = [];
  for (let u = 0; u < 20; u += 1) {
    const f = feedback(lessons[0], [true, u >= 15, true, true], []);
    big.push({ id: `b${u}`, lesson_id: "L1", user_id: `u${u}`, answer: "", score: f.score, feedback: f, objection: null, created_at: new Date(2026, 9, 1, 0, u).toISOString() });
  }
  const r = computeSignals({ lessons: [lessons[0]], answers: big });
  const s = r.lessons[0].signals.find((x) => x.kind === "criterion_failed");
  assert.ok(s);
  assert.equal(s.share, 0.75);
  assert.equal(s.level, "proposal");
});
