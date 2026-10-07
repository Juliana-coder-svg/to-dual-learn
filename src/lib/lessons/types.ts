import { z } from "zod";

/** Содержимое микроурока. Формат из ARCHITECTURE.md, расширен вопросом для флешкарты.
 *  Схема без min/max-ограничений: structured outputs Claude поддерживают только базовое подмножество JSON Schema. */
export const LessonContentSchema = z.object({
  title: z.string().describe("Название урока, до 6 слов"),
  concept: z.string().describe("Одна фраза: какой навык отрабатывает урок"),
  intro: z.string().describe("2–3 предложения: зачем это нужно, с опорой на материалы курса"),
  keyIdea: z.string().describe("Ключевая мысль урока, 2–4 предложения"),
  signals: z.array(z.string()).describe("3–5 коротких признаков/правил, которые надо запомнить"),
  task: z.string().describe("Практическая задача с открытым ответом, выполнимая за 3 минуты"),
  sample: z.string().nullable().describe("Текст/кейс для разбора в задаче, если нужен; иначе null"),
  rubricCriteria: z.array(z.string()).describe("3–4 критерия хорошего ответа"),
  keyTakeaway: z.string().describe("Одна фраза, которую человек уносит с собой"),
  flashcardQuestion: z.string().describe("Вопрос для повторения через несколько дней"),
  flashcardAnswer: z.string().describe("Короткий ответ на вопрос флешкарты"),
});
export type LessonContent = z.infer<typeof LessonContentSchema>;

export const LessonsBatchSchema = z.object({
  lessons: z.array(LessonContentSchema),
});

export const FeedbackSchema = z.object({
  score: z.number().int().describe("Оценка от 1 до 5"),
  criteria: z.array(
    z.object({
      criterion: z.string(),
      met: z.boolean(),
      comment: z.string().describe("Одно предложение с цитатой из ответа, если критерий выполнен или нарушен"),
    }),
  ),
  strengths: z.array(z.string()).describe("Что сделано хорошо, 1–3 пункта"),
  improvements: z.array(z.string()).describe("Что улучшить, 1–3 конкретных пункта"),
  summary: z.string().describe("2–3 предложения итогового фидбека от ментора"),
});
export type Feedback = z.infer<typeof FeedbackSchema>;

export const HomeworkResultsSchema = z.object({
  results: z.array(
    z.object({
      student: z.string(),
      score: z.number().int().describe("Балл от 0 до 10"),
      criteria: z.array(
        z.object({ criterion: z.string(), met: z.boolean(), comment: z.string() }),
      ),
      feedback: z.string().describe("Комментарий студенту, 2–4 предложения"),
      flags: z.array(z.string()).describe("Сигналы для преподавателя: подозрение на копипаст, не по теме, пусто и т.п."),
    }),
  ),
  overview: z.string().describe("Сводка для преподавателя: типичные ошибки, что разобрать на занятии"),
});
export type HomeworkResults = z.infer<typeof HomeworkResultsSchema>;

export const ARTIFACT_KINDS = {
  assignment: "Задание для студентов",
  quiz: "Проверочный тест",
  notes: "Конспект",
  lesson_plan: "План занятия",
  presentation: "Структура презентации",
} as const;
export type ArtifactKind = keyof typeof ARTIFACT_KINDS;
