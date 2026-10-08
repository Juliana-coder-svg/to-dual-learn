"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MaterialsUploader({ courseId }: { courseId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");

  async function send(form: FormData) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/materials", { method: "POST", body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string; added?: number };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось загрузить");
      setMsg(`Добавлено: ${data.added}`);
      if (fileRef.current) fileRef.current.value = "";
      setPasteText("");
      setPasteTitle("");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return;
    const form = new FormData();
    form.set("courseId", courseId);
    for (const f of Array.from(files)) form.append("files", f);
    await send(form);
  }

  async function uploadText(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pasteText.trim().length < 20) { setMsg("Текст слишком короткий"); return; }
    const form = new FormData();
    form.set("courseId", courseId);
    form.set("title", pasteTitle.trim() || "Вставленный текст");
    form.set("text", pasteText);
    await send(form);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Загрузить файлы</CardTitle>
          <CardDescription>PDF, TXT или MD. Текст из PDF извлекает ИИ, это занимает до минуты.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={uploadFiles} className="space-y-3">
            <Input ref={fileRef} type="file" multiple accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf" />
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Загружаю…" : "Загрузить"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Вставить текст</CardTitle>
          <CardDescription>Программа курса или фрагмент лекции.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={uploadText} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="paste-title">Название</Label>
              <Input id="paste-title" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="Программа курса" />
            </div>
            <Textarea rows={6} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Вставьте текст…" />
            <Button type="submit" variant="outline" disabled={busy} className="w-full">Добавить текст</Button>
          </form>
        </CardContent>
      </Card>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
