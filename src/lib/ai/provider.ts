import type { z } from "zod";

/** Общий контракт провайдера модели. Два провайдера: Anthropic напрямую и любой
 *  OpenAI-совместимый эндпоинт (OpenRouter, GigaChat, Qwen во внутреннем контуре). */

export type Effort = "low" | "medium" | "high";

export type AiContentPart =
  | { type: "text"; text: string }
  | { type: "pdf"; filename: string; base64: string };

export interface AiMessage {
  role: "user" | "assistant";
  content: string | AiContentPart[];
}

export interface AiRequest {
  /** Инструкция к задаче, идёт после общего системного промпта. */
  task: string;
  /** Блок материалов курса. Стабильный префикс, кэшируется у провайдеров, которые это умеют. */
  materials?: string;
  messages: AiMessage[];
  maxTokens: number;
  effort: Effort;
  /** Если задана, ответ должен быть JSON по этой схеме. */
  jsonSchema?: z.ZodTypeAny;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AiResult {
  text: string;
  usage: AiUsage;
  model: string;
  provider: ProviderName;
}

export type ProviderName = "anthropic" | "openai" | "demo";

export interface AiProvider {
  name: ProviderName;
  model: string;
  complete(req: AiRequest): Promise<AiResult>;
}

export class AiRefusedError extends Error {
  constructor(explanation: string) {
    super(`Модель отказалась выполнять запрос: ${explanation}`);
    this.name = "AiRefusedError";
  }
}

export class AiTruncatedError extends Error {
  constructor() {
    super("Ответ модели оборван по лимиту токенов. Попробуй меньший объём.");
    this.name = "AiTruncatedError";
  }
}

/** Цены за миллион токенов в долларах. По умолчанию — Claude Opus 5.5 на Anthropic API.
 *  Для других моделей задаются через AI_PRICE_INPUT_PER_M / AI_PRICE_OUTPUT_PER_M. */
export function pricing(): { input: number; output: number; cacheRead: number; cacheWrite: number } {
  const input = Number(process.env.AI_PRICE_INPUT_PER_M ?? 4);
  const output = Number(process.env.AI_PRICE_OUTPUT_PER_M ?? 20);
  return { input, output, cacheRead: Number(process.env.AI_PRICE_CACHE_READ_PER_M ?? input * 0.05), cacheWrite: input * 1.25 };
}

export function estimateCostUsd(u: AiUsage): number {
  const p = pricing();
  return (
    (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.cacheWrite) /
    1_000_000
  );
}

export function resolveProviderName(): ProviderName {
  const forced = process.env.AI_PROVIDER;
  if (forced === "anthropic" || forced === "openai" || forced === "demo") return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_COMPAT_API_KEY) return "openai";
  return "demo";
}
