import { getCourse, isEnrolled, type Course, type User } from "@/lib/db/queries";
import { getCurrentUser } from "./session";

/** Курс, которым владеет текущий пользователь. null — нет сессии или не владелец. */
export async function teacherCourse(courseId: string): Promise<{ user: User; course: Course } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const course = getCourse(courseId);
  if (!course || course.owner_id !== user.id) return null;
  return { user, course };
}

/** Курс, на который записан текущий пользователь (или его владелец — чтобы препод мог пройти свой курс). */
export async function studentCourse(courseId: string): Promise<{ user: User; course: Course } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const course = getCourse(courseId);
  if (!course) return null;
  if (course.owner_id !== user.id && !isEnrolled(user.id, courseId)) return null;
  return { user, course };
}
