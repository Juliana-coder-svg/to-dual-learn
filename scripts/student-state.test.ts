// Запуск: node --import ./scripts/register.mjs --test scripts/student-state.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { computeStudentProgress, type StateAnswer } from "@/lib/learning/student-state";

const now = new Date("2026-10-16T12:00:00Z");
const L = ["L1", "L2", "L3"];
const a = (u: string, l: string, score: number, day: string): StateAnswer => ({ user_id: u, lesson_id: l, score, created_at: `2026-10-${day}T10:00:00Z` });
const run = (answers: StateAnswer[], ids = ["s"], lessons = L) => computeStudentProgress(ids, lessons, answers, now);

test("без ответов — не начал", () => assert.equal(run([]).get("s")?.state, "not_started"));
test("балл 1–2 на последней попытке — застрял", () => assert.equal(run([a("s", "L1", 2, "16")]).get("s")?.state, "stuck"));
test("пересдача с высоким баллом снимает застревание", () => assert.equal(run([a("s", "L1", 1, "14"), a("s", "L1", 4, "16")]).get("s")?.state, "active"));
test("два дня тишины — идёт, четыре — застрял", () => {
  assert.equal(run([a("s", "L1", 4, "14")]).get("s")?.state, "active");
  assert.equal(run([a("s", "L1", 4, "12")]).get("s")?.state, "stuck");
});
test("последний урок пройден — сдал, даже при старом низком балле", () => {
  const r = run([a("s", "L1", 1, "01"), a("s", "L3", 3, "02")]).get("s");
  assert.equal(r?.state, "done");
  assert.equal(r?.completed, 2);
});
test("черновики не считаются, дата — последняя по опубликованным", () => {
  const r = run([a("s", "L1", 4, "15"), a("s", "DRAFT", 4, "16")]).get("s");
  assert.equal(r?.completed, 1);
  assert.equal(r?.lastAnswerAt, "2026-10-15T10:00:00Z");
});
test("нет опубликованных уроков — не начал", () => assert.equal(run([a("s", "L1", 4, "15")], ["s"], []).get("s")?.state, "not_started"));
test("ответы других студентов не смешиваются", () => {
  const m = run([a("x", "L3", 5, "15")], ["s", "x"]);
  assert.equal(m.get("s")?.state, "not_started");
  assert.equal(m.get("x")?.state, "done");
});
