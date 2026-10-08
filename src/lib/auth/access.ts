import { cache } from "react";
import { getCourse, isEnrolled, type Course, type User } from "@/lib/db/queries";
import { isUuid } from "@/lib/utils/ids";
import { getCurrentUser, getCurrentUserId } from "./session";

/** Второй слой поверх RLS: RLS не отдаст чужой курс, но здесь проверка явная и даёт понятный 404/403.
 *  Обёрнуто в cache(): layout и page одного маршрута вызывают это с тем же courseId, запрос идёт один раз.
 *  Профиль и курс грузятся параллельно: каждый круг до Supabase стоит около 300 мс. */

/** Курс, которым владеет текущий пользователь. null — нет сессии или не владелец.
 *  Id не в формате uuid отсекается до запроса: PostgREST ответил бы ошибкой 22P02, а не пустотой. */
export const teacherCourse = cache(async (courseId: string): Promise<{ user: User; course: Course } | null> => {
  if (!isUuid(courseId)) return null;
  const [user, course] = await Promise.all([getCurrentUser(), getCourse(courseId)]);
  if (!user || !course || course.owner_id !== user.id) return null;
  return { user, course };
});

/** Курс, на который записан текущий пользователь (или его владелец — чтобы препод мог пройти свой курс). */
export const studentCourse = cache(async (courseId: string): Promise<{ user: User; course: Course } | null> => {
  if (!isUuid(courseId)) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const [user, course, enrolled] = await Promise.all([getCurrentUser(), getCourse(courseId), isEnrolled(userId, courseId)]);
  if (!user || !course) return null;
  if (course.owner_id !== user.id && !enrolled) return null;
  return { user, course };
});
