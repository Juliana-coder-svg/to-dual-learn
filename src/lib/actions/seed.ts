"use server";

import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { addMaterial, createCourse, insertLessons, setAllLessonsStatus, updateCourseSettings } from "@/lib/db/queries";
import { LessonContentSchema } from "@/lib/lessons/types";
import { z } from "zod";

const SeedSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  audience: z.string(),
  outcomes: z.string(),
  tone: z.enum(["ty", "vy"]),
  materials: z.array(z.object({ filename: z.string(), kind: z.string(), content: z.string() })),
  lessons: z.array(LessonContentSchema),
});

/** Создаёт готовый курс из content/courses/<slug>.json: материалы, уроки, сразу опубликованные. */
export async function createDemoCourseAction(slug: string): Promise<void> {
  const user = await requireUser();
  const file = path.join(process.cwd(), "content", "courses", `${slug.replace(/[^a-z0-9-]/g, "")}.json`);
  if (!fs.existsSync(file)) redirect("/teach?error=seed");
  const seed = SeedSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const course = await createCourse({ ownerId: user.id, title: seed.title, description: seed.description, audience: seed.audience });
  await updateCourseSettings(course.id, { title: seed.title, description: seed.description, audience: seed.audience, outcomes: seed.outcomes, tone: seed.tone, daily_limit: 1 });
  for (const m of seed.materials) await addMaterial({ courseId: course.id, filename: m.filename, kind: m.kind, contentText: m.content });
  await insertLessons(course.id, seed.lessons);
  await setAllLessonsStatus(course.id, "published");
  redirect(`/teach/${course.id}/lessons`);
}
