import Link from "next/link";

/** Подвал для всех экранов: один набор ссылок, одна высота. «Мои данные» добавляется, когда есть сессия. */
export function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  const link = "inline-flex min-h-11 items-center underline-offset-[3px] hover:text-primary-strong hover:underline";
  return (
    <footer className="mt-12 border-t py-6 text-[0.9375rem] leading-normal text-ink-soft">
      <div className="container-x flex flex-wrap items-center gap-x-6 gap-y-0">
        <span className="font-medium text-foreground">TO DUAL Education</span>
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
