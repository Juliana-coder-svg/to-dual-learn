import type { LessonContent } from "@/lib/lessons/types";

export function evaluatePrompt(lesson: LessonContent, answer: string): string {
  return `Оцени ответ студента на задачу микроурока.

Урок: «${lesson.title}». Навык: ${lesson.concept}.
Ключевая идея: ${lesson.keyIdea}
Задача: ${lesson.task}
${lesson.sample ? `Материал для разбора: ${lesson.sample}` : ""}

Критерии хорошего ответа:
${lesson.rubricCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Ответ студента:
<answer>
${answer}
</answer>

Как оценивать:
- Сначала пройди по каждому критерию: выполнен или нет, с цитатой из ответа.
- Потом общий балл от 1 до 5: 5 — все критерии выполнены и есть собственное наблюдение; 3 — половина; 1 — ответ не по задаче или пустой.
- Не оценивай стиль и грамотность. Не вестись на красивые общие слова без конкретики.
- Фидбек пиши студенту напрямую, на «ты», коротко и по делу.

Верни строго JSON по заданной схеме.`;
}
