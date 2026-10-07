"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function LessonsGenerator({ courseId, disabled }: { courseId: string; disabled: boolean }) {
  const router = useRouter();
  const [count, setCount] = useState(5);
  const [review, setReview] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, count, review }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; added?: number; reviewSummary?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось собрать уроки");
      setMsg(`Добавлено уроков: ${data.added}. ${data.reviewSummary ?? "Проверь и опубликуй."}`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Собрать уроки</CardTitle>
        <CardDescription>Модель прочитает материалы и соберет из них уроки с задачами и критериями. Это займет 1-3 минуты.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="count">Сколько уроков</Label>
          <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="mt-1" />
          <span>Проверить ревьюером<span className="block text-xs text-muted-foreground">Второй проход, в котором методист сверяет уроки с материалами и правит критерии. Время и расход удваиваются.</span></span>
        </label>
        <Button onClick={generate} disabled={busy || disabled} className="w-full">{busy ? (review ? "Собираю и проверяю…" : "Собираю…") : "Собрать"}</Button>
        {disabled ? <p className="text-xs text-muted-foreground">Сначала загрузи материалы.</p> : null}
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
