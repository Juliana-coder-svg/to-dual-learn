"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CardData { id: string; course: string; question: string; answer: string; takeaway: string }

export function FlashcardReview({ cards }: { cards: CardData[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">На сегодня повторять нечего.</p>
        <Button nativeButton={false} render={<Link href="/learn" />} variant="outline" className="mt-4">К курсам</Button>
      </div>
    );
  }
  if (index >= cards.length) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-lg font-medium">Готово: {cards.length} из {cards.length}</p>
        <Button nativeButton={false} render={<Link href="/learn" />} className="mt-4">К курсам</Button>
      </div>
    );
  }

  const card = cards[index];

  async function rate(quality: "forgot" | "vague" | "remembered") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, quality }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Не удалось сохранить");
      setRevealed(false);
      setIndex((i) => i + 1);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="text-xs text-muted-foreground">{index + 1} из {cards.length} · {card.course}</div>
      <div className="mt-3 rounded-md border p-6">
        <p className="text-lg leading-relaxed">{card.question}</p>
        {revealed ? (
          <div className="mt-6 border-t pt-6">
            <p className="leading-relaxed">{card.answer}</p>
            <p className="mt-3 text-sm text-muted-foreground">{card.takeaway}</p>
          </div>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {!revealed ? (
          <Button size="lg" onClick={() => setRevealed(true)}>Показать ответ</Button>
        ) : (
          <>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => rate("forgot")}>Не помню</Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => rate("vague")}>Смутно</Button>
            <Button size="lg" disabled={busy} onClick={() => rate("remembered")}>Помню</Button>
          </>
        )}
      </div>
    </div>
  );
}
