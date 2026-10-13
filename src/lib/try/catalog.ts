import fs from "node:fs";
import path from "node:path";
import { isUuid } from "@/lib/utils/ids";
import { SeedSchema } from "@/lib/lessons/seed-schema";
import type { LessonContent } from "@/lib/lessons/types";
import type { Tone } from "@/lib/prompts/tone";

/** Курсы-примеры, в которых гость может пройти первый урок. Остальные курсы и уроки гостю не отдаём. */
const TRY_SLUGS = ["critical-thinking-ai"] as const;

export const DEFAULT_TRY_SLUG = TRY_SLUGS[0];

export interface TryLesson {
  slug: string;
  courseTitle: string;
  tone: Tone;
  content: LessonContent;
}

/** Гостю открыт только первый урок: на любой другой номер и неизвестный курс вернётся null. */
export function getTryLesson(slug: string, lessonIndex: number): TryLesson | null {
  if (lessonIndex !== 1 || !(TRY_SLUGS as readonly string[]).includes(slug)) return null;
  const file = path.join(process.cwd(), "content", "courses", `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const seed = SeedSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const content = seed.lessons[0];
  return content ? { slug, courseTitle: seed.title, tone: seed.tone, content } : null;
}

/** id курса-примера в базе: курс один раз создаёт команда (createDemoCourseAction), id кладётся в TRY_COURSES={"slug":"uuid"}. */
export function tryCourseId(slug: string): string | null {
  try {
    const map = JSON.parse(process.env.TRY_COURSES ?? "{}") as Record<string, unknown>;
    const id = map[slug];
    return typeof id === "string" && isUuid(id) ? id : null;
  } catch {
    return null;
  }
}
