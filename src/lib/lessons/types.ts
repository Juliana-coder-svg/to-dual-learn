import { z } from "zod";

/** Содержимое микроурока. Формат из ARCHITECTURE.md, расширен вопросом для флешкарты.
 *  Схема без min/max-ограничений: structured outputs Claude поддерживают только базовое подмножество JSON Schema. */
export const LessonContentSchema = z.object({
  title: z.string().describe("Название урока, до 6 слов"),
  concept: z.string().describe("Одна фраза: какой навык отрабатывает урок"),
  intro: z.string().describe("2–3 предложения: зачем это нужно, с опорой на материалы курса"),
  keyIdea: z.string().describe("Ключевая мысль урока, 2–4 предложения"),
  signals: z.array(z.string()).describe("3–5 коротких признаков или правил, которые стоит запомнить"),
  task: z.string().describe("Практическая задача с открытым ответом на новом материале, выполнимая за 3–5 минут"),
  sample: z.string().nullable().describe("Текст или пример для разбора в задаче, если нужен; иначе null"),
  rubricCriteria: z.array(z.string()).describe("3–4 критерия хорошего ответа"),
  keyTakeaway: z.string().describe("Одна фраза, которую студент уносит с собой"),
  flashcards: z
    .array(z.object({ question: z.string(), answer: z.string().describe("Короткий ответ, 1–2 предложения") }))
    .describe("2–3 карточки для повторения на припоминание, не на узнавание: на признаки или шаги приёма, на применение к новой ситуации, на типичную ошибку"),
});
export type LessonContent = z.infer<typeof LessonContentSchema>;

/** Уроки, сохранённые до перехода на массив карточек, приводим к новому формату при чтении. */
export function normalizeLessonContent(raw: unknown): LessonContent {
  const r = raw as Record<string, unknown>;
  if (r && !Array.isArray(r.flashcards) && typeof r.flashcardQuestion === "string") {
    const { flashcardQuestion, flashcardAnswer, ...rest } = r;
    return LessonContentSchema.parse({ ...rest, flashcards: [{ question: flashcardQuestion, answer: String(flashcardAnswer ?? "") }] });
  }
  return LessonContentSchema.parse(raw);
}

export const LessonReviewSchema = z.object({
  lessons: z.array(LessonContentSchema).describe("Уроки после правок ревьюера, в том же порядке и количестве"),
  notes: z.array(
    z.object({
      title: z.string().describe("Название урока из входа"),
      changed: z.boolean(),
      flags: z.array(z.string()).describe("Что предлагается изменить и почему, по одному пункту на правку, с номером пункта проверки: нет опоры на материалы, задача не выполнима за 5 минут, критерий не проверяем, повтор темы. Пусто, если всё в порядке"),
    }),
  ),
  summary: z.string().describe("2–3 предложения для преподавателя: что поправлено и что стоит проверить руками"),
});
export type LessonReview = z.infer<typeof LessonReviewSchema>;
export type LessonReviewNote = LessonReview["notes"][number];

/** Что хранится в lessons.review: заметка методиста плюс, пока преподаватель не решил, предложенная версия урока.
 *  proposal — текст, который методист предлагает вместо текущего; decision — что преподаватель с ним сделал. */
export interface LessonReviewRecord extends LessonReviewNote {
  proposal?: LessonContent | null;
  decision?: "accepted" | "rejected" | null;
}

export const LessonsBatchSchema = z.object({
  lessons: z.array(LessonContentSchema),
});

export const FeedbackSchema = z.object({
  score: z.number().int().describe("Балл от 1 до 5"),
  criteria: z.array(
    z.object({
      criterion: z.string(),
      met: z.boolean(),
      comment: z.string().describe("Одно предложение с цитатой из ответа: почему критерий выполнен или нет"),
    }),
  ),
  strengths: z.array(z.string()).describe("Что сделано хорошо, 0–3 пункта; при балле 1 список может быть пустым"),
  improvements: z.array(z.string()).describe("Что улучшить, 1–3 конкретных пункта"),
  summary: z.string().describe("2–3 предложения итогового разбора от наставника, по-человечески, без штампов"),
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
      flags: z.array(z.string()).describe("Отметки для преподавателя: дословное совпадение с материалами или другой работой, не по заданию, пустая работа"),
    }),
  ),
  overview: z.string().describe("Сводка для преподавателя: типичные ошибки, что разобрать на занятии"),
});
export type HomeworkResults = z.infer<typeof HomeworkResultsSchema>;

export const ClarifyingQuestionsSchema = z.object({
  questions: z.array(z.object({ question: z.string(), why: z.string().describe("Одна фраза: зачем этот ответ нужен для уроков") })),
});
export type ClarifyingQuestions = z.infer<typeof ClarifyingQuestionsSchema>;

export const ARTIFACT_KINDS = {
  assignment: "Задание для студентов",
  quiz: "Проверочный тест",
  notes: "Конспект",
  lesson_plan: "План занятия",
  presentation: "Структура презентации",
} as const;
export type ArtifactKind = keyof typeof ARTIFACT_KINDS;
