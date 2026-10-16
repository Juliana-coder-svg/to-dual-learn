/** Контакт и письмо-заявка на пилот. Формы и базы под заявки нет: письмо уходит на общий адрес сервиса. */
export const CONTACT_EMAIL = "learn@to-dual.education";

const SUBJECT = "Пилот TO DUAL Learn";
const BODY = [
  "Здравствуйте.",
  "",
  "Хотим обсудить пилот TO DUAL Learn.",
  "Организация (вуз или компания):",
  "Программа, для которой нужен пилот:",
  "Сколько человек в группе:",
  "Когда хотели бы начать:",
  "",
  "Контакт для ответа:",
].join("\n");

export const PILOT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;
