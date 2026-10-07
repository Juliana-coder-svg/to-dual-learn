"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/shared/Markdown";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/lessons/types";

export function ArtifactGenerator({ courseId, disabled }: { courseId: string; disabled: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<ArtifactKind>("assignment");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, kind, instructions }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; output?: string };
      if (!res.ok || !data.ok || !data.output) throw new Error(data.error ?? "Не удалось сгенерировать");
      setResult(data.output);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Что собрать</CardTitle>
          <CardDescription>По материалам курса. Результат можно скопировать в любой формат.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Тип</Label>
            <div className="grid gap-1">
              {(Object.keys(ARTIFACT_KINDS) as ArtifactKind[]).map((k) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary">
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                  {ARTIFACT_KINDS[k]}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Пожелания</Label>
            <Textarea id="instructions" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Тема и что обязательно включить" />
          </div>
          <Button onClick={generate} disabled={busy || disabled} className="w-full">{busy ? "Генерирую…" : "Сгенерировать"}</Button>
          {disabled ? <p className="text-xs text-muted-foreground">Сначала загрузи материалы.</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
      <div className="min-h-40 rounded-md border p-5">
        {result ? (
          <>
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(result)}>Скопировать</Button>
            </div>
            <Markdown text={result} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{busy ? "Модель читает материалы и собирает документ…" : "Здесь появится результат."}</p>
        )}
      </div>
    </div>
  );
}
