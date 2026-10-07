import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERRORS: Record<string, string> = {
  "1": "Проверь почту и имя.",
  send: "Не удалось отправить письмо. Попробуй ещё раз через минуту.",
  email: "На этот адрес письмо не уйдёт. Проверь, нет ли опечатки.",
  link: "Ссылка не сработала или устарела. Запроси новую.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string; sent?: string; next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await searchParams;
  const defaultRole = sp.role === "teacher" ? "teacher" : "student";

  if (sp.sent) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Проверь почту</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Отправили письмо со ссылкой для входа. Открой его в этом же браузере и нажми на ссылку. Ссылка действует час.
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Письма нет? Проверь «Спам» или{" "}
          <Link href={`/login?role=${defaultRole}`} className="underline hover:text-foreground">запроси ссылку ещё раз</Link>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Без пароля: пришлём на почту ссылку для входа. Профиль создаётся при первом входе.
      </p>
      {sp.error ? <p className="mt-4 text-sm text-destructive">{ERRORS[sp.error] ?? ERRORS["1"]}</p> : null}
      <form action={login} className="mt-8 space-y-5">
        {sp.next ? <input type="hidden" name="next" value={sp.next} /> : null}
        <div className="space-y-2">
          <Label htmlFor="email">Почта</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Имя</Label>
          <Input id="name" name="name" required minLength={2} placeholder="Как к тебе обращаться" />
        </div>
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
        <Button type="submit" className="w-full">Получить ссылку для входа</Button>
      </form>
    </main>
  );
}
