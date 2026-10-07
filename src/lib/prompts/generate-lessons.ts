import { toneInstruction, type Tone } from "./tone";

export function generateLessonsPrompt(opts: {
  courseTitle: string;
  courseDescription: string;
  audience: string;
  outcomes: string;
  tone: Tone;
  count: number;
  existingTitles: string[];
}): string {
  const existing =
    opts.existingTitles.length > 0
      ? `\nВ курсе уже есть уроки: ${opts.existingTitles.join("; ")}. Не повторяй их темы, продолжай последовательность.`
      : "";
  const outcomes = opts.outcomes.trim()
    ? `\nОбразовательные результаты курса (каждый урок должен работать хотя бы на один из них):\n${opts.outcomes.trim()}`
    : "";
  return `Собери ${opts.count} микроуроков по 5 минут для курса «${opts.courseTitle}».
Описание курса: ${opts.courseDescription || "не задано"}.
Аудитория: ${opts.audience || "взрослые, которые учатся по 5 минут в день"}.${outcomes}${existing}
${toneInstruction(opts.tone)}

Правила:
- Каждый урок отрабатывает один конкретный навык или идею из материалов курса, в логичной последовательности от простого к сложному.
- intro и keyIdea опираются на материалы: термины, примеры, формулировки — оттуда. Если в материалах чего-то нет, не выдумывай, бери соседнюю тему, которая есть.
- task — открытая практическая задача, где нужно что-то разобрать, найти, переписать или решить. Если для задачи нужен текст или кейс, положи его в sample; иначе sample = null.
- rubricCriteria — 3–4 проверяемых критерия, по которым AI-ментор оценит ответ. Критерий проверяем, если по ответу можно однозначно сказать «выполнен» или «нет».
- flashcards — 2–3 карточки: одна на ключевую идею, одна на применение, одна на типичную ошибку.
- Язык: русский, без воды.

Верни строго JSON по заданной схеме.`;
}
