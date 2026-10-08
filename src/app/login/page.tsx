import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { login } from "@/lib/actions/auth";
import { loginMode } from "@/lib/auth/mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConsentFields } from "@/components/shared/ConsentFields";

const ERRORS: Record<string, string> = {
  "1": "Проверьте почту и имя.",
  send: "Не удалось войти. Попробуйте ещё раз через минуту.",
  email: "На этот адрес письмо не уйдёт. Проверьте, нет ли опечатки.",
  link: "Ссылка не сработала или устарела. Запросите новую.",
  consent: "Без согласия на обработку данных войти нельзя: без него сервис не может хранить ваши ответы.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; sent?: string; next?: string; deleted?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await searchParams;
  const defaultRole = sp.role === "teacher" ? "teacher" : "student";
  const magic = loginMode() === "magic";

  if (sp.sent) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Проверьте почту</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Отправили письмо со ссылкой для входа. Откройте его в этом же браузере и нажмите на ссылку. Ссылка действует час.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Письма нет? Проверьте «Спам» или{" "}
          <Link href={`/login?role=${defaultRole}`} className="underline hover:text-foreground">запросите ссылку ещё раз</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {magic ? "Пароль не нужен: пришлём на почту ссылку для входа." : "Пароль не нужен: введите почту и имя."} Профиль появится при первом входе.
      </p>
      {magic ? null : (
        <p className="mt-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Демонстрационный вход: без подтверждения почты. Не вводите чужие адреса и настоящие данные студентов.
        </p>
      )}
      {sp.deleted ? (
        <p className="mt-4 rounded-md border px-3 py-2 text-sm">
          Аккаунт удалён. Из рабочей базы данные удалены сразу, из резервных копий исчезнут по мере их обновления.
        </p>
      ) : null}
      {sp.error ? <p className="mt-4 text-sm text-destructive">{ERRORS[sp.error] ?? ERRORS["1"]}</p> : null}
      <form action={login} className="mt-8 space-y-5">
        {sp.next ? <input type="hidden" name="next" value={sp.next} /> : null}
        <div className="space-y-2">
          <Label htmlFor="email">Почта</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Имя</Label>
          <Input id="name" name="name" required minLength={2} placeholder="Как к вам обращаться" />
        </div>
        <p className="text-xs text-muted-foreground">
          Мы храним вашу почту, имя и ответы, чтобы вы могли учиться. Текст ответа обрабатывает нейросеть.
          Не пишите в ответах данные других людей и то, что не хотите передавать.
        </p>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Роль</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary">
              <input type="radio" name="role" value="teacher" defaultChecked={defaultRole === "teacher"} /> Преподаватель
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary">
              <input type="radio" name="role" value="student" defaultChecked={defaultRole === "student"} /> Студент
            </label>
          </div>
        </fieldset>
        <ConsentFields />
        <Button type="submit" className="w-full">{magic ? "Получить ссылку для входа" : "Войти"}</Button>
        <p className="text-xs text-muted-foreground">
          Нажимая «{magic ? "Получить ссылку для входа" : "Войти"}», вы принимаете{" "}
          <Link href="/legal/terms" target="_blank" className="underline hover:text-foreground">Пользовательское соглашение</Link>.
        </p>
      </form>
    </main>
  );
}
