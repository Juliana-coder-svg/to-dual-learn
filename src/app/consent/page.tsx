import { requireUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { acceptConsentAction, logout } from "@/lib/actions/auth";
import { ConsentFields } from "@/components/shared/ConsentFields";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";
import { Notice } from "@/components/shared/Notice";

/** Согласие для уже вошедшего пользователя без записи в consents: старая сессия или ссылка из письма,
 *  открытая в другом браузере. Без AppShell, иначе его проверка согласия зациклит редирект. */
export default async function ConsentPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const next = safeNextPath(sp.next);

  return (
    <PublicShell>
      <div className="flex flex-1 flex-col justify-center py-12">
        <h1 className="type-title">Согласие на обработку данных</h1>
        <p className="mt-3 type-body text-muted-foreground">
          {user.name}, чтобы продолжить, отметьте согласие ниже: без него сервис не может хранить вашу почту, имя и ответы.
        </p>
        {sp.error ? <Notice kind="error" className="mt-5">Отметьте согласие на обработку данных, чтобы продолжить.</Notice> : null}
        <form action={acceptConsentAction} className="mt-8 space-y-6">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <ConsentFields />
          <Button type="submit" size="lg" className="w-full">Продолжить</Button>
        </form>
        <form action={logout} className="mt-3">
          <Button type="submit" variant="ghost" className="w-full">Выйти без согласия</Button>
        </form>
      </div>
    </PublicShell>
  );
}
