export function generateLessonsPrompt(opts: {
  courseTitle: string;
  courseDescription: string;
  audience: string;
  count: number;
  existingTitles: string[];
}): string {
  const existing =
    opts.existingTitles.length > 0
      ? `\nВ курсе уже есть уроки: ${opts.existingTitles.join("; ")}. Не повторяй их темы.`
      : "";
  return `Собери ${opts.count} микроуроков по 5 минут для курса «${opts.courseTitle}».
Описание курса: ${opts.courseDescription || "не задано"}.
Аудитория: ${opts.audience || "взрослые, которые учатся по 5 минут в день"}.${existing}

Правила:
- Каждый урок отрабатывает один конкретный навык или идею из материалов курса, в логичной последовательности от простого к сложному.
- intro и keyIdea опираются на материалы: термины, примеры, формулировки — оттуда.
- task — открытая практическая задача, где нужно что-то разобрать, найти, переписать или решить. Если для задачи нужен текст или кейс, положи его в sample; иначе sample = null.
- rubricCriteria — 3–4 проверяемых критерия, по которым AI-ментор оценит ответ.
- flashcardQuestion/flashcardAnswer — вопрос и короткий ответ для повторения через несколько дней.
- Язык: русский, без воды.

Верни строго JSON по заданной схеме.`;
}
