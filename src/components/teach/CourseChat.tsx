"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/shared/Markdown";

interface Msg { id: string; role: "user" | "assistant"; content: string }

export function CourseChat({ courseId, initial }: { courseId: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, role: "user", content: question }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, message: question }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; reply?: string; id?: string };
      if (!res.ok || !data.ok || !data.reply) throw new Error(data.error ?? "Ошибка ответа");
      setMessages((m) => [...m, { id: data.id ?? `a-${Date.now()}`, role: "assistant", content: data.reply! }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="min-h-64 space-y-4 rounded-md border p-4">
        {messages.length === 0 ? <p className="text-sm text-muted-foreground">Пока пусто. Например: «Какие темы есть в материалах?» или «Составь три вопроса для обсуждения по второму разделу».</p> : null}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-md bg-muted px-4 py-2 text-sm" : "max-w-[95%]"}>
            {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
          </div>
        ))}
        {busy ? <p className="text-sm text-muted-foreground">Читаю материалы…</p> : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form onSubmit={send} className="flex gap-2">
        <Textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e); } }}
          placeholder="Вопрос по материалам… (Enter — отправить, Shift+Enter — перенос)"
        />
        <Button type="submit" disabled={busy || !input.trim()}>Отправить</Button>
      </form>
    </div>
  );
}
