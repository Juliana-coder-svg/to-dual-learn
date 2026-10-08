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
  worked: z
    .string()
    .nullable()
    .describe("Одна-две фразы студенту: что в ответе получилось, по выполненным критериям, с указанием места в ответе. null, если не выполнен ни один критерий и по задаче в ответе ничего нет"),
  nextStep: z
    .string()
    .nullable()
    .describe("Один следующий шаг как действие, одно предложение: что сделать в следующем ответе, чтобы закрыть самый важный невыполненный критерий. Не готовый ответ. null только если шаг назвать нельзя"),
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
  overview: z
    .object({
      failedCriteria: z
        .array(
          z.object({
            criterion: z.string().describe("Критерий дословно, как у преподавателя"),
            failed: z.number().int().describe("Сколько работ его не выполнили"),
            total: z.number().int().describe("Сколько работ проверено"),
          }),
        )
        .describe("Критерии, которые не выполнила половина работ или больше, по убыванию числа провалов. Пусто, если таких нет"),
      reteach: z
        .array(
          z.object({
            topic: z.string().describe("Какой фрагмент материалов или какую идею переобъяснить: раздел, правило или приём, как он назван в материалах"),
            why: z.string().describe("Почему это видно по работам: одно-два предложения с примером из работ"),
          }),
        )
        .describe("1–3 пункта, что переобъяснить на занятии. Пусто, если переобъяснять нечего"),
      quickWins: z.array(z.string()).describe("Что уже получается у большинства, 1–3 пункта по выполненным критериям. Пусто, если таких нет"),
    })
    .describe("Сводка для преподавателя по всей пачке работ"),
});
export type HomeworkResults = z.infer<typeof HomeworkResultsSchema>;
export type HomeworkOverview = HomeworkResults["overview"];

/** Проверки, сохранённые до структурной сводки (до 8 октября 2026), хранят overview строкой.
 *  При чтении она переезжает в overviewText, а структурная сводка собирается из результатов. */
export interface StoredHomeworkResults extends HomeworkResults {
  overviewText?: string;
}

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
