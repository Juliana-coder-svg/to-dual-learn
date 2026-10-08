"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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
      setMsg(e instanceof Error ? e.message : "Ошибка");
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
      setMsg(`Ответы сохранены как материал курса (${data.saved}). Теперь можно собирать уроки.`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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
      setMsg(`Добавлено уроков: ${data.added}. ${data.reviewSummary ?? "Проверьте и опубликуйте."}`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Собрать уроки</CardTitle>
        <CardDescription>ИИ прочитает материалы и соберёт последовательность коротких уроков с задачами и критериями. Это 1–3 минуты.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="text-sm font-medium">Вопросы перед сборкой</div>
            {questions.map((q, i) => (
              <div key={i} className="space-y-1">
                <Label htmlFor={`q-${i}`} className="text-sm">{q.question}</Label>
                <p className="text-xs text-muted-foreground">{q.why}</p>
                <textarea id={`q-${i}`} rows={2} value={answers[i] ?? ""} onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))} className="w-full rounded-md border bg-background px-2 py-1 text-sm" />
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveAnswers} disabled={saving || answers.every((a) => !a.trim())}>{saving ? "Сохраняю…" : "Сохранить ответы"}</Button>
              <Button size="sm" variant="ghost" onClick={() => setQuestions(null)}>Пропустить</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={ask} disabled={asking || disabled} className="w-full">
            {asking ? "Читаю материалы…" : notesSaved ? "Задать вопросы ещё раз" : "Сначала 3–5 вопросов от ИИ"}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">ИИ прочитает материалы и спросит о целях, аудитории и типичных ошибках. Ответы станут материалом курса и войдут в уроки.</p>
        <div className="space-y-2">
          <Label htmlFor="count">Сколько уроков</Label>
          <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="mt-1" />
          <span>Проверить методистом<span className="block text-xs text-muted-foreground">Второй проход: ИИ-методист сверяет уроки с материалами и результатами курса и правит критерии. Удваивает время и расход.</span></span>
        </label>
        <Button onClick={generate} disabled={busy || disabled} className="w-full">{busy ? (review ? "Собираю и проверяю…" : "Собираю…") : "Собрать"}</Button>
        {disabled ? <p className="text-xs text-muted-foreground">Сначала загрузите материалы.</p> : null}
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
