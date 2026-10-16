import Link from "next/link";

/** Подвал для всех экранов: один набор ссылок, одна высота. «Мои данные» добавляется, когда есть сессия. */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  const link = "inline-block py-2 hover:text-foreground";
  return (
    <footer className="border-t py-5 type-caption text-muted-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-0 px-4">
        <span className="font-medium text-foreground/70">To Dual Education</span>
        <Link href="/about/data" className={link}>Данные и безопасность</Link>
        <Link href="/pilot" className={link}>Пилот</Link>
        <Link href="/legal/privacy" className={link}>Политика</Link>
        <Link href="/legal/terms" className={link}>Соглашение</Link>
        <Link href="/legal/consent" className={link}>Согласие</Link>
        {signedIn ? <Link href="/account/data" className={link}>Мои данные</Link> : null}
      </div>
    </footer>
  );
}
