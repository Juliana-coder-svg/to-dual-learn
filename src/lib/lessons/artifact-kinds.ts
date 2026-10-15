/** Виды документов для преподавателя. Отдельный файл без zod: его импортирует клиентский ArtifactGenerator,
 *  и импорт из types.ts затащил бы схемы zod (~100 кБ) в браузерный бандл. */
export const ARTIFACT_KINDS = {
  assignment: "Задание для студентов",
  quiz: "Проверочный тест",
  notes: "Конспект",
  lesson_plan: "План занятия",
  presentation: "Структура презентации",
} as const;
export type ArtifactKind = keyof typeof ARTIFACT_KINDS;
