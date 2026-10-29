"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AiNote } from "@/components/shared/AiNote";
import { StepMarks } from "@/components/shared/StepMarks";
import { ProgressAsterisk } from "@/components/shared/ProgressAsterisk";
import type { Feedback, LessonContent } from "@/lib/lessons/types";
import { APPEAL_RETRY_HINT, RETRY_HINT, TOO_SHORT, lessonCopy, scoreMeaning, splitReservation } from "@/lib/lessons/copy";
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
  /** Сохранял ли преподаватель урок в редакторе после сборки моделью. */
  reviewed: boolean;
  previous: { answer: string; feedback: Feedback } | null;
  nextHref: string;
  nextLabel: string;
  tone: Tone;
  /** Пройдено опубликованных уроков курса до этого ответа и всего уроков: для звёздочки на экране завершения.
   *  `counted`: этот урок опубликован и входит в счёт (черновик владельца не входит). У гостя курса нет. */
  course?: { done: number; total: number; counted: boolean };
  /** Пробный урок без входа: разбор идёт через /api/try/evaluate, в базу ничего не пишется, вместо следующего урока предложение войти. */
  guest?: { slug: string; lessonIndex: number; /** Уже вошёл (пробный урок с пустого /learn): сохранить разбор можно без нового входа. */ signedIn?: boolean };
}

/** Где гость хранит ответ и разбор до входа. После входа /try/claim переносит их в профиль. */
export const TRY_STORAGE_KEY = "tdd_try_attempt";
export const TRY_LOGIN_HREF = "/login?role=student&next=%2Ftry%2Fclaim";

export function LessonPlayer({ lesson, reviewed, previous, nextHref, nextLabel, tone, guest, course }: Props) {
  const router = useRouter();
  const c = lesson.content;
  const t = lessonCopy(tone);
  const sample = c.sample?.trim() ?? "";
  const sampleIsLong = sample.length > SAMPLE_COLLAPSE_CHARS;
  const [step, setStep] = useState<Step>(previous ? "feedback" : "intro");
  const [answer, setAnswer] = useState(previous?.answer ?? "");
  const [feedback, setFeedback] = useState<Feedback | null>(previous?.feedback ?? null);
  const [progress, setProgress] = useState<{ streak: number; xp: number; gained: number } | null>(null);
  // Урок засчитан только что: до router.refresh() сервер ещё не знает о нём, прибавляем сами.
  const [firstTime, setFirstTime] = useState(false);
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
      // text-lint-ignore: следующий шаг показывает RETRY_HINT рядом с ошибкой
      if (!res.ok || !data.ok || !data.feedback) throw new ApiError(data.error ?? "Не удалось пересмотреть разбор.", res.status);
      const before = feedback?.score;
      setFeedback(data.feedback);
      setAppealOpen(false);
      setObjection("");
      setScoreNote(before === data.feedback.score ? `Наставник оставил балл: ${before}.` : `Наставник изменил балл: ${before} → ${data.feedback.score}.`);
      router.refresh();
    } catch (e) {
      // text-lint-ignore: следующий шаг показывает RETRY_HINT рядом с ошибкой
      setAppealError(shownError(e, "Не удалось пересмотреть разбор."));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(guest ? "/api/try/evaluate" : "/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guest ? { slug: guest.slug, lessonIndex: guest.lessonIndex, answer } : { lessonId: lesson.id, answer }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; feedback?: Feedback; claimToken?: string; firstTime?: boolean; progress?: { streak: number; xp: number; gained: number } };
      // text-lint-ignore: следующий шаг показывает RETRY_HINT рядом с ошибкой
      if (!res.ok || !data.ok || !data.feedback) throw new ApiError(data.error ?? "Не удалось получить разбор.", res.status);
      setAppealOpen(false);
      setObjection("");
      setAppealError(null);
      setProgress(null);
      setScoreNote(feedback ? `Было ${feedback.score}/5, стало ${data.feedback.score}/5.` : null);
      setFeedback(data.feedback);
      if (data.firstTime && data.progress) setProgress(data.progress);
      if (data.firstTime) setFirstTime(true);
      if (guest && data.claimToken) {
        try {
          localStorage.setItem(TRY_STORAGE_KEY, JSON.stringify({ slug: guest.slug, lessonIndex: guest.lessonIndex, answer, feedback: data.feedback, claimToken: data.claimToken }));
        } catch {
          // Хранилище закрыто (приватный режим): разбор виден на экране, но после входа не перенесётся.
        }
      }
      setStep("feedback");
      if (!guest) router.refresh();
    } catch (e) {
      // text-lint-ignore: следующий шаг показывает RETRY_HINT рядом с ошибкой
      setError(shownError(e, "Не удалось получить разбор."));
    } finally {
      setBusy(false);
    }
  }

  // Гость обновил страницу после разбора: поднимаем ответ и разбор из localStorage. Асинхронно, чтобы не расходиться с серверной разметкой.
  useEffect(() => {
    if (!guest) return;
    void Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(TRY_STORAGE_KEY) ?? "null") as { slug?: string; lessonIndex?: number; answer?: string; feedback?: Feedback } | null;
        if (saved && saved.slug === guest.slug && saved.lessonIndex === guest.lessonIndex && typeof saved.answer === "string" && saved.feedback && Array.isArray(saved.feedback.criteria) && Array.isArray(saved.feedback.improvements)) {
          setAnswer(saved.answer);
          setFeedback(saved.feedback);
          setStep("feedback");
        }
      } catch {
        // Хранилища нет или запись повреждена: урок начинается заново.
      }
    });
  }, [guest]);

  const answerIsLong = answer.length > ANSWER_COLLAPSE_CHARS;
  const metCount = feedback?.criteria.filter((x) => x.met).length ?? 0;
  const reservations = feedback?.criteria.filter((x) => splitReservation(x.met, x.comment).reservation).length ?? 0;
  // Разборы до 8 октября 2026 сохранены без worked и nextStep: поля могут отсутствовать, а не только быть null.
  const worked = feedback?.worked?.trim() || null;
  const prevNextStep = feedback?.nextStep?.trim() || null;
  // nextStep совпадает с первым пунктом improvements (см. ядро разбора): под шагом показываем только остальные.
  const moreImprovements = feedback ? (prevNextStep ? feedback.improvements.slice(1) : feedback.improvements) : [];
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
  // После refresh `previous` появляется и сервер уже считает урок пройденным: прибавка нужна только до этого.
  const courseDone = course ? Math.min(course.total, course.done + (firstTime && !previous && course.counted ? 1 : 0)) : 0;
  const thinking = <ProgressAsterisk thinking size={16} />;
  const arrow = <span aria-hidden className="shrink-0 text-primary-strong">→</span>;

  return (
    <>
    <p aria-live="polite" className="sr-only">{busy ? (step === "task" ? t.busy : t.appealBusy) : stepAnnouncement}</p>
    <article ref={topRef} className="scroll-mt-4">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <p className="eyebrow">Урок {lesson.position} · шаг {stepIndex} из 3</p>
          <StepMarks total={3} filled={stepIndex} size="md" labels={["Идея", "Задача", "Разбор"]} />
        </div>
        <div className="mt-6 flex items-start gap-5">
          <span aria-hidden className="type-counter shrink-0">{String(lesson.position).padStart(2, "0")}</span>
          <div className="min-w-0 pt-1">
            <h1 className="text-balance type-title">{c.title}</h1>
            <p className="mt-2 type-body text-muted-foreground">{c.concept}</p>
          </div>
        </div>
        <AiNote kind={guest ? "lessonGuest" : reviewed ? "lessonReviewed" : "lessonUnreviewed"} className="mt-4" />
      </header>

      {step === "intro" ? (
        <section key="intro" className="step-enter mt-10 space-y-8">
          <p className="text-lg leading-relaxed">{c.intro}</p>
          <div className="callout">
            <div className="callout-label">Идея урока</div>
            <p className="mt-2 type-body">{c.keyIdea}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">На что смотреть</h2>
            <ul className="mt-3 space-y-2 type-body">{c.signals.map((s, i) => <li key={i} className="flex gap-3">{arrow}<span>{s}</span></li>)}</ul>
          </div>
          <Button size="lg" onClick={() => setStep("task")}>К задаче</Button>
        </section>
      ) : null}

      {step === "task" ? (
        <section key="task" className="step-enter mt-10 space-y-6 md:space-y-8">
          <div>
            <h2 data-step-heading tabIndex={-1} className="eyebrow outline-none">Задача</h2>
            <p className="mt-2 text-lg leading-relaxed">{c.task}</p>
            {sample ? <a href="#answer" className="mt-1 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 md:hidden">К полю ответа</a> : null}
          </div>
          {sample ? (
            <div>
              <div className="eyebrow">Данные к задаче</div>
              <blockquote id="lesson-sample" className={`mt-2 whitespace-pre-wrap rounded-xl bg-muted p-4 type-body ${sampleIsLong && !sampleOpen ? "line-clamp-8 md:line-clamp-none" : ""}`}>{sample}</blockquote>
              {sampleIsLong ? (
                <button type="button" onClick={() => setSampleOpen((v) => !v)} aria-expanded={sampleOpen} aria-controls="lesson-sample" className="mt-1 inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-foreground underline decoration-primary decoration-2 underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring md:hidden">
                  {sampleOpen ? "Свернуть" : "Показать полностью"}
                </button>
              ) : null}
            </div>
          ) : null}
          {feedback && (prevNextStep || feedback.improvements.length > 0) ? (
            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">В прошлый раз: что улучшить</h3>
                <Badge variant="secondary">{feedback.score}/5</Badge>
              </div>
              {prevNextStep ? <p className="mt-2 type-body"><span className="font-medium">Следующий шаг.</span> {prevNextStep}</p> : null}
              {feedback.improvements.length > 0 ? <ul className="mt-2 space-y-2 type-body">{feedback.improvements.map((s, i) => <li key={i} className="flex gap-3">{arrow}<span>{s}</span></li>)}</ul> : null}
            </div>
          ) : null}
          <div>
            <label htmlFor="answer" className="text-sm font-semibold">{t.answerLabel}</label>
            <Textarea id="answer" className="mt-2 min-h-32 max-h-[45vh] overflow-y-auto md:min-h-44 md:max-h-96" rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)} disabled={busy} placeholder={t.answerPlaceholder} aria-describedby={!error && answer.trim().length > 0 && answer.trim().length < 10 ? "answer-hint" : undefined} />
            {guest ? (
              <p className="mt-2 type-caption text-muted-foreground">Ответ прочитает и разберёт модель, поэтому не пишите имён, почты и телефонов. До входа ответ хранится только в этом браузере. После входа он попадёт в профиль, и его увидит команда курса.</p>
            ) : (
              <p className="mt-2 type-caption text-muted-foreground">Разбор и балл подготовит модель. Ответ увидит преподаватель курса, итоговое решение за ним.</p>
            )}
          </div>
          {error ? (
            <div role="alert" className="border-l-2 border-destructive pl-4 text-sm">
              <p className="font-medium text-foreground">{error.message}</p>
              {error.retryable ? <p className="mt-1 text-muted-foreground">{RETRY_HINT}</p> : null}
            </div>
          ) : null}
          {!error && answer.trim().length > 0 && answer.trim().length < 10 ? <p id="answer-hint" className="text-sm text-muted-foreground">{TOO_SHORT}</p> : null}
          {/* На телефоне ряд кнопок липнет к низу экрана: поле растёт, а кнопка остаётся под пальцем. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-3 border-t bg-background px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <Button size="lg" onClick={submit} disabled={busy || answer.trim().length < 10}>{busy ? <>{thinking}{t.busy}</> : error?.retryable ? t.submitRetry : t.submit}</Button>
            <Button size="lg" variant="ghost" onClick={() => setStep("intro")} disabled={busy}>{t.back}</Button>
          </div>
          {c.signals.length > 0 ? (
            <details className="group rounded-xl border px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span>На что смотреть <span className="font-normal text-muted-foreground">· {plural(c.signals.length, "признак", "признака", "признаков")}</span></span>
                <span aria-hidden className="text-muted-foreground group-open:hidden">Показать</span>
                <span aria-hidden className="hidden text-muted-foreground group-open:inline">Скрыть</span>
              </summary>
              <ul className="space-y-2 pb-4 type-body">{c.signals.map((s, i) => <li key={i} className="flex gap-3">{arrow}<span>{s}</span></li>)}</ul>
            </details>
          ) : null}
        </section>
      ) : null}

      {step === "feedback" && feedback ? (
        <section key="feedback" className="step-enter mt-10 space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4 border-t-2 border-foreground pt-5">
            <div className="min-w-0">
              <h2 data-step-heading tabIndex={-1} className="type-heading outline-none">Разбор</h2>
              {scoreNote ? <p className="mt-2 text-sm text-muted-foreground">{scoreNote}</p> : null}
              <AiNote kind={guest ? "feedbackGuest" : "feedback"} className="mt-2" />
              {guest ? null : <p className="mt-1 type-caption text-muted-foreground">Ваши ответы видите вы и преподаватель курса. Другие студенты их не видят.</p>}
            </div>
            <dl className="flex shrink-0 gap-8">
              <div>
                <dt className="eyebrow">Балл</dt>
                <dd className="mt-1 type-counter"><span className="sr-only">{feedback.score} из 5</span><span aria-hidden>{feedback.score}<span className="text-muted-foreground">/5</span></span></dd>
              </div>
              {progress ? (
                <>
                  <div>
                    <dt className="eyebrow">Баллы</dt>
                    <dd className="mt-1 type-counter">+{progress.gained}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow">Серия</dt>
                    <dd className="mt-1 type-counter">{progress.streak}{" "}<span className="text-base font-normal text-muted-foreground">{plural(progress.streak, "день", "дня", "дней").replace(/^\d+\s/, "")}</span></dd>
                  </div>
                </>
              ) : null}
            </dl>
          </div>
          <p className="-mt-4 type-caption text-muted-foreground">{scoreMeaning(feedback.score, metCount, feedback.criteria.length, reservations)}</p>
          {worked || prevNextStep ? (
            <div className={`grid gap-3 ${worked && prevNextStep ? "md:grid-cols-2" : ""}`}>
              {worked ? (
                <section aria-label="Что получилось" className="rounded-xl border p-4">
                  <h3 className="eyebrow">Что получилось</h3>
                  <p className="mt-2 type-body">{worked}</p>
                </section>
              ) : null}
              {prevNextStep ? (
                <section aria-label="Один следующий шаг" className="callout">
                  <h3 className="callout-label">Один следующий шаг</h3>
                  <p className="mt-2 type-body">{prevNextStep}</p>
                </section>
              ) : null}
            </div>
          ) : null}
          <p className={worked || prevNextStep ? "type-body" : "text-lg leading-relaxed"}>{feedback.summary}</p>
          <div>
            <h3 className="text-sm font-semibold">{t.yourAnswer}</h3>
            <blockquote className={`mt-2 whitespace-pre-wrap border-l-2 pl-4 type-body text-muted-foreground ${answerIsLong && !answerOpen && !appealOpen ? "line-clamp-6" : ""}`}>{answer}</blockquote>
            {answerIsLong && !appealOpen ? (
              <button type="button" onClick={() => setAnswerOpen((v) => !v)} aria-expanded={answerOpen} className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary-strong underline-offset-4 hover:underline">
                {answerOpen ? "Свернуть ответ" : "Показать ответ полностью"}
              </button>
            ) : null}
          </div>
          {feedback.criteria.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold">По критериям <span className="font-normal text-muted-foreground">· {feedback.criteria.filter((x) => x.met).length} из {feedback.criteria.length}</span></h3>
              <ul className="mt-3 divide-y rounded-xl border">
                {feedback.criteria.map((cr, i) => {
                  const { reservation, comment } = splitReservation(cr.met, cr.comment);
                  return (
                    <li key={i} className="flex gap-3 p-4 type-body">
                      <span aria-hidden className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs ${cr.met ? "bg-primary text-primary-foreground" : "border-2 border-foreground font-bold text-foreground"}`}>{cr.met ? "✓" : "✗"}</span>
                      <span>
                        <span className="sr-only">{cr.met ? (reservation ? "Выполнено, но с оговоркой: " : "Выполнено: ") : "Не выполнено: "}</span>
                        <span className={cr.met ? "text-muted-foreground" : "font-medium"}>{cr.criterion}</span>
                        {reservation ? <Badge variant="soft" className="ml-2 align-middle">С оговоркой</Badge> : null}
                        {reservation ? (
                          <span className="mt-1 block text-sm text-muted-foreground"><span className="font-medium text-foreground">Оговорка: </span>{comment || "критерий выполнен не до конца."}</span>
                        ) : comment ? <span className="mt-1 block text-sm text-muted-foreground">{comment}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {!worked && feedback.strengths.length > 0 ? <div><h3 className="text-sm font-semibold">Что получилось</h3><ul className="mt-2 list-disc pl-5 type-body">{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div> : null}
          {moreImprovements.length > 0 ? (
            <details className="group rounded-xl border px-4">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                <span>{prevNextStep ? "Что ещё улучшить" : "Что улучшить"} <span className="font-normal text-muted-foreground">· {moreImprovements.length}</span></span>
                <span aria-hidden className="text-muted-foreground group-open:hidden">Показать</span>
                <span aria-hidden className="hidden text-muted-foreground group-open:inline">Скрыть</span>
              </summary>
              <ul className="space-y-2 pb-4 type-body">{moreImprovements.map((s, i) => <li key={i} className="flex gap-3">{arrow}<span>{s}</span></li>)}</ul>
            </details>
          ) : null}
          {guest ? null : appealOpen ? (
            <div className="space-y-3 rounded-xl border p-4">
              <label htmlFor="objection" className="text-sm font-semibold">{t.appealTitle}</label>
              <Textarea id="objection" autoFocus rows={3} value={objection} onChange={(e) => setObjection(e.target.value)} placeholder={t.appealPlaceholder} />
              {!appealError && objection.trim().length > 0 && objection.trim().length < 10 ? <p className="text-sm text-muted-foreground">Нужно хотя бы несколько слов: возражение короче 10 знаков наставник не разберёт.</p> : null}
              {appealError ? (
                <div role="alert" className="border-l-2 border-destructive pl-4 text-sm">
                  <p className="font-medium text-foreground">{appealError.message}</p>
                  {appealError.retryable ? <p className="mt-1 text-muted-foreground">{APPEAL_RETRY_HINT}</p> : null}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="lg" onClick={appeal} disabled={busy || objection.trim().length < 10}>{busy ? <>{thinking}{t.appealBusy}</> : t.appealSubmit}</Button>
                <Button size="lg" variant="ghost" onClick={() => { setAppealOpen(false); setAppealError(null); }} disabled={busy}>Отменить</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAppealOpen(true)} className="inline-flex min-h-11 items-center rounded-sm text-sm text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring">Оспорить разбор</button>
          )}
          <div className="callout">
            <div className="callout-label">Запомнить</div>
            <p className="mt-2 type-body">{c.keyTakeaway}</p>
          </div>
          {!guest && progress && progress.xp === progress.gained ? (
            <div className="callout">
              <div className="callout-label">Что дальше</div>
              <p className="mt-2 type-body">Первый урок пройден, серия началась: она считает дни подряд. Если пропустить день, серия начнётся с единицы, а баллы и пройденные уроки останутся. Сегодняшний урок вернётся карточками на повторение: завтра они появятся в разделе «Повторение».</p>
            </div>
          ) : null}
          {guest ? (
            <div className="rounded-xl border p-6">
              <h3 className="text-balance type-heading">{guest.signedIn ? "Сохраните разбор в профиле" : "Войдите, чтобы сохранить разбор и получать урок каждый день"}</h3>
              <p className="mt-2 type-body text-muted-foreground">Перенесём ответ и разбор в профиль. Завтра утром пришлём письмо со следующим уроком, а этот урок вернётся карточками на повторение, чтобы проверить, что запомнилось. {guest.signedIn ? "Без сохранения разбор останется только в этом браузере." : "Пароль не нужен, вход по почте. Без входа разбор останется только в этом браузере."}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button nativeButton={false} render={<Link href={guest.signedIn ? "/try/claim" : TRY_LOGIN_HREF} />} size="lg">{guest.signedIn ? "Сохранить разбор" : "Войти и сохранить"}</Button>
                <Button size="lg" variant="outline" onClick={() => setStep("task")}>{t.retry}</Button>
              </div>
            </div>
          ) : course ? (
          /* Завершение: звёздочка курса крупно на оранжевой плашке, рядом число, дальше следующий шаг. */
          <section aria-labelledby="course-progress-title" className="accent-panel">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
              <ProgressAsterisk
                tone="inverse"
                size={96}
                value={{ done: courseDone, total: course.total }}
                label={`Пройдено ${courseDone} из ${course.total}`}
                count={`${courseDone} из ${course.total}`}
                countClassName="type-counter"
                className="gap-5"
              />
              {/* На телефоне подпись уходит под звёздочку, а не сжимается в узкий столбик рядом. */}
              <div className="min-w-0 flex-1 basis-48">
                <h2 id="course-progress-title" className="eyebrow">{courseDone >= course.total && course.total > 0 ? "Курс пройден" : "Курс"}</h2>
                <p className="mt-1 type-body accent-panel-muted">
                  {courseDone >= course.total && course.total > 0 ? "все уроки позади, дальше повторение" : `${plural(courseDone, "урок пройден", "урока пройдено", "уроков пройдено")}, ещё ${plural(course.total - courseDone, "урок", "урока", "уроков")}`}
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button nativeButton={false} render={<Link href={nextHref} />} size="lg" variant="inverse" className="h-auto min-h-11 max-w-full shrink whitespace-normal py-2 text-left">{nextLabel}</Button>
              <Button size="lg" variant="inverse-outline" onClick={() => setStep("task")}>{t.retry}</Button>
            </div>
          </section>
          ) : (
          <div className="flex flex-wrap gap-3">
            <Button nativeButton={false} render={<Link href={nextHref} />} size="lg" className="h-auto min-h-11 max-w-full shrink whitespace-normal py-2 text-left">{nextLabel}</Button>
            <Button size="lg" variant="outline" onClick={() => setStep("task")}>{t.retry}</Button>
          </div>
          )}
        </section>
      ) : null}
    </article>
    </>
  );
}
