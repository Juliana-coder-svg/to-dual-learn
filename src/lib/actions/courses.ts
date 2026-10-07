"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  clearChat,
  createCourse,
  deleteLesson,
  deleteMaterial,
  enroll,
  getCourseByJoinCode,
  setAllLessonsStatus,
  setLessonStatus,
} from "@/lib/db/queries";
import { requireUser } from "@/lib/auth/session";
import { teacherCourse } from "@/lib/auth/access";

export async function createCourseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) redirect("/teach?error=title");
  const course = createCourse({
    ownerId: user.id,
    title,
    description: String(formData.get("description") ?? ""),
    audience: String(formData.get("audience") ?? ""),
  });
  redirect(`/teach/${course.id}`);
}

export async function deleteMaterialAction(courseId: string, materialId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  deleteMaterial(materialId, courseId);
  revalidatePath(`/teach/${courseId}`);
}

export async function setLessonStatusAction(
  courseId: string,
  lessonId: string,
  status: "draft" | "published",
): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  setLessonStatus(lessonId, courseId, status);
  revalidatePath(`/teach/${courseId}/lessons`);
}

export async function publishAllAction(courseId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  setAllLessonsStatus(courseId, "published");
  revalidatePath(`/teach/${courseId}/lessons`);
}

export async function deleteLessonAction(courseId: string, lessonId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  deleteLesson(lessonId, courseId);
  revalidatePath(`/teach/${courseId}/lessons`);
}

export async function clearChatAction(courseId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  clearChat(courseId, ctx.user.id);
  revalidatePath(`/teach/${courseId}/chat`);
}

export async function joinCourseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const course = getCourseByJoinCode(code);
  if (!course) redirect("/learn?error=code");
  enroll(user.id, course.id);
  redirect(`/learn/${course.id}`);
}
