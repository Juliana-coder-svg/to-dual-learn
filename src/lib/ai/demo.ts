import type { Course, Material } from "@/lib/db/queries";
import { ARTIFACT_KINDS, type ArtifactKind, type Feedback, type HomeworkResults, type LessonContent, type LessonReview } from "@/lib/lessons/types";

/** Пробный режим без ключа модели: предсказуемые примеры ответов, чтобы прокликать интерфейс. */

const NOTE = "Пробный режим: ключ модели не задан, это пример ответа.";

export const demo = {
  extractedPdf(name: string): string {
    return `# ${name}\n\n${NOTE}\n\nЗдесь будет текст PDF, извлечённый моделью. Для TXT и MD файлов извлечение не нужно, текст сохраняется как есть.`;
  },

  lessons(course: Course, count: number): LessonContent[] {
    return Array.from({ length: count }, (_, i) => ({
      title: `Урок ${i + 1}: пример темы`,
      concept: `Навык ${i + 1} по курсу «${course.title}»`,
      intro: `${NOTE} С подключённой моделью урок собирается из материалов курса.`,
      keyIdea: "Ключевая идея урока: одна мысль, которую нужно применить в задаче.",
      signals: ["Признак один", "Признак два", "Признак три"],
      task: "Опишите в 3–5 предложениях, как применить идею урока к своей рабочей задаче.",
      sample: i % 2 === 0 ? "Пример текста для разбора: «Согласно исследованию, 87% компаний уже внедрили ИИ», без ссылки на источник." : null,
      rubricCriteria: ["Назван конкретный пример", "Объяснено, почему он подходит", "Описан следующий шаг"],
      keyTakeaway: "Если утверждение звучит конкретно, но источника нет, его надо проверить.",
      flashcards: [
        { question: `Какая ключевая идея урока ${i + 1}?`, answer: "Одна мысль, которую нужно применить в задаче." },
        { question: "Что делать, если утверждение звучит конкретно, но источника нет?", answer: "Считать его гипотезой и проверить первоисточник." },
      ],
    }));
  },

  artifact(kind: ArtifactKind, course: Course): string {
    return `## ${ARTIFACT_KINDS[kind]} по курсу «${course.title}»\n\n${NOTE}\n\n1. Пункт один\n2. Пункт два\n3. Пункт три`;
  },

  feedback(lesson: LessonContent, answer: string): Feedback {
    const long = answer.trim().length > 120;
    return {
      score: long ? 4 : 2,
      criteria: lesson.rubricCriteria.map((criterion, i) => ({
        criterion,
        met: long || i === 0,
        comment: long ? "В ответе есть конкретика." : "В ответе не хватает конкретики.",
      })),
      strengths: ["Ответ по теме задачи."],
      improvements: ["Не хватает конкретного примера из практики."],
      summary: `${NOTE} С подключённой моделью здесь будет разбор наставника с цитатами из ответа.`,
    };
  },

  homework(submissions: { student: string; answer: string }[]): HomeworkResults {
    return {
      results: submissions.map((s) => ({
        student: s.student,
        score: Math.min(10, Math.max(1, Math.round(s.answer.trim().length / 40))),
        criteria: [{ criterion: "Работа соответствует заданию", met: s.answer.trim().length > 50, comment: NOTE }],
        feedback: "Пример разбора: с подключённой моделью здесь будет оценка по критериям с цитатами.",
        flags: s.answer.trim().length < 20 ? ["Слишком короткая работа"] : [],
      })),
      overview: `${NOTE} Сводка по группе появится с подключённой моделью.`,
    };
  },

  review(lessons: LessonContent[]): LessonReview {
    return {
      lessons,
      notes: lessons.map((l, i) => ({ title: l.title, changed: false, flags: i === 0 ? [`${NOTE} Пример замечания методиста.`] : [] })),
      summary: `${NOTE} С подключённой моделью методист сверит уроки с материалами и образовательными результатами.`,
    };
  },

  chat(question: string, materials: Material[]): string {
    return `${NOTE}\n\nВопрос: «${question}». Загружено материалов: ${materials.length}. С подключённой моделью ответ будет по содержимому материалов.`;
  },
};
