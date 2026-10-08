import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listConsents, listOwnedCoursesWithStudents } from "@/lib/db/queries";
import { deleteAccountAction, setMarketingConsentAction } from "@/lib/actions/account";
import { CONSENT_VERSION } from "@/lib/legal/versions";
import { AppShell } from "@/components/shared/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format";
import { plural } from "@/lib/utils/format";

const ERRORS: Record<string, string> = {
  confirm: "Почта не совпадает. Введите адрес, под которым вы вошли.",
  courses: "Пока на ваших курсах есть студенты, удалить аккаунт нельзя: пропали бы их ответы. Напишите нам, решим вручную.",
  delete: "Не удалось удалить аккаунт. Попробуйте ещё раз через минуту или напишите нам.",
};

const KIND_LABELS = {
  processing: "Обработка данных для работы сервиса",
  terms: "Пользовательское соглашение",
  marketing: "Письма о программах To Dual",
} as const;

/** «Мои данные»: что храним, согласия, выгрузка в JSON и удаление аккаунта (ст. 14 152-ФЗ).
 *  Открыта и без действующего согласия, чтобы человек мог отозвать его и удалить аккаунт. */
export default async function MyDataPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [consents, blockingCourses] = await Promise.all([listConsents(user.id), listOwnedCoursesWithStudents(user.id)]);
  const marketingOn = consents.some((c) => c.kind === "marketing" && c.withdrawn_at === null && c.version === CONSENT_VERSION.marketing);

  return (
    <AppShell user={user} requireConsent={false}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Мои данные</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Мы храним вашу почту, имя, роль, ответы на задачи с разборами, карточки для повторения и записи на курсы.
            Если вы преподаватель, ещё храним материалы, уроки, документы, вопросы по материалам и проверки работ. Подробнее в{" "}
            <Link href="/legal/privacy" className="underline hover:text-foreground">Политике</Link>.
          </p>
        </div>
        {sp.error ? <p className="text-sm text-destructive">{ERRORS[sp.error] ?? ERRORS.delete}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Скачать мои данные</CardTitle>
            <CardDescription>Файл JSON со всеми вашими записями. Ответы студентов на ваших курсах в него не входят: это их данные.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<a href="/account/data/export" download />} variant="outline">Скачать JSON</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Согласия</CardTitle>
            <CardDescription>Что вы приняли и когда. Тексты: <Link href="/legal/consent" className="underline hover:text-foreground">Согласие</Link>, <Link href="/legal/terms" className="underline hover:text-foreground">Соглашение</Link>.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {consents.length === 0 ? <p className="text-sm text-muted-foreground">Записей о согласии нет.</p> : (
              <ul className="space-y-1 text-sm">
                {consents.map((c) => (
                  <li key={c.id} className="flex flex-wrap justify-between gap-2">
                    <span>{KIND_LABELS[c.kind]} <span className="text-muted-foreground">· версия {c.version}</span></span>
                    <span className="text-muted-foreground">{c.withdrawn_at ? `отозвано ${formatDateTime(c.withdrawn_at)}` : `принято ${formatDateTime(c.accepted_at)}`}</span>
                  </li>
                ))}
              </ul>
            )}
            <form action={setMarketingConsentAction} className="flex items-center justify-between gap-3 border-t pt-4 text-sm">
              <span>Письма о программах To Dual: {marketingOn ? "включены" : "выключены"}</span>
              <input type="hidden" name="enabled" value={marketingOn ? "0" : "1"} />
              <Button type="submit" variant="outline" size="sm">{marketingOn ? "Отозвать согласие" : "Дать согласие"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Удалить аккаунт</CardTitle>
            <CardDescription>
              Вместе с аккаунтом вы отзовёте согласие на обработку данных. Из рабочей базы сразу пропадут профиль, ответы, карточки, записи на курсы
              {user.role === "teacher" || blockingCourses.length > 0 ? ", а также ваши курсы без студентов вместе с материалами и уроками" : ""}.
              Из резервных копий данные исчезнут, когда копии обновятся.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blockingCourses.length > 0 ? (
              <div className="space-y-3 text-sm">
                <p>Пока на ваших курсах есть студенты, удалить аккаунт нельзя: вместе с курсом пропали бы их ответы.</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {blockingCourses.map((c) => <li key={c.id}>{c.title}: {plural(c.students, "студент", "студента", "студентов")}</li>)}
                </ul>
                <p className="text-muted-foreground">Отчислить студентов или передать курс другому преподавателю в интерфейсе пока нельзя. Напишите нам, решим вручную.</p>
              </div>
            ) : (
              <form action={deleteAccountAction} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="confirm">Для подтверждения введите вашу почту: {user.email}</Label>
                  <Input id="confirm" name="confirm" type="email" required autoComplete="off" placeholder={user.email} />
                </div>
                <Button type="submit" variant="destructive">Отозвать согласие и удалить аккаунт</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
