import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { login } from "@/lib/actions/auth";
import { loginMode } from "@/lib/auth/mode";
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
  send: "Не удалось войти. Попробуйте ещё раз через минуту.",
  email: "На этот адрес письмо не уйдёт. Проверьте, нет ли опечатки.",
  link: "Ссылка не сработала или устарела. Запросите новую.",
  consent: "Отметьте согласие на обработку данных: без него сервис не сможет хранить ваши ответы.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; sent?: string; next?: string; deleted?: string; yandex?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await searchParams;
  const defaultRole = sp.role === "teacher" ? "teacher" : "student";
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
            <Link href={`/login?role=${defaultRole}`} className="text-foreground underline underline-offset-4 hover:text-primary-strong">запросите ссылку ещё раз</Link>.
          </p>
        </div>
      </PublicShell>
    );
  }

  const submitLabel = magic ? "Получить ссылку для входа" : "Войти";

  return (
    <PublicShell>
      <div className="flex flex-1 flex-col justify-center py-12">
        <h1 className="type-title">Вход</h1>
        <p className="mt-3 type-body text-muted-foreground">
          {magic ? "Пароль не нужен: пришлём на почту ссылку для входа." : "Пароль не нужен: введите почту и имя."} Профиль появится при первом входе.
        </p>
        {magic ? null : (
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
        <form action={login} className="mt-8 space-y-6">
          {sp.next ? <input type="hidden" name="next" value={sp.next} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Почта</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" name="name" required minLength={2} placeholder="Как к вам обращаться" />
            <p className="type-caption text-muted-foreground">
              Мы храним вашу почту, имя и ответы, чтобы вы могли учиться. Для разбора ответы читает ИИ,
              поэтому не пишите в них данные других людей и то, что не хотите передавать.
            </p>
          </div>
          <RoleChoice defaultRole={defaultRole} />
          <ConsentFields />
          <div className="space-y-3">
            <Button type="submit" size="lg" className="w-full">{submitLabel}</Button>
            <YandexLoginButton error={sp.yandex} />
            <p className="text-center type-caption text-muted-foreground">
              Нажимая «{submitLabel}» или «Войти с Яндекс ID», вы принимаете{" "}
              <Link href="/legal/terms" target="_blank" className="underline underline-offset-4 hover:text-foreground">Пользовательское соглашение</Link>.
            </p>
          </div>
        </form>
      </div>
    </PublicShell>
  );
}
