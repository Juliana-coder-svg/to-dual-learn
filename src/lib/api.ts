import { NextResponse } from "next/server";
import { AiRefusedError } from "@/lib/ai";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/** Общая обработка ошибок AI-маршрутов: отказ модели — 422, остальное — 500 с текстом. */
export function handleRouteError(e: unknown): NextResponse {
  if (e instanceof AiRefusedError) return jsonError(e.message, 422);
  const message = e instanceof Error ? e.message : "Неизвестная ошибка";
  console.error("[api]", e);
  return jsonError(message, 500);
}
