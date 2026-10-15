"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/shared/Notice";
import { plural } from "@/lib/utils/format";

/** Этапы сборки и их ориентировочная длительность в секундах. Сервер отдаёт ответ одним куском и хода не сообщает,
 *  поэтому текущий этап определяется по прошедшему времени: это оценка, а не отчёт сервера. Цифры из замера 15 октября 2026:
 *  сборка пяти уроков с проверкой заняла 4,1 минуты. */
const STAGES = [
  { label: "Читаю материалы", seconds: 20 },
  { label: "Собираю уроки", seconds: 100 },
] as const;
const REVIEW_STAGE = { label: "Проверяю уроки", seconds: 100 } as const;

function clock(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function LessonsGenerator({ courseId, disabled }: { courseId: string; disabled: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(5);
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
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось сохранить ответы. Они остались в полях: нажмите «Сохранить» ещё раз.");
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
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось собрать уроки. Попробуйте ещё раз: если не выйдет, уменьшите число уроков.");
      setMsg({ text: `Собрано ${plural(data.added ?? 0, "урок", "урока", "уроков")}. ${data.reviewSummary ?? "Откройте их, поправьте и опубликуйте."}`, kind: "success" });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Не удалось выполнить действие. Попробуйте ещё раз через минуту.", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      window.clearInterval(id);
      setElapsed(0);
    };
  }, [busy]);
  const stages = review ? [...STAGES, REVIEW_STAGE] : [...STAGES];
  let spent = 0;
  const currentStage = Math.max(0, stages.findIndex((st) => (spent += st.seconds) > elapsed));

  const working = busy || asking || saving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Собрать уроки</CardTitle>
        <CardDescription>ИИ прочитает материалы и соберёт последовательность коротких уроков с задачами и критериями. {review ? "Сборка с проверкой занимает 3–5 минут." : "Сборка без проверки занимает 2–3 минуты."} Не закрывайте вкладку: результат появится в списке.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Шаг 1 <span className="font-normal text-muted-foreground">· необязательный</span></span>
          </div>
          {questions ? (
            <div className="space-y-4 rounded-lg bg-surface p-4">
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
            <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40">
              {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input px-3 py-3 text-sm has-[:checked]:border-primary">
            <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-medium">Проверить уроки <span className="font-normal text-muted-foreground">· +1–2 минуты</span></span>
              <span className="mt-0.5 block type-caption text-muted-foreground">Второй проход: ИИ сверит уроки с материалами и результатами курса и поправит их до того, как вы их увидите. Снимите галочку, чтобы получить черновик быстрее и проверить его позже кнопкой «Проверить уроки».</span>
            </span>
          </label>
          <Button onClick={generate} disabled={working || disabled} className="w-full">{busy ? "Собираю…" : "Собрать уроки"}</Button>
          {busy ? (
            <div role="status" className="space-y-2 rounded-lg bg-surface p-3 text-sm">
              <ol className="space-y-1">
                {stages.map((st, i) => (
                  <li key={st.label} className={i === currentStage ? "font-medium" : i < currentStage ? "text-muted-foreground" : "text-muted-foreground/70"}>
                    <span aria-hidden className="mr-2">{i < currentStage ? "✓" : i === currentStage ? "→" : "·"}</span>
                    {st.label} <span className="font-normal text-muted-foreground">· около {st.seconds < 60 ? `${st.seconds} с` : `${Math.round(st.seconds / 60 * 2) / 2} мин`}</span>
                  </li>
                ))}
              </ol>
              <p className="type-caption text-muted-foreground">Прошло {clock(elapsed)}. Шаги примерные: точный ход сервер не сообщает.</p>
            </div>
          ) : null}
          {disabled ? <p className="type-caption text-muted-foreground">Сначала загрузите материалы.</p> : null}
        </div>
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      </CardContent>
    </Card>
  );
}
