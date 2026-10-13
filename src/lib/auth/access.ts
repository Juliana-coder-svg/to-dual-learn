import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getCourse, isEnrolled, type Course, type User } from "@/lib/db/queries";
import { isUuid } from "@/lib/utils/ids";
import { currentUserConsented, getCurrentUser, getCurrentUserId } from "./session";

/** Второй слой поверх RLS: RLS не отдаст чужой курс, но здесь проверка явная и даёт понятный 404/403.
 *  Обёрнуто в cache(): layout и page одного маршрута вызывают это с тем же courseId, запрос идёт один раз.
 *  Профиль и курс грузятся параллельно: каждый круг до Supabase стоит около 300 мс.
 *  Без действующего согласия на обработку данных (src/app/consent) доступа к курсам нет и через API:
 *  ответы и материалы уходят в модель только с согласия. Согласие читается вместе с профилем. */

async function consentedUser(): Promise<User | null> {
  const [user, consented] = await Promise.all([getCurrentUser(), currentUserConsented()]);
  return user && consented ? user : null;
}

/** Курс, которым владеет текущий пользователь. null — нет сессии, нет согласия или не владелец.
 *  Id не в формате uuid отсекается до запроса: PostgREST ответил бы ошибкой 22P02, а не пустотой. */
export const teacherCourse = cache(async (courseId: string): Promise<{ user: User; course: Course } | null> => {
  if (!isUuid(courseId)) return null;
  const [user, course] = await Promise.all([consentedUser(), getCourse(courseId)]);
  if (!user || !course || course.owner_id !== user.id) return null;
  return { user, course };
});

/** Курс, на который записан текущий пользователь (или его владелец — чтобы препод мог пройти свой курс). */
export const studentCourse = cache(async (courseId: string): Promise<{ user: User; course: Course } | null> => {
  if (!isUuid(courseId)) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const [user, course, enrolled] = await Promise.all([consentedUser(), getCourse(courseId), isEnrolled(userId, courseId)]);
  if (!user || !course) return null;
  if (course.owner_id !== user.id && !enrolled) return null;
  return { user, course };
});

/** Что показать, когда teacherCourse/studentCourse вернули null. Вошедший пользователь без действующего
 *  согласия (старый аккаунт после деплоя, новая версия документов) идёт на /consent и возвращается на next;
 *  остальным 404, чтобы не раскрывать, существует ли курс. Только для страниц: в API отвечаем 403. */
export async function noCourseAccess(next: string): Promise<never> {
  const userId = await getCurrentUserId();
  if (userId && !(await currentUserConsented())) redirect(`/consent?next=${encodeURIComponent(next)}`);
  notFound();
}
