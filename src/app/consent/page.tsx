import { requireUser } from "@/lib/auth/session";
import { acceptConsentAction, logout } from "@/lib/actions/auth";
import { ConsentFields } from "@/components/shared/ConsentFields";
import { Button } from "@/components/ui/button";

/** Согласие для уже вошедшего пользователя без записи в consents: старая сессия или ссылка из письма,
 *  открытая в другом браузере. Без AppShell, иначе его проверка согласия зациклит редирект. */
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Согласие на обработку данных</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {user.name}, чтобы продолжить, подтвердите согласие: без него сервис не может хранить вашу почту, имя и ответы.
      </p>
      {sp.error ? <p className="mt-4 text-sm text-destructive">Без согласия на обработку данных продолжить нельзя.</p> : null}
      <form action={acceptConsentAction} className="mt-8 space-y-5">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <ConsentFields />
        <Button type="submit" className="w-full">Продолжить</Button>
      </form>
      <form action={logout} className="mt-4">
        <Button type="submit" variant="ghost" size="sm" className="w-full">Не согласен(на), выйти</Button>
      </form>
    </main>
  );
}
