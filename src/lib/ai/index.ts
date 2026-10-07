import type { z } from "zod";
import { addAiCall, type Course, type Material } from "@/lib/db/queries";
import {
  FeedbackSchema,
  HomeworkResultsSchema,
  LessonReviewSchema,
  LessonsBatchSchema,
  type ArtifactKind,
  type Feedback,
  type HomeworkResults,
  type LessonContent,
  type LessonReview,
} from "@/lib/lessons/types";
import { reviewLessonsPrompt } from "@/lib/prompts/review-lessons";
import { EXTRACT_MATERIAL_PROMPT } from "@/lib/prompts/extract-material";
import { generateLessonsPrompt } from "@/lib/prompts/generate-lessons";
import { generateArtifactPrompt } from "@/lib/prompts/generate-artifact";
import { evaluatePrompt, reevaluatePrompt, type CalibrationSample } from "@/lib/prompts/evaluate";
import { checkHomeworkPrompt } from "@/lib/prompts/check-homework";
import { CHAT_PROMPT } from "@/lib/prompts/chat";
import { demo } from "./demo";
import { estimateCostUsd, resolveProviderName, type AiProvider, type AiRequest, type AiResult } from "./provider";
import { anthropicProvider } from "./providers/anthropic";
import { openAiCompatibleProvider } from "./providers/openai-compatible";

export { AiRefusedError, AiTruncatedError } from "./provider";

/** Единственная точка входа в модель. Ключи только на сервере. Каждый вызов пишется в ai_calls. */

export function isDemoMode(): boolean {
  return resolveProviderName() === "demo";
}

export function providerLabel(): string {
  const name = resolveProviderName();
  if (name === "demo") return "демо";
  const p = getProvider();
  return `${name === "anthropic" ? "Anthropic" : "OpenAI-совместимый"} · ${p.model}`;
}

function getProvider(): AiProvider {
  return resolveProviderName() === "openai" ? openAiCompatibleProvider() : anthropicProvider();
}

export interface CallContext {
  userId: string;
  courseId?: string;
}

type Kind = "extract" | "lessons" | "artifact" | "evaluate" | "homework" | "chat" | "review";

async function complete(kind: Kind, ctx: CallContext, req: AiRequest): Promise<AiResult> {
  const provider = getProvider();
  const started = Date.now();
  const result = await provider.complete(req);
  console.info(
    `[ai] ${kind} ${result.provider}/${result.model} in=${result.usage.inputTokens} cache_w=${result.usage.cacheWriteTokens} cache_r=${result.usage.cacheReadTokens} out=${result.usage.outputTokens} ${Date.now() - started}ms`,
  );
  await addAiCall({
    courseId: ctx.courseId ?? null,
    userId: ctx.userId,
    kind,
    provider: result.provider,
    model: result.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cacheReadTokens: result.usage.cacheReadTokens,
    cacheWriteTokens: result.usage.cacheWriteTokens,
    costUsd: estimateCostUsd(result.usage),
    durationMs: Date.now() - started,
  });
  return result;
}

async function completeJson<T extends z.ZodTypeAny>(kind: Kind, ctx: CallContext, schema: T, req: Omit<AiRequest, "jsonSchema">): Promise<z.infer<T>> {
  const result = await complete(kind, ctx, { ...req, jsonSchema: schema });
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.text);
  } catch {
    throw new Error("Модель вернула не JSON. Попробуй ещё раз или уменьши объём.");
  }
  return schema.parse(parsed);
}

/** Материалы курса одним блоком. Стабильный префикс для кэша. */
export function materialsBlock(materials: Material[]): string {
  if (materials.length === 0) return "<materials>Материалы курса не загружены.</materials>";
  const parts = materials.map((m) => `<material name="${m.filename.replace(/"/g, "'")}">\n${m.content_text}\n</material>`);
  return `<materials>\n${parts.join("\n\n")}\n</materials>`;
}

// ---------- публичные функции ----------

export async function extractMaterialText(ctx: CallContext, file: { name: string; mime: string; bytes: Buffer }): Promise<string> {
  const isPdf = file.mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return file.bytes.toString("utf8");
  if (isDemoMode()) return demo.extractedPdf(file.name);
  const result = await complete("extract", ctx, {
    task: EXTRACT_MATERIAL_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "pdf", filename: file.name, base64: file.bytes.toString("base64") },
          { type: "text", text: `Файл: ${file.name}. Перепиши содержимое в Markdown.` },
        ],
      },
    ],
    maxTokens: 64000,
    effort: "low",
  });
  return result.text;
}

export async function generateLessons(
  ctx: CallContext,
  course: Course,
  materials: Material[],
  opts: { count: number; existingTitles: string[] },
): Promise<LessonContent[]> {
  if (isDemoMode()) return demo.lessons(course, opts.count);
  const result = await completeJson("lessons", ctx, LessonsBatchSchema, {
    task: generateLessonsPrompt({
      courseTitle: course.title,
      courseDescription: course.description,
      audience: course.audience,
      outcomes: course.outcomes,
      tone: course.tone,
      count: opts.count,
      existingTitles: opts.existingTitles,
    }),
    materials: materialsBlock(materials),
    messages: [{ role: "user", content: `Собери ${opts.count} уроков по материалам курса.` }],
    maxTokens: 32000,
    effort: "high",
  });
  return result.lessons;
}

/** Второй проход: методист-ревьюер сверяет уроки с материалами и правит их. */
export async function reviewLessons(ctx: CallContext, course: Course, materials: Material[], lessons: LessonContent[]): Promise<LessonReview> {
  if (isDemoMode()) return demo.review(lessons);
  const result = await completeJson("review", ctx, LessonReviewSchema, {
    task: reviewLessonsPrompt({ courseTitle: course.title, audience: course.audience, outcomes: course.outcomes, tone: course.tone, lessons }),
    materials: materialsBlock(materials),
    messages: [{ role: "user", content: `Проверь ${lessons.length} уроков и верни исправленные.` }],
    maxTokens: 32000,
    effort: "high",
  });
  if (result.lessons.length !== lessons.length) throw new Error("Ревьюер вернул другое количество уроков. Попробуй ещё раз.");
  return result;
}

export async function generateArtifact(
  ctx: CallContext,
  course: Course,
  materials: Material[],
  opts: { kind: ArtifactKind; instructions: string },
): Promise<string> {
  if (isDemoMode()) return demo.artifact(opts.kind, course);
  const result = await complete("artifact", ctx, {
    task: generateArtifactPrompt({ kind: opts.kind, courseTitle: course.title, audience: course.audience, instructions: opts.instructions }),
    materials: materialsBlock(materials),
    messages: [{ role: "user", content: "Составь по материалам курса." }],
    maxTokens: 16000,
    effort: "high",
  });
  return result.text;
}

export async function evaluateAnswer(
  ctx: CallContext,
  lesson: LessonContent,
  answer: string,
  opts: { tone: Course["tone"]; samples: CalibrationSample[] },
): Promise<Feedback> {
  if (isDemoMode()) return demo.feedback(lesson, answer);
  return completeJson("evaluate", ctx, FeedbackSchema, {
    task: evaluatePrompt(lesson, answer, opts),
    messages: [{ role: "user", content: "Оцени ответ по критериям." }],
    maxTokens: 8000,
    effort: "medium",
  });
}

/** Переоценка после возражения студента. */
export async function reevaluateAnswer(
  ctx: CallContext,
  lesson: LessonContent,
  answer: string,
  previous: Feedback,
  objection: string,
  opts: { tone: Course["tone"] },
): Promise<Feedback> {
  if (isDemoMode()) {
    const f = demo.feedback(lesson, answer);
    return { ...f, summary: `Демо-режим: возражение получено («${objection.slice(0, 60)}…»). В реальном режиме ментор пересмотрит оценку.` };
  }
  return completeJson("evaluate", ctx, FeedbackSchema, {
    task: reevaluatePrompt(lesson, answer, previous.summary, previous.score, objection, opts),
    messages: [{ role: "user", content: "Пересмотри оценку с учётом возражения." }],
    maxTokens: 8000,
    effort: "medium",
  });
}

export async function checkHomework(
  ctx: CallContext,
  materials: Material[],
  opts: { task: string; criteria: string; submissions: { student: string; answer: string }[] },
): Promise<HomeworkResults> {
  if (isDemoMode()) return demo.homework(opts.submissions);
  return completeJson("homework", ctx, HomeworkResultsSchema, {
    task: checkHomeworkPrompt(opts),
    materials: materialsBlock(materials),
    messages: [{ role: "user", content: `Проверь ${opts.submissions.length} работ.` }],
    maxTokens: 32000,
    effort: "high",
  });
}

export async function chatWithMaterials(
  ctx: CallContext,
  materials: Material[],
  history: { role: "user" | "assistant"; content: string }[],
  question: string,
): Promise<string> {
  if (isDemoMode()) return demo.chat(question, materials);
  const result = await complete("chat", ctx, {
    task: CHAT_PROMPT,
    materials: materialsBlock(materials),
    messages: [...history, { role: "user", content: question }],
    maxTokens: 8000,
    effort: "medium",
  });
  return result.text;
}
