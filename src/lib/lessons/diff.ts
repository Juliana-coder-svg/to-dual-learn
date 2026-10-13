import type { LessonContent } from "./types";

/** Поле урока в виде строки, чтобы сравнивать и показывать «сейчас» и «предлагается» одинаково для текста и списков. */
export interface LessonFieldChange {
  key: keyof LessonContent;
  label: string;
  before: string;
  after: string;
}

const FIELDS: { key: keyof LessonContent; label: string }[] = [
  { key: "title", label: "Название" },
  { key: "concept", label: "Навык" },
  { key: "intro", label: "Зачем" },
  { key: "keyIdea", label: "Идея урока" },
  { key: "signals", label: "Признаки" },
  { key: "task", label: "Задача" },
  { key: "sample", label: "Данные к задаче" },
  { key: "rubricCriteria", label: "Критерии" },
  { key: "keyTakeaway", label: "Вывод" },
  { key: "flashcards", label: "Карточки для повторения" },
];

function fieldText(content: LessonContent, key: keyof LessonContent): string {
  const v = content[key];
  if (v == null) return "";
  if (typeof v === "string") return v;
  return v.map((item) => (typeof item === "string" ? item : `${item.question} — ${item.answer}`)).join("\n");
}

/** Какие поля урока методист предлагает изменить. Пусто, если тексты совпадают. */
export function lessonContentChanges(current: LessonContent, proposed: LessonContent): LessonFieldChange[] {
  const out: LessonFieldChange[] = [];
  for (const f of FIELDS) {
    const before = fieldText(current, f.key);
    const after = fieldText(proposed, f.key);
    if (before.trim() !== after.trim()) out.push({ key: f.key, label: f.label, before, after });
  }
  return out;
}
