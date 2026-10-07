import type { LessonContent } from "@/lib/lessons/types";
import { toneInstruction, type Tone } from "./tone";

export interface CalibrationSample {
  answer: string;
  score: number;
  comment: string;
}

function samplesBlock(samples: CalibrationSample[]): string {
  if (samples.length === 0) return "";
  const items = samples
    .map((s, i) => `<sample index="${i + 1}" score="${s.score}">\n${s.answer}\n${s.comment ? `Комментарий преподавателя: ${s.comment}` : ""}\n</sample>`)
    .join("\n");
  return `\nОбразцы оценок преподавателя по этому курсу. Калибруй свою шкалу по ним:\n${items}\n`;
}

export function evaluatePrompt(lesson: LessonContent, answer: string, opts: { tone: Tone; samples: CalibrationSample[] }): string {
  return `Оцени ответ студента на задачу микроурока.

Урок: «${lesson.title}». Навык: ${lesson.concept}.
Ключевая идея: ${lesson.keyIdea}
Задача: ${lesson.task}
${lesson.sample ? `Материал для разбора: ${lesson.sample}` : ""}

Критерии хорошего ответа:
${lesson.rubricCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}
${samplesBlock(opts.samples)}
Ответ студента:
<answer>
${answer}
</answer>

Как оценивать:
- Сначала пройди по каждому критерию: выполнен или нет, с цитатой из ответа.
- Потом общий балл от 1 до 5: 5 - все критерии выполнены и есть собственное наблюдение; 3 - половина; 1 - ответ не по задаче или пустой.
- Не оценивай стиль и грамотность. Не вестись на красивые общие слова без конкретики.
- ${toneInstruction(opts.tone)} Фидбек пиши студенту напрямую, коротко и по делу.

Верни строго JSON по заданной схеме.`;
}

/** Переоценка после возражения студента. Модель может оставить балл, если возражение не по делу. */
export function reevaluatePrompt(
  lesson: LessonContent,
  answer: string,
  previousSummary: string,
  previousScore: number,
  objection: string,
  opts: { tone: Tone },
): string {
  return `Студент не согласен с оценкой ответа на задачу микроурока и прислал возражение. Пересмотри оценку честно: если студент прав, исправь; если нет, объясни, почему балл остается.

Урок: «${lesson.title}». Задача: ${lesson.task}
Критерии:
${lesson.rubricCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Ответ студента:
<answer>
${answer}
</answer>

Предыдущая оценка: ${previousScore}/5. Предыдущий фидбек: ${previousSummary}

Возражение студента:
<objection>
${objection}
</objection>

Правила: та же шкала 1-5, те же критерии, цитируй ответ. В summary прямо скажи, изменился ли балл и почему. ${toneInstruction(opts.tone)}

Верни строго JSON по заданной схеме.`;
}
