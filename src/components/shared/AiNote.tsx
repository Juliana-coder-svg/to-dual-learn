/** Подписи о происхождении текста (docs/legal/ai-in-education.md, 3.1): всё, что создала модель,
 *  помечено, итоговое решение за преподавателем. Один файл, чтобы редактор правил тексты в одном месте.
 *  Без "use client" и хуков: компонент можно вызывать и из клиентских компонентов. */

export const AI_LABELS = {
  lessonReviewed: "Урок собран с помощью ИИ и проверен преподавателем.",
  lessonUnreviewed: "Урок собран с помощью ИИ, преподаватель его ещё не проверил.",
  feedback: "Разбор подготовила модель. Балл рекомендательный, итоговое решение за преподавателем.",
  artifact: "Текст создан моделью, преподаватель отвечает за содержание.",
  chat: "Ответ модели. Проверьте по материалам.",
  homework: "Предварительная оценка модели, итог ставит преподаватель.",
  teacherDraft: "Черновик собрала модель. Проверьте перед публикацией.",
} as const;

export type AiNoteKind = keyof typeof AI_LABELS;

export function AiNote({ kind, className = "" }: { kind: AiNoteKind; className?: string }) {
  return <p className={`text-xs text-muted-foreground ${className}`.trim()}>{AI_LABELS[kind]}</p>;
}
