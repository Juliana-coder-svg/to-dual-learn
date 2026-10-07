import { requireUser } from "@/lib/auth/session";
import { listDueFlashcards } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { FlashcardReview } from "@/components/learn/FlashcardReview";

export default async function ReviewPage() {
  const user = await requireUser();
  const due = await listDueFlashcards(user.id);

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Повторение</h1>
        <p className="mt-1 text-sm text-muted-foreground">Карточки возвращаются через 1, 2, 7, 14 и 30 дней в зависимости от того, как ты их помнишь.</p>
        <div className="mt-8">
          <FlashcardReview cards={due.map((d) => ({ id: d.id, course: d.course_title, question: (d.lesson.content.flashcards[d.card_index] ?? d.lesson.content.flashcards[0]).question, answer: (d.lesson.content.flashcards[d.card_index] ?? d.lesson.content.flashcards[0]).answer, takeaway: d.lesson.content.keyTakeaway }))} />
        </div>
      </div>
    </AppShell>
  );
}
