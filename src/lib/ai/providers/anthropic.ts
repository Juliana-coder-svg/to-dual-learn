import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SYSTEM_PROMPT } from "@/lib/prompts/system";
import { AiRefusedError, AiTruncatedError, type AiProvider, type AiRequest, type AiResult } from "../provider";

const FALLBACK_MODEL = "claude-opus-4-8";

const globalForClient = globalThis as unknown as { __anthropic?: Anthropic };
function client(): Anthropic {
  if (!globalForClient.__anthropic) globalForClient.__anthropic = new Anthropic();
  return globalForClient.__anthropic;
}

function toBlocks(content: AiRequest["messages"][number]["content"]): Anthropic.Beta.BetaMessageParam["content"] {
  if (typeof content === "string") return content;
  return content.map((p) =>
    p.type === "text"
      ? ({ type: "text", text: p.text } satisfies Anthropic.Beta.BetaTextBlockParam)
      : ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: p.base64 },
        } satisfies Anthropic.Beta.BetaRequestDocumentBlock),
  );
}

export function anthropicProvider(): AiProvider {
  const model = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
  return {
    name: "anthropic",
    model,
    async complete(req: AiRequest): Promise<AiResult> {
      // Порядок важен для кэша: кэш префиксный, поэтому стабильные блоки (общая инструкция, материалы курса)
      // идут первыми с точками кэша, а текст конкретной задачи — после них.
      const system: Anthropic.Beta.BetaTextBlockParam[] = [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ];
      if (req.materials) system.push({ type: "text", text: req.materials, cache_control: { type: "ephemeral" } });
      system.push({ type: "text", text: req.task });
      const stream = client().beta.messages.stream({
        model,
        max_tokens: req.maxTokens,
        system,
        messages: req.messages.map((m) => ({ role: m.role, content: toBlocks(m.content) })),
        output_config: { effort: req.effort, ...(req.jsonSchema ? { format: zodOutputFormat(req.jsonSchema) } : {}) },
        betas: ["server-side-fallback-2026-06-01"],
        fallbacks: [{ model: FALLBACK_MODEL }],
      });
      const message = await stream.finalMessage();
      if (message.stop_reason === "refusal") throw new AiRefusedError(message.stop_details?.explanation ?? "без объяснения");
      if (message.stop_reason === "max_tokens") throw new AiTruncatedError();
      const text = message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      return {
        text,
        model: message.model,
        provider: "anthropic",
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: message.usage.cache_creation_input_tokens ?? 0,
        },
      };
    },
  };
}
