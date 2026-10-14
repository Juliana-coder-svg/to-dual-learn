"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Копирование одним нажатием. Если браузер не дал доступ к буферу, выделяем текст в поле рядом: так его можно скопировать вручную. */
export function CopyButton({ text, label, doneLabel = "Скопировано", variant = "default", fieldId }: { text: string; label: string; doneLabel?: string; variant?: "default" | "outline"; fieldId?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      const field = fieldId ? (document.getElementById(fieldId) as HTMLTextAreaElement | HTMLInputElement | null) : null;
      field?.focus();
      field?.select();
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <span className="inline-flex items-center gap-3">
      <Button type="button" variant={variant} onClick={copy}>{state === "done" ? doneLabel : label}</Button>
      <span role="status" className="text-sm text-muted-foreground">{state === "failed" ? "Не получилось скопировать. Текст выделен, нажмите Ctrl+C." : ""}</span>
    </span>
  );
}
