import Link from "next/link";
import { requireUser, requireUserId } from "@/lib/auth/session";
import { listCourseSummariesByOwner } from "@/lib/db/queries";
import { teacherSteps } from "@/lib/onboarding/teacher-steps";
import { AppShell } from "@/components/shared/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { StartSteps } from "@/components/onboarding/StartSteps";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Как это работает" };

/** Постоянная страница «Как это работает»: те же три шага, что на панели /teach, и ответ на вопрос «что увидит студент». */
export default async function TeachStartPage() {
  const userId = await requireUserId();
  const [user, cards] = await Promise.all([requireUser(), listCourseSummariesByOwner(userId)]);
  const steps = teacherSteps(cards);

  return (
    <AppShell user={user}>
      <PageHeader
        back={{ href: "/teach", label: "Мои курсы" }}
        title="Как это работает"
        description="Вы загружаете материалы, из них собираются короткие уроки, студенты проходят по одному в день. Шаги отмечаются сами, когда в курсе появляются данные."
      />
      <StartSteps steps={steps} className="mt-8" />
      <section className="mt-12 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="type-heading">Что увидит студент</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 type-body">
            <li>Откроет вашу ссылку и войдёт через Яндекс ID или по почте. Пароль не нужен.</li>
            <li>Увидит курс в своём списке и первый урок: идея, задача, разбор наставника.</li>
            <li>Завтра получит следующий урок и карточки для повторения. Один урок в день, около 5 минут.</li>
          </ol>
        </div>
        <div>
          <h2 className="type-heading">Учитесь сами?</h2>
          <p className="mt-4 type-body text-muted-foreground">
            Загрузите конспект, соберите уроки и откройте курс в режиме студента: кнопка «Режим студента» в шапке. Курсы и ответы сохранятся, переключаться можно сколько угодно.
          </p>
        </div>
      </section>
      <div className="mt-10">
        <Button nativeButton={false} render={<Link href="/teach" />}>К моим курсам</Button>
      </div>
    </AppShell>
  );
}
