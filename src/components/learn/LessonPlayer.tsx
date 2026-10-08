"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Feedback, LessonContent } from "@/lib/lessons/types";
import { plural } from "@/lib/utils/format";

type Step = "intro" | "task" | "feedback";

interface Props {
  lesson: { id: string; position: number; content: LessonContent };
  previous: { answer: string; feedback: Feedback } | null;
  nextHref: string;
  nextLabel: string;
}

export function LessonPlayer({ lesson, previous, nextHref, nextLabel }: Props) {
  const router = useRouter();
  const c = lesson.content;
  const [step, setStep] = useState<Step>(previous ? "feedback" : "intro");
  const [answer, setAnswer] = useState(previous?.answer ?? "");
  const [feedback, setFeedback] = useState<Feedback | null>(previous?.feedback ?? null);
  const [progress, setProgress] = useState<{ streak: number; xp: number; gained: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealOpen, setAppealOpen] = useState(false);
  const [objection, setObjection] = useState("");
  const [appealNote, setAppealNote] = useState<string | null>(null);

  async function appeal() {
    if (objection.trim().length < 10) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, answer, objection }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; feedback?: Feedback };
      if (!res.ok || !data.ok || !data.feedback) throw new Error(data.error ?? "Не удалось пересмотреть оценку");
      const before = feedback?.score;
      setFeedback(data.feedback);
      setAppealOpen(false);
      setObjection("");
      setAppealNote(before === data.feedback.score ? "Балл не изменился." : `Балл изменён: ${before} → ${data.feedback.score}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, answer }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; feedback?: Feedback; firstTime?: boolean; progress?: { streak: number; xp: number; gained: number } };
      if (!res.ok || !data.ok || !data.feedback) throw new Error(data.error ?? "Не удалось оценить ответ");
      setFeedback(data.feedback);
      if (data.firstTime && data.progress) setProgress(data.progress);
      setStep("feedback");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = step === "intro" ? 1 : step === "task" ? 2 : 3;

  return (
    <article className="mt-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">Урок {lesson.position} · шаг {stepIndex} из 3</div>
        <div className="flex gap-1">{[1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-8 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />)}</div>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{c.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{c.concept}</p>

      {step === "intro" ? (
        <section className="mt-8 space-y-6">
          <p className="text-lg leading-relaxed">{c.intro}</p>
          <div className="rounded-md border-l-4 border-primary bg-muted/50 p-4">
            <div className="text-xs font-medium uppercase text-primary">Ключевая идея</div>
            <p className="mt-1 leading-relaxed">{c.keyIdea}</p>
          </div>
          <div>
            <div className="text-sm font-medium">На что смотреть</div>
            <ul className="mt-2 space-y-2">{c.signals.map((s, i) => <li key={i} className="flex gap-3"><span className="text-primary">→</span><span>{s}</span></li>)}</ul>
          </div>
          <Button size="lg" onClick={() => setStep("task")}>К задаче</Button>
        </section>
      ) : null}

      {step === "task" ? (
        <section className="mt-8 space-y-6">
          <div>
            <div className="text-xs font-medium uppercase text-primary">Задача</div>
            <p className="mt-1 text-lg leading-relaxed">{c.task}</p>
          </div>
          {c.sample ? <blockquote className="whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-[15px] leading-relaxed">{c.sample}</blockquote> : null}
          <Textarea rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ваш ответ. Конкретика важнее объёма." />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-3">
            <Button size="lg" onClick={submit} disabled={busy || answer.trim().length < 10}>{busy ? "Наставник читает…" : "Отправить"}</Button>
            <Button size="lg" variant="ghost" onClick={() => setStep("intro")}>Назад</Button>
          </div>
        </section>
      ) : null}

      {step === "feedback" && feedback ? (
        <section className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="text-base">{feedback.score}/5</Badge>
            {progress ? <span className="text-sm text-muted-foreground">+{plural(progress.gained, "балл", "балла", "баллов")} · серия: {plural(progress.streak, "день", "дня", "дней")}</span> : null}
          </div>
          <p className="text-lg leading-relaxed">{feedback.summary}</p>
          <ul className="space-y-2">
            {feedback.criteria.map((cr, i) => (
              <li key={i} className="flex gap-3 text-[15px]">
                <span className={cr.met ? "text-primary" : "text-muted-foreground"}>{cr.met ? "✓" : "✗"}</span>
                <span><span className="font-medium">{cr.criterion}.</span> <span className="text-muted-foreground">{cr.comment}</span></span>
              </li>
            ))}
          </ul>
          {feedback.strengths.length > 0 ? <div><div className="text-sm font-medium">Хорошо</div><ul className="mt-1 list-disc pl-5 text-[15px]">{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div> : null}
          {feedback.improvements.length > 0 ? <div><div className="text-sm font-medium">Что улучшить</div><ul className="mt-1 list-disc pl-5 text-[15px]">{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></div> : null}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Мой ответ</summary>
            <blockquote className="mt-2 whitespace-pre-wrap border-l-2 pl-3">{answer}</blockquote>
          </details>
          {appealNote ? <p className="text-sm text-muted-foreground">{appealNote}</p> : null}
          {appealOpen ? (
            <div className="space-y-2 rounded-md border p-4">
              <div className="text-sm font-medium">С чем вы не согласны?</div>
              <Textarea rows={3} value={objection} onChange={(e) => setObjection(e.target.value)} placeholder="Укажите критерий и место в ответе, где он выполнен" />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex gap-2">
                <Button size="sm" onClick={appeal} disabled={busy || objection.trim().length < 10}>{busy ? "Пересматриваю…" : "Отправить возражение"}</Button>
                <Button size="sm" variant="ghost" onClick={() => setAppealOpen(false)}>Отмена</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAppealOpen(true)} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Оспорить оценку</button>
          )}
          <div className="rounded-md border-l-4 border-primary bg-muted/50 p-4">
            <div className="text-xs font-medium uppercase text-primary">Запомнить</div>
            <p className="mt-1">{c.keyTakeaway}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href={nextHref} />} size="lg">{nextLabel}</Button>
            <Button size="lg" variant="outline" onClick={() => setStep("task")}>Ответить ещё раз</Button>
          </div>
        </section>
      ) : null}
    </article>
  );
}
