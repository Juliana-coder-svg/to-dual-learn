import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { login } from "@/lib/actions/auth";
import { loginMode } from "@/lib/auth/mode";
import { yandexConfig } from "@/lib/auth/yandex";
import { getJoinPreview } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentFields } from "@/components/shared/ConsentFields";
import { YandexLoginButton } from "@/components/shared/YandexLoginButton";
import { PublicShell } from "@/components/shared/PublicShell";
import { RoleChoice } from "@/components/shared/RoleChoice";
import { Notice } from "@/components/shared/Notice";

const ERRORS: Record<string, string> = {
  "1": "Проверьте почту и имя.",
  send: "Не удалось отправить письмо со ссылкой. Попробуйте ещё раз через минуту.",
  email: "На этот адрес письмо не уйдёт. Проверьте, нет ли опечатки.",
  link: "Ссылка не сработала или устарела. Запросите новую.",
  consent: "Отметьте согласие на обработку данных: без него сервис не сможет хранить ваши ответы.",
};

export const metadata = { title: "Вход" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; sent?: string; next?: string; deleted?: string; yandex?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await searchParams;
  // Роль задана ссылкой (?role=…), приглашением на курс (next=/join/КОД) или не задана вовсе:
  // в последнем случае плитки без отметки, и роль существующего профиля остаётся прежней.
  const joinCode = /^\/join\/([A-Za-z0-9]{4,12})(?:[/?#]|$)/.exec(sp.next ?? "")?.[1];
  const invite = joinCode ? await getJoinPreview(joinCode) : undefined;
  const defaultRole = sp.role === "teacher" || sp.role === "student" ? sp.role : undefined;
  const sentQuery = defaultRole ? `?role=${defaultRole}` : "";
  const yandex = yandexConfig() !== null;
  const magic = loginMode() === "magic";

  if (sp.sent) {
    return (
      <PublicShell>
        <div className="flex flex-1 flex-col justify-center py-12">
          <h1 className="type-title">Проверьте почту</h1>
          <p className="mt-3 type-body text-muted-foreground">
            Отправили письмо со ссылкой для входа. Откройте его в этом же браузере и нажмите на ссылку. Ссылка действует час.
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            Письма нет? Проверьте «Спам» или{" "}
            <Link href={`/login${sentQuery}${sentQuery && sp.next ? `&next=${encodeURIComponent(sp.next)}` : sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="text-foreground underline underline-offset-4 hover:text-primary-strong">запросите ссылку ещё раз</Link>.
          </p>
        </div>
      </PublicShell>
    );
  }

  const submitLabel = invite ? (magic ? "Получить ссылку и записаться" : "Записаться на курс") : magic ? "Получить ссылку для входа" : "Войти";

  return (
    <PublicShell>
      <div className="flex flex-1 flex-col justify-center py-4 sm:py-12">
        {invite ? (
          <>
            <p className="eyebrow">Приглашение на курс</p>
            <h1 className="mt-2 text-balance type-title">{invite.title}</h1>
            <p className="mt-2 type-body text-muted-foreground">
              {invite.authorName ? `Преподаватель: ${invite.authorName}. ` : ""}
              {magic ? "Введите почту и имя: пришлём ссылку для входа, курс откроется сразу." : "Введите почту и имя, курс откроется сразу."}
            </p>
          </>
        ) : (
          <>
            <h1 className="type-title">Вход</h1>
            <p className="mt-3 type-body text-muted-foreground">
              {magic ? "Пароль не нужен: пришлём на почту ссылку для входа." : "Пароль не нужен: введите почту и имя."} Профиль появится при первом входе.
            </p>
          </>
        )}
        {magic || invite ? null : (
          <Notice className="mt-5">
            Демонстрационная версия: почту при входе не проверяем, поэтому не вводите чужие адреса и настоящие данные студентов.
          </Notice>
        )}
        {sp.deleted ? (
          <Notice kind="success" className="mt-5">
            Аккаунт и данные удалены из рабочей базы. Из резервных копий данные исчезнут, когда копии обновятся.
          </Notice>
        ) : null}
        {sp.error ? <Notice kind="error" className="mt-5">{ERRORS[sp.error] ?? ERRORS["1"]}</Notice> : null}
        <form action={login} className="mt-4 space-y-3.5 sm:mt-8 sm:space-y-6">
          {sp.next ? <input type="hidden" name="next" value={sp.next} /> : null}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email">Почта</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" name="name" required minLength={2} placeholder="Как к вам обращаться" />
            <p className="type-caption text-muted-foreground">
              Мы храним вашу почту, имя и ответы, чтобы вы могли учиться. Для разбора ответы читает ИИ,
              поэтому не пишите в них данные других людей и то, что не хотите передавать.
            </p>
          </div>
          {/* Приглашение: роль не спрашиваем и не отправляем, чтобы вход преподавателя по чужой ссылке не сменил ему роль. Новый профиль станет студенческим. */}
          {joinCode ? null : <RoleChoice defaultRole={defaultRole} />}
          <ConsentFields />
          <div className="space-y-2.5 sm:space-y-3">
            <Button type="submit" size="lg" className="w-full">{submitLabel}</Button>
            <YandexLoginButton error={sp.yandex} />
            <p className="text-center type-caption text-muted-foreground">
              Нажимая «{submitLabel}»{yandex ? " или «Войти с Яндекс ID»" : ""}, вы принимаете{" "}
              <Link href="/legal/terms" target="_blank" className="underline underline-offset-4 hover:text-foreground">Пользовательское соглашение</Link>.
            </p>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}
