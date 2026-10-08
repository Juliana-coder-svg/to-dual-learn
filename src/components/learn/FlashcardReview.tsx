"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Notice } from "@/components/shared/Notice";

interface CardData { id: string; course: string; question: string; answer: string; takeaway: string }

export function FlashcardReview({ cards }: { cards: CardData[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <EmptyState
        title="На сегодня повторять нечего"
        description="Карточки появятся после первого урока и будут возвращаться по расписанию."
        action={<Button nativeButton={false} render={<Link href="/learn" />} variant="outline">К курсам</Button>}
      />
    );
  }
  if (index >= cards.length) {
    return (
      <div className="callout flex flex-col items-center gap-3 py-10 text-center">
        <div className="callout-label">Готово</div>
        <p className="type-heading">{cards.length} из {cards.length} карточек повторено</p>
        <p className="text-sm text-muted-foreground">Следующие вернутся по расписанию: через день, неделю или месяц.</p>
        <Button nativeButton={false} render={<Link href="/learn" />} className="mt-2">К курсам</Button>
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
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">{index + 1} из {cards.length} · {card.course}</p>
        <ol aria-hidden className="flex gap-1">
          {cards.map((c, i) => <li key={c.id} className={`h-1.5 w-5 rounded-full ${i < index ? "bg-primary" : i === index ? "bg-primary/50" : "bg-muted"}`} />)}
        </ol>
      </div>
      <div className="mt-4 rounded-lg border p-6 md:p-8">
        <p className="eyebrow">Вопрос</p>
        <p className="mt-2 text-balance type-heading md:text-2xl">{card.question}</p>
        {revealed ? (
          <div className="mt-6 border-t pt-6">
            <p className="eyebrow text-primary-strong">Ответ</p>
            <p className="mt-2 type-body">{card.answer}</p>
            <p className="mt-4 text-sm text-muted-foreground">{card.takeaway}</p>
          </div>
        ) : null}
      </div>
      {error ? <Notice kind="error" className="mt-3">{error}</Notice> : null}
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        {!revealed ? (
          <Button size="lg" onClick={() => setRevealed(true)} className="sm:min-w-48">Показать ответ</Button>
        ) : (
          <>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => rate("forgot")}>Не помню</Button>
            <Button size="lg" variant="outline" disabled={busy} onClick={() => rate("vague")}>Смутно</Button>
            <Button size="lg" disabled={busy} onClick={() => rate("remembered")}>Помню</Button>
          </>
        )}
      </div>
      {revealed ? <p className="mt-3 type-caption text-muted-foreground">«Не помню» вернёт карточку завтра, «Помню» отложит её на неделю и дальше.</p> : null}
    </div>
  );
}
