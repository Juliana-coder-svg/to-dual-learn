import { StepMarks } from "@/components/shared/StepMarks";

/**
 * Статичные экраны урока для лендинга: те же классы и токены, что в продукте, текст из примера курса.
 * Показывают формат как он есть, без обещаний сверх продукта. Для экранных дикторов скрыты:
 * смысл дублирует текст вокруг, а подпись рамки называет, что это пример.
 */

const STEP_LABELS = ["Идея", "Задача", "Разбор"];

function Frame({ step, caption, children }: { step: 1 | 2 | 3; caption: string; children: React.ReactNode }) {
  return (
    <figure className="flex h-full flex-col">
      <div aria-hidden className="flex-1 border-2 border-foreground bg-card">
        <div className="flex items-end justify-between gap-4 border-b-2 border-foreground px-5 py-4">
          <span className="eyebrow">Урок 02 · шаг {step} из 3</span>
          <StepMarks total={3} filled={step} size="sm" labels={STEP_LABELS} />
        </div>
        <div className="p-5 text-sm">
          <div className="flex items-start gap-4">
            <span className="type-counter text-primary">02</span>
            <div className="min-w-0 pt-1">
              <p className="type-heading">Первая цифра решает</p>
              <p className="mt-1 text-muted-foreground">Заметить эффект якоря после подсказки модели</p>
            </div>
          </div>
          {children}
        </div>
      </div>
      <figcaption className="mt-3 type-caption text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

/** Шаг 1: идея урока и на что смотреть. */
export function LessonIdeaScreen() {
  return (
    <Frame step={1} caption="Пример. Шаг «Идея»: короткая теория и на что смотреть.">
      <p className="mt-5 type-body">
        Первое названное число становится точкой отсчёта: все следующие оценки мы подгоняем под него, даже если его взяли с потолка.
      </p>
      <div className="callout mt-4">
        <div className="callout-label">Идея урока</div>
        <p className="mt-2 type-body">Число от модели не доказательство. Сначала найдите, откуда оно, потом решайте, верить ли ему.</p>
      </div>
      <ul className="mt-4 space-y-2 type-body">
        {["Точная цифра без ссылки на источник", "Второе число, которое резко расходится с первым"].map((s) => (
          <li key={s} className="flex gap-3"><span className="shrink-0 text-primary-strong">→</span><span>{s}</span></li>
        ))}
      </ul>
    </Frame>
  );
}

/** Шаг 2: задача и поле ответа. */
export function LessonTaskScreen() {
  return (
    <Frame step={2} caption="Пример. Шаг «Задача»: один открытый вопрос и поле для ответа.">
      <p className="eyebrow mt-5">Задача</p>
      <p className="mt-1 type-body">
        Модель оценила рынок в 48 млрд рублей. Через час коллега назвал 12 млрд. Какие две проверки вы сделаете до того, как вставить цифру в презентацию?
      </p>
      <div className="mt-4 border border-input bg-background px-3 py-2 text-muted-foreground">
        Первая проверка: откуда модель взяла…
        <span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-foreground" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex h-9 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground">Отправить на разбор</span>
        <span className="type-caption text-muted-foreground">около 5 минут</span>
      </div>
    </Frame>
  );
}

/** Шаг 3: разбор с оценкой, критериями и цитатой. */
export function LessonFeedbackScreen() {
  const criteria: { text: string; met: boolean }[] = [
    { text: "Проверили источник цифры", met: true },
    { text: "Предложили независимую оценку", met: true },
    { text: "Сказали, что сделаете, если источника нет", met: false },
  ];
  return (
    <Frame step={3} caption="Пример разбора. Балл рекомендательный, итоговое решение за преподавателем.">
      <div className="mt-5 flex items-end gap-8 border-t-2 border-foreground pt-4">
        <div>
          <p className="eyebrow">Балл</p>
          <p className="mt-1 type-counter text-primary">4<span className="text-muted-foreground">/5</span></p>
        </div>
        <div>
          <p className="eyebrow">Серия</p>
          <p className="mt-1 type-counter">3</p>
        </div>
      </div>
      <blockquote className="mt-4 border-l-2 border-primary pl-3 type-body text-muted-foreground">
        «Первая проверка: откуда модель взяла 48 млрд и есть ли отчёт»
      </blockquote>
      <ul className="mt-4 divide-y border-y">
        {criteria.map((c) => (
          <li key={c.text} className="flex gap-3 py-2.5 type-body">
            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center text-xs ${c.met ? "bg-primary text-primary-foreground" : "border-2 border-foreground font-bold"}`}>{c.met ? "✓" : "✗"}</span>
            <span className={c.met ? "text-muted-foreground" : "font-medium"}>{c.text}</span>
          </li>
        ))}
      </ul>
      <div className="callout mt-4">
        <div className="callout-label">Один следующий шаг</div>
        <p className="mt-2 type-body">Допишите, что делаете, если источника нет: убираете цифру или помечаете оценкой.</p>
      </div>
    </Frame>
  );
}
