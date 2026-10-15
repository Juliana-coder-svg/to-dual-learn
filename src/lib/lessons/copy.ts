import type { Tone } from "@/lib/prompts/tone";

/** Тексты экрана урока, которые зависят от обращения курса. Шапка, ошибки сервера и общие элементы остаются на «вы». */
export interface LessonCopy {
  answerLabel: string;
  answerPlaceholder: string;
  submit: string;
  submitRetry: string;
  busy: string;
  back: string;
  appealTitle: string;
  appealPlaceholder: string;
  appealSubmit: string;
  appealBusy: string;
  yourAnswer: string;
  retry: string;
}

/** Говорит сервис, поэтому на «вы» при любом тоне курса. */
export const TOO_SHORT = "Нужно хотя бы одно предложение: ответ короче 10 знаков наставник не разберёт.";
export const RETRY_HINT = "Ответ остался в поле. Нажмите «Отправить ещё раз», а если не выйдет, попробуйте через минуту.";
export const APPEAL_RETRY_HINT = "Возражение осталось в поле. Нажмите «Отправить возражение» ещё раз, а если не выйдет, попробуйте через минуту.";

const COPY: Record<Tone, LessonCopy> = {
  ty: {
    answerLabel: "Твой ответ",
    answerPlaceholder: "Конкретика важнее объёма. Хватит нескольких предложений.",
    submit: "Отправить на разбор",
    submitRetry: "Отправить ещё раз",
    busy: "Наставник читает…",
    back: "К идее урока",
    appealTitle: "Что в разборе не так?",
    appealPlaceholder: "Назови критерий и место в ответе, которое наставник не учёл",
    appealSubmit: "Отправить возражение",
    appealBusy: "Наставник перечитывает…",
    yourAnswer: "Твой ответ",
    retry: "Ответить ещё раз",
  },
  vy: {
    answerLabel: "Ваш ответ",
    answerPlaceholder: "Конкретика важнее объёма. Хватит нескольких предложений.",
    submit: "Отправить на разбор",
    submitRetry: "Отправить ещё раз",
    busy: "Наставник читает…",
    back: "К идее урока",
    appealTitle: "Что в разборе не так?",
    appealPlaceholder: "Назовите критерий и место в ответе, которое наставник не учёл",
    appealSubmit: "Отправить возражение",
    appealBusy: "Наставник перечитывает…",
    yourAnswer: "Ваш ответ",
    retry: "Ответить ещё раз",
  },
};

export function lessonCopy(tone: Tone): LessonCopy {
  return COPY[tone];
}

/** Что значит балл. Шкала та же, что в промпте разбора (src/lib/prompts/evaluate.ts): 5 — все критерии и своё наблюдение сверх них, 4 — все критерии, 3 — примерно половина, 2 — один, 1 — не по задаче. Говорит сервис, поэтому на «вы» и на «ты» одинаково. */
export function scoreMeaning(score: number, met: number, total: number, withReservation: number): string {
  const of = total > 0 ? `${met} из ${total}` : "";
  const reservation = withReservation > 0 ? (withReservation === 1 ? ", один с оговоркой" : `, с оговоркой: ${withReservation}`) : "";
  if (score >= 5) return `Балл 5 из 5: выполнены все критерии${reservation} и есть своё наблюдение сверх них.`;
  if (score === 4) return `Балл 4 из 5: ${total > 0 && met === total ? `выполнены все критерии${reservation}` : `выполнено ${of}`}. Пять ставим, когда в ответе есть ещё и своё наблюдение сверх критериев.`;
  if (score === 3) return `Балл 3 из 5: ${total > 0 ? `выполнено ${of}` : "выполнена примерно половина критериев"}. Четыре ставим, когда выполнены все.`;
  if (score === 2) return `Балл 2 из 5: ответ по теме, но ${total > 0 ? `выполнено ${of}` : "выполнен один критерий или нет конкретики"}.`;
  return "Балл 1 из 5: ответ не по задаче или пустой.";
}

const RESERVATION = /^\s*Засчитано с оговоркой[\s.:;—–-]*/i;

/** Модель иногда начинает комментарий к выполненному критерию словами «Засчитано с оговоркой». Выносим это в метку, а остаток оставляем комментарием. */
export function splitReservation(met: boolean, comment: string | undefined): { reservation: boolean; comment: string } {
  const text = comment?.trim() ?? "";
  if (!met || !RESERVATION.test(text)) return { reservation: false, comment: text };
  const rest = text.replace(RESERVATION, "").trim();
  return { reservation: true, comment: rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : "" };
}
