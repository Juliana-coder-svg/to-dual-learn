/** Подписи о происхождении текста (docs/legal/ai-in-education.md, 3.1): всё, что создала модель,
 *  помечено, итоговое решение за преподавателем. Один файл, чтобы редактор правил тексты в одном месте.
 *  Без "use client" и хуков: компонент можно вызывать и из клиентских компонентов. */

export const AI_LABELS = {
  lessonReviewed: "Урок собран с помощью ИИ. Преподаватель его проверил.",
  lessonUnreviewed: "Урок собран с помощью ИИ. Преподаватель его ещё не проверил.",
  feedback: "Разбор подготовила модель. Балл рекомендательный: итоговое решение за преподавателем.",
  artifact: "Текст создан с помощью ИИ. За содержание отвечает преподаватель.",
  chat: "Ответ модели. Проверьте по материалам.",
  homework: "Баллы и комментарии подготовила модель. Итоговый балл ставит преподаватель.",
  teacherDraft: "Черновик собрала модель. Проверьте перед публикацией.",
} as const;

export type AiNoteKind = keyof typeof AI_LABELS;

/** Пометка «ИИ» и текст одной строкой, приглушённым цветом. Форма одна на все экраны, чтобы пометка узнавалась. */
export function AiNote({ kind, className = "" }: { kind: AiNoteKind; className?: string }) {
  return (
    <p className={`flex items-start gap-2 type-caption text-muted-foreground ${className}`.trim()}>
      <span aria-hidden className="mt-px inline-flex h-4 shrink-0 items-center rounded-sm border px-1 text-[10px] font-semibold uppercase tracking-wide">ИИ</span>
      <span>{AI_LABELS[kind]}</span>
    </p>
  );
}
