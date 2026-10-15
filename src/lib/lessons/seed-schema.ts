import { z } from "zod";
import { LessonContentSchema } from "./types";

/** Формат файла курса-примера в content/courses/<slug>.json. */
export const SeedSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  audience: z.string(),
  outcomes: z.string(),
  tone: z.enum(["ty", "vy"]),
  materials: z.array(z.object({ filename: z.string(), kind: z.string(), content: z.string() })),
  lessons: z.array(LessonContentSchema),
});
