"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HomeworkResultsView } from "./HomeworkResultsView";
import type { HomeworkResults } from "@/lib/lessons/types";

const EXAMPLE = `## Иван Петров
Текст работы Ивана…

## Мария Сидорова
Текст работы Марии…`;

export function HomeworkChecker({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [task, setTask] = useState("");
  const [criteria, setCriteria] = useState("");
  const [works, setWorks] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<HomeworkResults | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, task, criteria, works }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; results?: HomeworkResults };
      if (!res.ok || !data.ok || !data.results) throw new Error(data.error ?? "Не удалось проверить");
      setResults(data.results);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Проверка домашних работ</CardTitle>
          <CardDescription>Задание, критерии и работы. Модель пройдёт по критериям, поставит балл и напишет фидбек каждому. Сводка по группе — отдельно.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={check} className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task">Задание</Label>
                <Textarea id="task" rows={4} required value={task} onChange={(e) => setTask(e.target.value)} placeholder="Что нужно было сделать" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criteria">Критерии проверки</Label>
                <Textarea id="criteria" rows={5} required value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder={"1. Есть обоснование выбора\n2. Приведён пример из практики\n3. …"} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="works">Работы студентов</Label>
              <Textarea id="works" rows={12} required value={works} onChange={(e) => setWorks(e.target.value)} placeholder={EXAMPLE} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Каждая работа начинается со строки <code>## Имя студента</code>.</p>
            </div>
            <div className="lg:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? "Проверяю…" : "Проверить"}</Button>
              {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
            </div>
          </form>
        </CardContent>
      </Card>
      {results ? <HomeworkResultsView results={results} /> : null}
    </div>
  );
}
