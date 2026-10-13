"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ReviewButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function review() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/lessons/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }) });
      const data = (await res.json()) as { ok?: boolean; error?: string; summary?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось проверить");
      setMsg(data.summary ?? "Готово");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={review} disabled={busy} variant="outline" size="sm" title="ИИ-методист сверит уроки с материалами и результатами курса и предложит правки. Что принять, решаете вы">
        {busy ? "Проверяю…" : "Проверить методистом"}
      </Button>
      {msg ? <p role="status" className="max-w-xs text-right type-caption text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
