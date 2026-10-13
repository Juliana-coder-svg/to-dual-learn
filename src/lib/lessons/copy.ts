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
