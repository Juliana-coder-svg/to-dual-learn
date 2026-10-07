export function checkHomeworkPrompt(opts: {
  task: string;
  criteria: string;
  submissions: { student: string; answer: string }[];
}): string {
  const items = opts.submissions
    .map(
      (s, i) => `<submission index="${i + 1}" student="${s.student.replace(/"/g, "'")}">\n${s.answer}\n</submission>`,
    )
    .join("\n\n");
  return `Проверь домашние работы студентов.

Задание:
${opts.task}

Критерии проверки от преподавателя:
${opts.criteria}

Работы:
${items}

Как проверять:
- По каждой работе пройди по всем критериям: выполнен или нет, с цитатой.
- Балл от 0 до 10. Пустая работа или не по заданию — 0–2.
- Отметь в flags, если работа похожа на копипаст из материалов, повторяет другую работу, или написана не по теме.
- Фидбек студенту — на «ты», 2–4 предложения, с конкретикой.
- В overview для преподавателя: типичные ошибки по группе и что стоит разобрать на занятии.
- Поле student в результате должно точно совпадать с атрибутом student работы.

Верни строго JSON по заданной схеме.`;
}
