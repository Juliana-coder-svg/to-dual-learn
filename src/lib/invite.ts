import { plural } from "@/lib/utils/format";

/** Минут на один урок: так сказано в самом курсе и в письмах. */
export const MINUTES_PER_LESSON = 5;

/** Готовый текст приглашения, который преподаватель отправляет в чат. Говорит преподаватель, поэтому на «вы». */
export function inviteText({ title, lessons, link, code, yandex }: { title: string; lessons: number; link: string; code: string; yandex: boolean }): string {
  return [
    `Приглашаю на курс «${title}».`,
    `Один урок в день, около ${MINUTES_PER_LESSON} минут: короткая идея, задача и разбор от наставника. Сейчас в курсе ${plural(lessons, "урок", "урока", "уроков")}.`,
    `Откройте ссылку и войдите ${yandex ? "через Яндекс ID или по почте" : "по почте"}: курс сразу появится в вашем списке.`,
    link,
    `Если ссылка не открывается, введите код ${code} в разделе «Записаться на курс».`,
  ].join("\n\n");
}
