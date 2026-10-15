import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserConsented, getCurrentUser } from "@/lib/auth/session";
import { enroll, getCourseByJoinCode, getJoinPreview } from "@/lib/db/queries";
import { MINUTES_PER_LESSON } from "@/lib/invite";
import { PublicShell } from "@/components/shared/PublicShell";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/utils/format";

export const metadata = { title: "Приглашение на курс", robots: { index: false } };

/** Ссылка-приглашение: /join/КОД. Вошедший записывается сразу. Без сессии видит, куда его зовут
 *  (название, автор, число уроков), и кнопкой идёт на вход с возвратом сюда. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const here = `/join/${code}`;
  const user = await getCurrentUser();

  if (!user) {
    const preview = await getJoinPreview(code);
    return (
      <PublicShell>
        <div className="flex flex-1 flex-col justify-center py-12">
          {preview ? (
            <>
              <p className="eyebrow">Приглашение на курс</p>
              <h1 className="mt-3 text-balance type-title">{preview.title}</h1>
              <p className="mt-3 type-body text-muted-foreground">
                {preview.authorName ? `Преподаватель: ${preview.authorName}. ` : ""}
                {preview.lessons > 0
                  ? `${plural(preview.lessons, "урок", "урока", "уроков")}, каждый примерно на ${MINUTES_PER_LESSON} минут.`
                  : "Преподаватель ещё готовит уроки, они появятся в курсе."}
              </p>
              <ol className="mt-6 list-decimal space-y-1 pl-5 type-body">
                <li>Войдите. Пароль не нужен.</li>
                <li>Курс сразу откроется, а в нём первый урок: идея, задача, разбор.</li>
              </ol>
              <div className="mt-8">
                <Button nativeButton={false} render={<Link href={`/login?next=${encodeURIComponent(here)}`} />} size="lg">Войти и записаться</Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="type-title">Курс не найден</h1>
              <p className="mt-3 type-body text-muted-foreground">Ссылка или код неверны. Попросите преподавателя прислать ссылку ещё раз.</p>
              <div className="mt-8">
                <Button nativeButton={false} render={<Link href="/login?role=student" />} size="lg" variant="outline">Войти</Button>
              </div>
            </>
          )}
        </div>
      </PublicShell>
    );
  }

  if (!(await currentUserConsented())) redirect(`/consent?next=${encodeURIComponent(here)}`);
  const course = await getCourseByJoinCode(code);
  if (!course) redirect("/learn?error=code");
  if (course.owner_id !== user.id) await enroll(user.id, course.id);
  redirect(`/learn/${course.id}`);
}
