"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  addCalibrationSample,
  clearChat,
  createCourse,
  deleteCalibrationSample,
  deleteLesson,
  deleteMaterial,
  enroll,
  getCourseByJoinCode,
  moveLesson,
  setAllLessonsStatus,
  setLessonStatus,
  updateCourseSettings,
  updateLessonContent,
} from "@/lib/db/queries";
import { LessonContentSchema } from "@/lib/lessons/types";
import { requireUser } from "@/lib/auth/session";
import { teacherCourse } from "@/lib/auth/access";

export async function createCourseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) redirect("/teach?error=title");
  const course = await createCourse({
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
  await deleteMaterial(materialId, courseId);
  revalidatePath(`/teach/${courseId}`);
}

export async function setLessonStatusAction(
  courseId: string,
  lessonId: string,
  status: "draft" | "published",
): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  await setLessonStatus(lessonId, courseId, status);
  revalidatePath(`/teach/${courseId}/lessons`);
}

export async function publishAllAction(courseId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  await setAllLessonsStatus(courseId, "published");
  revalidatePath(`/teach/${courseId}/lessons`);
}

export async function deleteLessonAction(courseId: string, lessonId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  await deleteLesson(lessonId, courseId);
  revalidatePath(`/teach/${courseId}/lessons`);
}

export async function clearChatAction(courseId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  await clearChat(courseId, ctx.user.id);
  revalidatePath(`/teach/${courseId}/chat`);
}

export async function joinCourseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const course = await getCourseByJoinCode(code);
  if (!course) redirect("/learn?error=code");
  await enroll(user.id, course.id);
  redirect(`/learn/${course.id}`);
}

export async function moveLessonAction(courseId: string, lessonId: string, direction: -1 | 1): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  await moveLesson(lessonId, courseId, direction);
  revalidatePath(`/teach/${courseId}/lessons`);
}

function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
}

export async function updateLessonAction(courseId: string, lessonId: string, formData: FormData): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  const sample = String(formData.get("sample") ?? "").trim();
  const flashcards = lines(formData.get("flashcards")).map((l) => {
    const [question, ...rest] = l.split("|");
    return { question: question.trim(), answer: rest.join("|").trim() };
  }).filter((f) => f.question && f.answer);
  const parsed = LessonContentSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    concept: String(formData.get("concept") ?? "").trim(),
    intro: String(formData.get("intro") ?? "").trim(),
    keyIdea: String(formData.get("keyIdea") ?? "").trim(),
    signals: lines(formData.get("signals")),
    task: String(formData.get("task") ?? "").trim(),
    sample: sample || null,
    rubricCriteria: lines(formData.get("rubricCriteria")),
    keyTakeaway: String(formData.get("keyTakeaway") ?? "").trim(),
    flashcards: flashcards.length > 0 ? flashcards : [{ question: "Какая ключевая идея урока?", answer: String(formData.get("keyTakeaway") ?? "").trim() }],
  });
  if (!parsed.success) redirect(`/teach/${courseId}/lessons/${lessonId}/edit?error=1`);
  await updateLessonContent(lessonId, courseId, parsed.data, { by: ctx.user.id });
  revalidatePath(`/teach/${courseId}/lessons`);
  redirect(`/teach/${courseId}/lessons`);
}

export async function updateCourseSettingsAction(courseId: string, formData: FormData): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) redirect(`/teach/${courseId}/settings?error=title`);
  await updateCourseSettings(courseId, {
    title,
    description: String(formData.get("description") ?? ""),
    audience: String(formData.get("audience") ?? ""),
    outcomes: String(formData.get("outcomes") ?? ""),
    tone: formData.get("tone") === "vy" ? "vy" : "ty",
    daily_limit: Math.max(0, Math.min(5, Number(formData.get("daily_limit")) || 0)),
  });
  revalidatePath(`/teach/${courseId}`, "layout");
  redirect(`/teach/${courseId}/settings?saved=1`);
}

export async function addCalibrationSampleAction(courseId: string, formData: FormData): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  const answer = String(formData.get("answer") ?? "").trim();
  const score = Number(formData.get("score"));
  if (answer.length < 10 || !(score >= 1 && score <= 5)) redirect(`/teach/${courseId}/settings?error=sample`);
  const lessonId = String(formData.get("lessonId") ?? "");
  await addCalibrationSample({ courseId, lessonId: lessonId || null, answer, score, comment: String(formData.get("comment") ?? "") });
  revalidatePath(`/teach/${courseId}/settings`);
}

export async function deleteCalibrationSampleAction(courseId: string, sampleId: string): Promise<void> {
  const ctx = await teacherCourse(courseId);
  if (!ctx) return;
  await deleteCalibrationSample(sampleId, courseId);
  revalidatePath(`/teach/${courseId}/settings`);
}
