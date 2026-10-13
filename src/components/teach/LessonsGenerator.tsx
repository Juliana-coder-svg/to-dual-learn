"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/shared/Notice";

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
      if (!res.ok || !data.ok || !data.questions) throw new Error(data.error ?? "Не удалось получить вопросы");
      setQuestions(data.questions);
      setAnswers(data.questions.map(() => ""));
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Ошибка", kind: "error" });
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
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось сохранить ответы");
      setNotesSaved(true);
      setQuestions(null);
      setMsg({ text: `Ответы сохранены как материал курса (${data.saved}). Теперь можно собирать уроки.`, kind: "success" });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Ошибка", kind: "error" });
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
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось собрать уроки");
      setMsg({ text: `Добавлено уроков: ${data.added}. ${data.reviewSummary ?? "Проверьте и опубликуйте."}`, kind: "success" });
      router.refresh();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Ошибка", kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  const working = busy || asking || saving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Собрать уроки</CardTitle>
        <CardDescription>ИИ прочитает материалы и соберёт последовательность коротких уроков с задачами и критериями. Это 1–3 минуты.</CardDescription>
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
              <span className="font-medium">Проверить методистом</span>
              <span className="mt-0.5 block type-caption text-muted-foreground">Второй проход до публикации: ИИ-методист сверяет уроки с материалами и результатами курса и правит их сразу, вы ещё не видели черновик. Удваивает время и расход.</span>
            </span>
          </label>
          <Button onClick={generate} disabled={working || disabled} className="w-full">{busy ? (review ? "Собираю и проверяю…" : "Собираю…") : "Собрать уроки"}</Button>
          {disabled ? <p className="type-caption text-muted-foreground">Сначала загрузите материалы.</p> : null}
        </div>
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      </CardContent>
    </Card>
  );
}
