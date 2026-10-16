"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProgressAsterisk } from "@/components/shared/ProgressAsterisk";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/shared/Notice";
import { plural } from "@/lib/utils/format";
import { buildStages, buildStatus, currentStage, estimateBuildSeconds, formatEstimate, type BuildState, type FinishedBuild } from "@/lib/lessons/build";

function clock(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function LessonsGenerator({ courseId, disabled, builds }: { courseId: string; disabled: boolean; builds: BuildState[] }) {
  const router = useRouter();
  const [count, setCount] = useState(3);
  const [review, setReview] = useState(true);
  const [questions, setQuestions] = useState<{ question: string; why: string }[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  async function ask() {
    setAsking(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/lessons/questions?courseId=${encodeURIComponent(courseId)}`);
      const data = (await res.json()) as { ok?: boolean; error?: string; questions?: { question: string; why: string }[] };
      if (!res.ok || !data.ok || !data.questions) throw new Error(data.error ?? "Не удалось получить вопросы. Попробуйте ещё раз через минуту.");
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ""));
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Не удалось выполнить действие. Попробуйте ещё раз через минуту.", kind: "error" });
    } finally {
      setAsking(false);
    }
  }

  async function saveAnswers() {
    if (!questions) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload = questions.map((q, i) => ({ question: q.question, answer: answers[i] ?? "" })).filter((a) => a.answer.trim());
      const res = await fetch("/api/lessons/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, answers: payload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; saved?: number };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось сохранить ответы. Они остались в полях: нажмите «Сохранить ответы» ещё раз.");
      setNotesSaved(true);
      setQuestions(null);
      setMsg({ text: `Сохранено ответов: ${data.saved}. Они стали материалом курса, теперь можно собирать уроки.`, kind: "success" });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Не удалось выполнить действие. Попробуйте ещё раз через минуту.", kind: "error" });
    } finally {
      setSaving(false);
    }
  }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "success" | "error" } | null>(null);

  async function generate() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, count, review }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; added?: number; reviewSummary?: string };
      if (res.status === 409) router.refresh();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось собрать уроки. Попробуйте ещё раз: если не выйдет, уменьшите число уроков.");
      setMsg({ text: `Собрано ${plural(data.added ?? 0, "урок", "урока", "уроков")}. ${data.reviewSummary ?? "Откройте их, поправьте и опубликуйте."}`, kind: "success" });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Не удалось выполнить действие. Попробуйте ещё раз через минуту.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  // Сборку могли начать раньше и закрыть страницу: тогда она идёт на сервере, и запись в generations это помнит.
  const latest = builds[0] as BuildState | undefined;
  const latestStatus = latest ? buildStatus(latest) : null;
  const serverRunning = !busy && latestStatus === "running";
  const active = busy || serverRunning;
  const params = serverRunning && latest ? latest.params : { count, review };
  const finished: FinishedBuild[] = builds.flatMap((b) => (b.output.status === "done" ? [{ count: b.params.count, review: b.params.review, seconds: b.output.seconds }] : []));
  const estimate = estimateBuildSeconds(params.count, params.review, finished);
  const stages = buildStages(params.review);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    // Для сборки с другой вкладки или после закрытия страницы счёт идёт от запуска на сервере.
    const offset = serverRunning && latest ? latest.ageSeconds : 0;
    const started = Date.now();
    const tick = () => setElapsed(offset + Math.floor((Date.now() - started) / 1000));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(id);
      setElapsed(0);
    };
  }, [active, serverRunning, latest]);
  // Пока сборка идёт без этой вкладки, подтягиваем состояние с сервера: когда запись станет «готово», уроки появятся в списке.
  useEffect(() => {
    if (!serverRunning) return;
    const id = window.setInterval(() => router.refresh(), 10000);
    return () => window.clearInterval(id);
  }, [serverRunning, router]);
  const stage = currentStage(stages, estimate.seconds, elapsed);
  const overtime = elapsed > estimate.seconds * 1.3;

  const working = active || asking || saving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Собрать уроки</CardTitle>
        <CardDescription>ИИ прочитает материалы и соберёт последовательность коротких уроков с задачами и критериями. Сборка идёт на сервере: страницу можно закрыть и вернуться, уроки появятся в списке.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Шаг 1 <span className="font-normal text-muted-foreground">· необязательный</span></span>
          </div>
          {questions ? (
            <div className="space-y-4 rounded-xl bg-surface p-4">
              <p className="text-sm font-medium">Вопросы перед сборкой</p>
              {questions.map((q, i) => (
                <div key={i} className="space-y-1.5">
                  <Label htmlFor={`q-${i}`} className="leading-snug">{q.question}</Label>
                  <p className="type-caption text-muted-foreground">{q.why}</p>
                  <Textarea id={`q-${i}`} rows={2} value={answers[i] ?? ""} onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))} className="min-h-14" />
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={saveAnswers} disabled={saving || answers.every((a) => !a.trim())}>{saving ? "Сохраняю…" : "Сохранить ответы"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setQuestions(null)}>Пропустить</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={ask} disabled={working || disabled} className="w-full">
              {asking ? "Читаю материалы…" : notesSaved ? "Задать вопросы ещё раз" : "Ответить на 3–5 вопросов ИИ"}
            </Button>
          )}
          <p className="type-caption text-muted-foreground">ИИ спросит о целях, аудитории и типичных ошибках. Ответы станут материалом курса и войдут в уроки.</p>
        </div>

        <div className="space-y-3 border-t pt-5">
          <span className="text-sm font-medium">Шаг 2 <span className="font-normal text-muted-foreground">· сборка</span></span>
          <div className="space-y-2">
            <Label htmlFor="count">Сколько уроков</Label>
            <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="field-select">
              {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label className="tile py-3">
            <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-medium">Проверить уроки <span className="font-normal text-muted-foreground">· дольше примерно на треть</span></span>
              <span className="mt-0.5 block type-caption text-muted-foreground">Второй проход: ИИ сверит уроки с материалами и результатами курса и поправит их до того, как вы их увидите. Снимите галочку, чтобы получить черновик быстрее и проверить его позже кнопкой «Проверить уроки».</span>
            </span>
          </label>
          <Button onClick={generate} disabled={working || disabled} className="w-full">{active ? <><ProgressAsterisk thinking size={16} />{params.review ? "Собираю и проверяю…" : "Собираю…"}</> : "Собрать уроки"}</Button>
          {!active ? (
            <p className="type-caption text-muted-foreground">
              {plural(count, "урок", "урока", "уроков")} {review ? "с проверкой" : "без проверки"}: {formatEstimate(estimate.seconds)}{estimate.fromHistory ? ", по прошлым сборкам этого курса" : ""}.
            </p>
          ) : (
            <div className="space-y-2 rounded-xl bg-surface p-3 text-sm">
              <ol aria-live="polite" className="space-y-1">
                {stages.map((st, i) => (
                  <li key={st.label} className={i === stage ? "font-medium" : i < stage ? "text-muted-foreground" : "text-muted-foreground"}>
                    <span aria-hidden className="mr-2">{i < stage ? "✓" : i === stage ? "→" : "·"}</span>
                    {st.label}
                  </li>
                ))}
              </ol>
              <p className="type-caption text-muted-foreground">
                Прошло {clock(elapsed)}, обычно {formatEstimate(estimate.seconds)}. {overtime ? "Идёт дольше обычного, подождите ещё немного. " : ""}Страницу можно закрыть: сборка продолжится, уроки появятся в списке.
              </p>
            </div>
          )}
          {disabled ? <p className="type-caption text-muted-foreground">Сначала загрузите материалы.</p> : null}
        </div>
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
        {!active && !msg && latest && latestStatus === "stale" ? <Notice kind="error">Прошлая сборка не дошла до конца: сервер её оборвал. Уроки не добавлены. Запустите сборку ещё раз, лучше с меньшим числом уроков.</Notice> : null}
        {!active && !msg && latest && latest.output.status === "failed" ? <Notice kind="error">{latest.output.error}</Notice> : null}
        {!active && !msg && latest && latest.output.status === "done" ? (
          <p className="type-caption text-muted-foreground">Последняя сборка: {plural(latest.output.added, "урок", "урока", "уроков")} за {formatEstimate(latest.output.seconds).replace("около ", "")}.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
