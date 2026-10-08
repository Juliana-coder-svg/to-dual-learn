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
    super("Ответ модели оборван по лимиту токенов. Попробуйте меньший объём.");
    this.name = "AiTruncatedError";
  }
}

/** Цены за миллион токенов в долларах по семейству модели, которая реально ответила
 *  (через fallback запрос может уйти на другую модель). Переопределяются через AI_PRICE_INPUT_PER_M / AI_PRICE_OUTPUT_PER_M.
 *  Это оценка: точная сумма — в кабинете поставщика модели. */
export function pricing(model: string): { input: number; output: number; cacheRead: number; cacheWrite: number } {
  const m = model.toLowerCase();
  let input = 4;
  let output = 20;
  if (m.includes("opus-4")) [input, output] = [5, 25];
  else if (m.includes("sonnet")) [input, output] = [2, 10];
  else if (m.includes("haiku")) [input, output] = [1, 5];
  if (process.env.AI_PRICE_INPUT_PER_M) input = Number(process.env.AI_PRICE_INPUT_PER_M);
  if (process.env.AI_PRICE_OUTPUT_PER_M) output = Number(process.env.AI_PRICE_OUTPUT_PER_M);
  return { input, output, cacheRead: Number(process.env.AI_PRICE_CACHE_READ_PER_M ?? input * 0.05), cacheWrite: input * 1.25 };
}

export function estimateCostUsd(u: AiUsage, model: string): number {
  const p = pricing(model);
  return (
    (u.inputTokens * p.input + u.outputTokens * p.output + u.cacheReadTokens * p.cacheRead + u.cacheWriteTokens * p.cacheWrite) /
    1_000_000
  );
}

export function resolveProviderName(): ProviderName {
  const forced = process.env.AI_PROVIDER;
  if (forced === "anthropic" || forced === "openai" || forced === "demo") return forced;
  // ANTHROPIC_AUTH_TOKEN + ANTHROPIC_BASE_URL — путь через OpenRouter с родным Anthropic Messages API.
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "anthropic";
  if (process.env.OPENAI_COMPAT_API_KEY) return "openai";
  return "demo";
}
