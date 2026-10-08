"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Feedback, LessonContent } from "@/lib/lessons/types";
import { APPEAL_RETRY_HINT, RETRY_HINT, TOO_SHORT, lessonCopy } from "@/lib/lessons/copy";
import type { Tone } from "@/lib/prompts/tone";
import { plural } from "@/lib/utils/format";

type Step = "intro" | "task" | "feedback";

/** Текст сервера показываем только для 4xx (лимит дня, отказ модели): он написан для студента. При 5xx сервер отдаёт сырое сообщение исключения, там может быть английский или текст базы. */
class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

interface ShownError {
  message: string;
  /** Повтор имеет смысл: сбой сервера или сети. После 4xx (лимит дня, нет доступа) повтор не поможет. */
  retryable: boolean;
}

function shownError(e: unknown, fallback: string): ShownError {
  if (e instanceof ApiError) return e.status >= 500 ? { message: fallback, retryable: true } : { message: e.message, retryable: false };
  if (e instanceof TypeError) return { message: "Нет связи с сервером.", retryable: true };
  return { message: fallback, retryable: true };
}

/** Материал длиннее этого сворачивается на телефоне. Порог высокий: материал это предмет задачи, и скрытая трудность не должна уходить под обрезку. */
const SAMPLE_COLLAPSE_CHARS = 800;

/** Свой ответ в разборе открыт целиком, пока он короче этого. */
const ANSWER_COLLAPSE_CHARS = 600;

interface Props {
  lesson: { id: string; position: number; content: LessonContent };
  previous: { answer: string; feedback: Feedback } | null;
  nextHref: string;
  nextLabel: string;
  tone: Tone;
}

export function LessonPlayer({ lesson, previous, nextHref, nextLabel, tone }: Props) {
  const router = useRouter();
  const c = lesson.content;
  const t = lessonCopy(tone);
  const sample = c.sample?.trim() ?? "";
  const sampleIsLong = sample.length > SAMPLE_COLLAPSE_CHARS;
  const [step, setStep] = useState<Step>(previous ? "feedback" : "intro");
  const [answer, setAnswer] = useState(previous?.answer ?? "");
  const [feedback, setFeedback] = useState<Feedback | null>(previous?.feedback ?? null);
  const [progress, setProgress] = useState<{ streak: number; xp: number; gained: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ShownError | null>(null);
  const [appealError, setAppealError] = useState<ShownError | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [objection, setObjection] = useState("");
  const [scoreNote, setScoreNote] = useState<string | null>(null);

  async function appeal() {
    if (objection.trim().length < 10) return;
    setBusy(true);
    setAppealError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, answer, objection }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; feedback?: Feedback };
      if (!res.ok || !data.ok || !data.feedback) throw new ApiError(data.error ?? "Не удалось пересмотреть разбор.", res.status);
      const before = feedback?.score;
      setFeedback(data.feedback);
      setAppealOpen(false);
      setObjection("");
      setScoreNote(before === data.feedback.score ? `Наставник оставил балл: ${before}.` : `Наставник изменил балл: ${before} → ${data.feedback.score}.`);
      router.refresh();
    } catch (e) {
      setAppealError(shownError(e, "Не удалось пересмотреть разбор."));
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
      if (!res.ok || !data.ok || !data.feedback) throw new ApiError(data.error ?? "Не удалось получить разбор.", res.status);
      setAppealOpen(false);
      setObjection("");
      setAppealError(null);
      setProgress(null);
      setScoreNote(feedback ? `Было ${feedback.score}/5, стало ${data.feedback.score}/5.` : null);
      setFeedback(data.feedback);
      if (data.firstTime && data.progress) setProgress(data.progress);
      setStep("feedback");
      router.refresh();
    } catch (e) {
      setError(shownError(e, "Не удалось получить разбор."));
    } finally {
      setBusy(false);
    }
  }

  const answerIsLong = answer.length > ANSWER_COLLAPSE_CHARS;
  // Разборы до 8 октября 2026 сохранены без worked и nextStep: поля могут отсутствовать, а не только быть null.
  const worked = feedback?.worked?.trim() || null;
  const prevNextStep = feedback?.nextStep?.trim() || null;
  const topRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    // Шаг сменился: на телефоне экран остаётся прокрученным вниз, возвращаем к началу шага.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ block: "start" });
    // Скролл не переносит фокус: без этого кнопка шага исчезает, и фокус уходит на body.
    topRef.current?.querySelector<HTMLElement>("section [data-step-heading]")?.focus({ preventScroll: true });
    setError(null);
  }, [step]);
  const stepAnnouncement = step === "feedback" ? "Разбор готов." : "";

  const stepIndex = step === "intro" ? 1 : step === "task" ? 2 : 3;

  return (
    <>
    <p aria-live="polite" className="sr-only">{busy ? (step === "task" ? t.busy : t.appealBusy) : stepAnnouncement}</p>
    <article ref={topRef} className="mt-4 scroll-mt-4">
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
            <div className="text-xs font-medium uppercase text-primary">Идея урока</div>
            <p className="mt-1 leading-relaxed">{c.keyIdea}</p>
          </div>
          <div>
            <div className="text-sm font-medium">На что смотреть</div>
            <ul className="mt-2 space-y-2">{c.signals.map((s, i) => <li key={i} className="flex gap-3"><span className="text-primary">→</span><span>{s}</span></li>)}</ul>
          </div>
          <Button size="lg" className="h-11 px-4 md:h-9" onClick={() => setStep("task")}>К задаче</Button>
        </section>
      ) : null}

      {step === "task" ? (
        <section className="mt-8 space-y-6">
          <div>
            <h2 data-step-heading tabIndex={-1} className="text-sm font-medium text-muted-foreground outline-none">Задача</h2>
            <p className="mt-1 text-lg leading-relaxed">{c.task}</p>
          </div>
          {sample ? (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Данные к задаче</div>
              <blockquote id="lesson-sample" className={`mt-1 whitespace-pre-wrap rounded-md bg-muted p-4 text-[15px] leading-relaxed ${sampleIsLong && !sampleOpen ? "line-clamp-12 md:line-clamp-none" : ""}`}>{sample}</blockquote>
              {sampleIsLong ? (
                <button type="button" onClick={() => setSampleOpen((v) => !v)} aria-expanded={sampleOpen} aria-controls="lesson-sample" className="mt-1 inline-flex min-h-11 items-center rounded-sm text-sm text-foreground underline decoration-primary decoration-2 underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden">
                  {sampleOpen ? "Свернуть" : "Показать полностью"}
                </button>
              ) : null}
            </div>
          ) : null}
          {c.signals.length > 0 ? (
            <details className="group border-y">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <span>На что смотреть <span className="font-normal text-muted-foreground">· {plural(c.signals.length, "признак", "признака", "признаков")}</span></span>
                <span aria-hidden className="text-muted-foreground group-open:hidden">Показать</span>
                <span aria-hidden className="hidden text-muted-foreground group-open:inline">Скрыть</span>
              </summary>
              <ul className="space-y-2 pb-3 pt-1 text-[15px]">{c.signals.map((s, i) => <li key={i} className="flex gap-3"><span className="text-primary">→</span><span>{s}</span></li>)}</ul>
            </details>
          ) : null}
          {feedback && (prevNextStep || feedback.improvements.length > 0) ? (
            <div className="rounded-md border p-4">
              <div className="text-sm font-medium">В прошлый раз: что улучшить · {feedback.score}/5</div>
              {prevNextStep ? <p className="mt-2 text-[15px]"><span className="font-medium">Следующий шаг.</span> {prevNextStep}</p> : null}
              {feedback.improvements.length > 0 ? <ul className="mt-2 space-y-2 text-[15px]">{feedback.improvements.map((s, i) => <li key={i} className="flex gap-3"><span aria-hidden className="text-primary">→</span><span>{s}</span></li>)}</ul> : null}
            </div>
          ) : null}
          <div>
            <label htmlFor="answer" className="text-sm font-medium">{t.answerLabel}</label>
            <Textarea id="answer" className="mt-2 min-h-36 md:min-h-40" rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={busy} placeholder={t.answerPlaceholder} aria-describedby={!error && answer.trim().length > 0 && answer.trim().length < 10 ? "answer-hint" : undefined} />
          </div>
          {error ? (
            <div role="alert" className="border-l-2 border-destructive pl-4 text-sm">
              <p className="font-medium text-foreground">{error.message}</p>
              {error.retryable ? <p className="mt-1 text-muted-foreground">{RETRY_HINT}</p> : null}
            </div>
          ) : null}
          {!error && answer.trim().length > 0 && answer.trim().length < 10 ? <p id="answer-hint" className="text-sm text-muted-foreground">{TOO_SHORT}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="h-11 px-4 md:h-9" onClick={submit} disabled={busy || answer.trim().length < 10}>{busy ? t.busy : error?.retryable ? t.submitRetry : t.submit}</Button>
            <Button size="lg" className="h-11 px-4 md:h-9" variant="ghost" onClick={() => setStep("intro")} disabled={busy}>{t.back}</Button>
          </div>
        </section>
      ) : null}

      {step === "feedback" && feedback ? (
        <section className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 data-step-heading tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">Разбор</h2>
            <Badge className="text-base"><span className="sr-only">Оценка: {feedback.score} из 5</span><span aria-hidden>{feedback.score}/5</span></Badge>
            {progress ? <span className="text-sm text-muted-foreground">+{plural(progress.gained, "балл", "балла", "баллов")} · серия: {plural(progress.streak, "день", "дня", "дней")}</span> : null}
          </div>
          {scoreNote ? <p className="text-sm text-muted-foreground">{scoreNote}</p> : null}
          {worked || prevNextStep ? (
            <div className={`grid gap-3 ${worked && prevNextStep ? "md:grid-cols-2" : ""}`}>
              {worked ? (
                <section aria-label="Что получилось" className="rounded-md border p-4">
                  <h3 className="text-xs font-medium uppercase text-muted-foreground">Что получилось</h3>
                  <p className="mt-1 text-[15px] leading-relaxed">{worked}</p>
                </section>
              ) : null}
              {prevNextStep ? (
                <section aria-label="Один следующий шаг" className="rounded-md border-l-4 border-primary bg-muted/50 p-4">
                  <h3 className="text-xs font-medium uppercase text-primary">Один следующий шаг</h3>
                  <p className="mt-1 text-[15px] leading-relaxed">{prevNextStep}</p>
                </section>
              ) : null}
            </div>
          ) : null}
          <p className={worked || prevNextStep ? "leading-relaxed" : "text-lg leading-relaxed"}>{feedback.summary}</p>
          <div>
            <div className="text-sm font-medium">{t.yourAnswer}</div>
            <blockquote className={`mt-1 whitespace-pre-wrap border-l-2 pl-3 text-[15px] leading-relaxed ${answerIsLong && !answerOpen && !appealOpen ? "line-clamp-6" : ""}`}>{answer}</blockquote>
            {answerIsLong && !appealOpen ? (
              <button type="button" onClick={() => setAnswerOpen((v) => !v)} aria-expanded={answerOpen} className="mt-1 inline-flex min-h-11 items-center text-sm text-primary underline-offset-4 hover:underline">
                {answerOpen ? "Свернуть ответ" : "Показать ответ полностью"}
              </button>
            ) : null}
          </div>
          {feedback.criteria.length > 0 ? (
            <div>
              <div className="text-sm font-medium">По критериям · {feedback.criteria.filter((x) => x.met).length} из {feedback.criteria.length}</div>
              <ul className="mt-2 space-y-3">
                {feedback.criteria.map((cr, i) => {
                  const comment = cr.comment?.trim();
                  return (
                    <li key={i} className="flex gap-3 text-[15px]">
                      <span aria-hidden className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${cr.met ? "bg-primary text-primary-foreground" : "border-2 border-foreground font-bold text-foreground"}`}>{cr.met ? "✓" : "✗"}</span>
                      <span>
                        <span className="sr-only">{cr.met ? "Выполнено: " : "Не выполнено: "}</span>
                        <span className={cr.met ? "text-muted-foreground" : "font-medium"}>{cr.criterion}</span>
                        {comment ? <span className="mt-0.5 block text-muted-foreground">{comment}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {!worked && feedback.strengths.length > 0 ? <div><div className="text-sm font-medium">Что получилось</div><ul className="mt-1 list-disc pl-5 text-[15px]">{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div> : null}
          {feedback.improvements.length > 0 ? (
            <div className="rounded-md border p-4">
              <div className="text-sm font-medium">Что улучшить</div>
              <ul className="mt-2 space-y-2 text-[15px]">{feedback.improvements.map((s, i) => <li key={i} className="flex gap-3"><span aria-hidden className="text-primary">→</span><span>{s}</span></li>)}</ul>
            </div>
          ) : null}
          {appealOpen ? (
            <div className="space-y-2 rounded-md border p-4">
              <label htmlFor="objection" className="text-sm font-medium">{t.appealTitle}</label>
              <Textarea id="objection" autoFocus rows={3} value={objection} onChange={(e) => setObjection(e.target.value)} placeholder={t.appealPlaceholder} />
              {!appealError && objection.trim().length > 0 && objection.trim().length < 10 ? <p className="text-sm text-muted-foreground">Нужно хотя бы несколько слов: возражение короче 10 знаков наставник не разберёт.</p> : null}
              {appealError ? (
                <div role="alert" className="border-l-2 border-destructive pl-4 text-sm">
                  <p className="font-medium text-foreground">{appealError.message}</p>
                  {appealError.retryable ? <p className="mt-1 text-muted-foreground">{APPEAL_RETRY_HINT}</p> : null}
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button size="lg" className="h-11 px-4 md:h-9" onClick={appeal} disabled={busy || objection.trim().length < 10}>{busy ? t.appealBusy : t.appealSubmit}</Button>
                <Button size="lg" className="h-11 px-4 md:h-9" variant="ghost" onClick={() => { setAppealOpen(false); setAppealError(null); }} disabled={busy}>Отменить</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAppealOpen(true)} className="inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">Оспорить разбор</button>
          )}
          <div className="rounded-md border-l-4 border-primary bg-muted/50 p-4">
            <div className="text-xs font-medium uppercase text-primary">Запомнить</div>
            <p className="mt-1">{c.keyTakeaway}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href={nextHref} />} size="lg" className="h-auto min-h-11 max-w-full shrink whitespace-normal px-4 py-2 text-left md:min-h-9">{nextLabel}</Button>
            <Button size="lg" className="h-11 px-4 md:h-9" variant="outline" onClick={() => setStep("task")}>{t.retry}</Button>
          </div>
        </section>
      ) : null}
    </article>
    </>
  );
}
