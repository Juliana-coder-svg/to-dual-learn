import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import type { Course, Material } from "@/lib/db/queries";
import {
  FeedbackSchema,
  HomeworkResultsSchema,
  LessonsBatchSchema,
  type ArtifactKind,
  type Feedback,
  type HomeworkResults,
  type LessonContent,
} from "@/lib/lessons/types";
import { SYSTEM_PROMPT } from "@/lib/prompts/system";
import { EXTRACT_MATERIAL_PROMPT } from "@/lib/prompts/extract-material";
import { generateLessonsPrompt } from "@/lib/prompts/generate-lessons";
import { generateArtifactPrompt } from "@/lib/prompts/generate-artifact";
import { evaluatePrompt } from "@/lib/prompts/evaluate";
import { checkHomeworkPrompt } from "@/lib/prompts/check-homework";
import { CHAT_PROMPT } from "@/lib/prompts/chat";
import { demo } from "./demo";

/** Единственная точка входа в Claude API. Ключ только на сервере (ANTHROPIC_API_KEY). */

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
const FALLBACK_MODEL = "claude-opus-4-8";

export function isDemoMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}

const globalForClient = globalThis as unknown as { __anthropic?: Anthropic };
function client(): Anthropic {
  if (!globalForClient.__anthropic) globalForClient.__anthropic = new Anthropic();
  return globalForClient.__anthropic;
}

export class AiRefusedError extends Error {
  constructor(explanation: string) {
    super(`Модель отказалась выполнять запрос: ${explanation}`);
    this.name = "AiRefusedError";
  }
}

type Effort = "low" | "medium" | "high";

/** Материалы курса одним блоком. Идёт в system с cache_control: один и тот же префикс
 *  для всех запросов по курсу, так что повторные вызовы читают его из кэша. */
export function materialsBlock(materials: Material[]): string {
  if (materials.length === 0) return "<materials>Материалы курса не загружены.</materials>";
  const parts = materials.map(
    (m) => `<material name="${m.filename.replace(/"/g, "'")}">\n${m.content_text}\n</material>`,
  );
  return `<materials>\n${parts.join("\n\n")}\n</materials>`;
}

interface CompleteOptions {
  task: string;
  materials?: Material[];
  messages: Anthropic.Beta.BetaMessageParam[];
  maxTokens: number;
  effort: Effort;
  format?: ReturnType<typeof zodOutputFormat>;
}

async function complete(opts: CompleteOptions): Promise<Anthropic.Beta.BetaMessage> {
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: `${SYSTEM_PROMPT}\n\n${opts.task}` },
  ];
  if (opts.materials) {
    system.push({
      type: "text",
      text: materialsBlock(opts.materials),
      cache_control: { type: "ephemeral" },
    });
  }
  const stream = client().beta.messages.stream({
    model: MODEL,
    max_tokens: opts.maxTokens,
    system,
    messages: opts.messages,
    output_config: { effort: opts.effort, ...(opts.format ? { format: opts.format } : {}) },
    betas: ["server-side-fallback-2026-06-01"],
    fallbacks: [{ model: FALLBACK_MODEL }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new AiRefusedError(message.stop_details?.explanation ?? "без объяснения");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Ответ модели оборван по лимиту токенов. Попробуй меньший объём.");
  }
  return message;
}

function textOf(message: Anthropic.Beta.BetaMessage): string {
  return message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

async function completeJson<T extends z.ZodTypeAny>(
  schema: T,
  opts: Omit<CompleteOptions, "format">,
): Promise<z.infer<T>> {
  const message = await complete({ ...opts, format: zodOutputFormat(schema) });
  return schema.parse(JSON.parse(textOf(message)));
}

// ---------- публичные функции ----------

export async function extractMaterialText(file: {
  name: string;
  mime: string;
  bytes: Buffer;
}): Promise<string> {
  const isPdf = file.mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return file.bytes.toString("utf8");
  if (isDemoMode()) return demo.extractedPdf(file.name);

  const message = await complete({
    task: EXTRACT_MATERIAL_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: file.bytes.toString("base64") },
          },
          { type: "text", text: `Файл: ${file.name}. Перепиши содержимое в Markdown.` },
        ],
      },
    ],
    maxTokens: 64000,
    effort: "low",
  });
  return textOf(message);
}

export async function generateLessons(
  course: Course,
  materials: Material[],
  opts: { count: number; existingTitles: string[] },
): Promise<LessonContent[]> {
  if (isDemoMode()) return demo.lessons(course, opts.count);
  const result = await completeJson(LessonsBatchSchema, {
    task: generateLessonsPrompt({
      courseTitle: course.title,
      courseDescription: course.description,
      audience: course.audience,
      count: opts.count,
      existingTitles: opts.existingTitles,
    }),
    materials,
    messages: [{ role: "user", content: `Собери ${opts.count} уроков по материалам курса.` }],
    maxTokens: 32000,
    effort: "high",
  });
  return result.lessons;
}

export async function generateArtifact(
  course: Course,
  materials: Material[],
  opts: { kind: ArtifactKind; instructions: string },
): Promise<string> {
  if (isDemoMode()) return demo.artifact(opts.kind, course);
  const message = await complete({
    task: generateArtifactPrompt({
      kind: opts.kind,
      courseTitle: course.title,
      audience: course.audience,
      instructions: opts.instructions,
    }),
    materials,
    messages: [{ role: "user", content: "Составь по материалам курса." }],
    maxTokens: 16000,
    effort: "high",
  });
  return textOf(message);
}

export async function evaluateAnswer(lesson: LessonContent, answer: string): Promise<Feedback> {
  if (isDemoMode()) return demo.feedback(lesson, answer);
  return completeJson(FeedbackSchema, {
    task: evaluatePrompt(lesson, answer),
    messages: [{ role: "user", content: "Оцени ответ по критериям." }],
    maxTokens: 8000,
    effort: "medium",
  });
}

export async function checkHomework(
  materials: Material[],
  opts: { task: string; criteria: string; submissions: { student: string; answer: string }[] },
): Promise<HomeworkResults> {
  if (isDemoMode()) return demo.homework(opts.submissions);
  return completeJson(HomeworkResultsSchema, {
    task: checkHomeworkPrompt(opts),
    materials,
    messages: [{ role: "user", content: `Проверь ${opts.submissions.length} работ.` }],
    maxTokens: 32000,
    effort: "high",
  });
}

export async function chatWithMaterials(
  materials: Material[],
  history: { role: "user" | "assistant"; content: string }[],
  question: string,
): Promise<string> {
  if (isDemoMode()) return demo.chat(question, materials);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];
  const message = await complete({
    task: CHAT_PROMPT,
    materials,
    messages,
    maxTokens: 8000,
    effort: "medium",
  });
  return textOf(message);
}
