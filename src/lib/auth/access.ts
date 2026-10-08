import { getCourse, isEnrolled, type Course, type User } from "@/lib/db/queries";
import { currentUserConsented, getCurrentUser } from "./session";

/** Второй слой поверх RLS: RLS не отдаст чужой курс, но здесь проверка явная и даёт понятный 404/403.
 *  Без действующего согласия на обработку данных (src/app/consent) доступа к курсам нет и через API:
 *  ответы и материалы уходят в модель только с согласия. Проверка согласия читается вместе с профилем. */

async function consentedUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || !(await currentUserConsented())) return null;
  return user;
}

/** Курс, которым владеет текущий пользователь. null — нет сессии или не владелец. */
export async function teacherCourse(courseId: string): Promise<{ user: User; course: Course } | null> {
  const user = await consentedUser();
  if (!user) return null;
  const course = await getCourse(courseId);
  if (!course || course.owner_id !== user.id) return null;
  return { user, course };
}

/** Курс, на который записан текущий пользователь (или его владелец — чтобы препод мог пройти свой курс). */
export async function studentCourse(courseId: string): Promise<{ user: User; course: Course } | null> {
  const user = await consentedUser();
  if (!user) return null;
  const course = await getCourse(courseId);
  if (!course) return null;
  if (course.owner_id !== user.id && !(await isEnrolled(user.id, courseId))) return null;
  return { user, course };
}
