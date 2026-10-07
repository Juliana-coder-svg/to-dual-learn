import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/prompts/system";
import { AiRefusedError, AiTruncatedError, type AiProvider, type AiRequest, type AiResult } from "../provider";

/** OpenAI-совместимый Chat Completions API. Работает с OpenRouter, GigaChat (через их совместимый
 *  шлюз), vLLM с Qwen во внутреннем контуре. Без SDK: один fetch, чтобы не тянуть зависимость. */

interface ChatCompletion {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
  model?: string;
  error?: { message?: string };
}

type Part = { type: "text"; text: string } | { type: "file"; file: { filename: string; file_data: string } };

function toParts(content: AiRequest["messages"][number]["content"]): string | Part[] {
  if (typeof content === "string") return content;
  return content.map((p) =>
    p.type === "text"
      ? { type: "text", text: p.text }
      : { type: "file", file: { filename: p.filename, file_data: `data:application/pdf;base64,${p.base64}` } },
  );
}

export function openAiCompatibleProvider(): AiProvider {
  const baseUrl = (process.env.OPENAI_COMPAT_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_COMPAT_API_KEY ?? "";
  const model = process.env.OPENAI_COMPAT_MODEL ?? "anthropic/claude-opus-5-5";
  return {
    name: "openai",
    model,
    async complete(req: AiRequest): Promise<AiResult> {
      // Тот же порядок, что у Anthropic-провайдера: стабильное первым, задача последней (для кэша на стороне провайдера).
      const systemText = [SYSTEM_PROMPT, req.materials, req.task].filter(Boolean).join("\n\n");
      const messages: { role: string; content: string | Part[] }[] = [
        { role: "system", content: systemText },
        ...req.messages.map((m) => ({ role: m.role, content: toParts(m.content) })),
      ];
      const body: Record<string, unknown> = { model, messages, max_tokens: req.maxTokens };
      if (req.jsonSchema) {
        body.response_format = {
          type: "json_schema",
          json_schema: { name: "result", schema: z.toJSONSchema(req.jsonSchema), strict: false },
        };
      }
      const call = async (b: Record<string, unknown>) => {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
            "X-Title": "To Dual Learn",
          },
          body: JSON.stringify(b),
        });
        const json = (await res.json()) as ChatCompletion;
        if (!res.ok || json.error) throw new Error(`Провайдер ответил ошибкой ${res.status}: ${json.error?.message ?? "без текста"}`);
        return json;
      };
      let json: ChatCompletion;
      try {
        json = await call(body);
      } catch (e) {
        // Не все совместимые эндпоинты знают response_format: повторяем без него, JSON просим промптом.
        if (!req.jsonSchema) throw e;
        const { response_format: _dropped, ...rest } = body;
        void _dropped;
        const plain = { ...rest, messages: [...messages, { role: "system", content: "Ответь строго одним JSON-объектом по схеме из задания, без текста вокруг." }] };
        json = await call(plain);
      }
      const choice = json.choices?.[0];
      if (!choice) throw new Error("Провайдер вернул пустой ответ");
      if (choice.message?.refusal) throw new AiRefusedError(choice.message.refusal);
      if (choice.finish_reason === "length") throw new AiTruncatedError();
      let text = (choice.message?.content ?? "").trim();
      if (req.jsonSchema) {
        const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
        if (fence) text = fence[1].trim();
      }
      return {
        text,
        model: json.model ?? model,
        provider: "openai",
        usage: {
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0,
          cacheReadTokens: json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
          cacheWriteTokens: 0,
        },
      };
    },
  };
}
