// Запуск: node --import ./scripts/register.mjs --test scripts/lessons-build.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { buildStages, buildStatus, currentStage, estimateBuildSeconds, formatEstimate, parseBuildOutput } from "@/lib/lessons/build";

test("без истории: пять уроков с проверкой — семь минут, три без проверки — около трёх", () => {
  assert.equal(estimateBuildSeconds(5, true).seconds, 420);
  assert.equal(formatEstimate(420), "около 7 минут");
  assert.equal(estimateBuildSeconds(3, false).seconds, 185);
  assert.equal(formatEstimate(185), "около 3,5 минуты");
});

test("с историей: берём медиану на урок только по сборкам с такой же проверкой", () => {
  const history = [
    { count: 5, review: true, seconds: 270 },
    { count: 5, review: false, seconds: 160 },
  ];
  const e = estimateBuildSeconds(5, true, history);
  assert.equal(e.fromHistory, true);
  assert.equal(e.seconds, 270);
  assert.equal(estimateBuildSeconds(5, false, history).seconds, 160);
});

test("этап не откатывается к началу, когда время вышло за оценку", () => {
  const stages = buildStages(true);
  assert.equal(currentStage(stages, 100, 1), 0);
  assert.equal(currentStage(stages, 100, 30), 1);
  assert.equal(currentStage(stages, 100, 99), 2);
  assert.equal(currentStage(stages, 100, 900), 2);
});

test("запись «идёт» старше порога считается прерванной", () => {
  assert.equal(buildStatus({ output: { status: "running" }, ageSeconds: 100 }), "running");
  assert.equal(buildStatus({ output: { status: "running" }, ageSeconds: 4000 }), "stale");
  assert.equal(buildStatus({ output: { status: "done", added: 3, seconds: 9 }, ageSeconds: 4000 }), "done");
  assert.deepEqual(parseBuildOutput("не json"), { status: "running" });
});
