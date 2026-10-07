import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { login } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string; error?: string; next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const sp = await searchParams;
  const defaultRole = sp.role === "teacher" ? "teacher" : "student";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Пароль не нужен: введите почту и имя. Профиль появится при первом входе.
      </p>
      {sp.error ? <p className="mt-4 text-sm text-destructive">Проверьте почту и имя.</p> : null}
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
        <Button type="submit" className="w-full">Войти</Button>
      </form>
    </main>
  );
}
