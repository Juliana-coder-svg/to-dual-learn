import { requireUser, requireUserId } from "@/lib/auth/session";
import { listDueFlashcards } from "@/lib/db/queries";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { FlashcardReview } from "@/components/learn/FlashcardReview";

export default async function ReviewPage() {
  const userId = await requireUserId();
  const [user, due] = await Promise.all([requireUser(), listDueFlashcards(userId)]);

  return (
    <AppShell user={user} width="narrow">
      <PageHeader title="Повторение" description="Карточки возвращаются через 1, 2, 7, 14 и 30 дней в зависимости от того, как вы их помните." />
      <div className="mt-8">
        <FlashcardReview cards={due.map((d) => ({ id: d.id, course: d.course_title, question: (d.lesson.content.flashcards[d.card_index] ?? d.lesson.content.flashcards[0]).question, answer: (d.lesson.content.flashcards[d.card_index] ?? d.lesson.content.flashcards[0]).answer, takeaway: d.lesson.content.keyTakeaway }))} />
      </div>
    </AppShell>
  );
}
