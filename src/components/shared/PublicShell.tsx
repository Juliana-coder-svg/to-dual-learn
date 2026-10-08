import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/shared/Brand";

/** Каркас страниц без сессии: лендинг, вход, согласие, документы. Шапка с логотипом и одним действием, подвал со ссылками. */
export function PublicShell({
  action,
  width = "narrow",
  children,
}: {
  action?: ReactNode;
  /** narrow — формы и документы (672 px); wide — лендинг (1024 px). */
  width?: "narrow" | "wide";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Brand />
          {action ? <div className="flex items-center gap-2">{action}</div> : null}
        </div>
      </header>
      <main className={`mx-auto flex w-full flex-1 flex-col px-4 ${width === "wide" ? "max-w-5xl" : "max-w-md"}`}>{children}</main>
      <footer className="border-t py-5 type-caption text-muted-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4">
          <span className="font-medium text-foreground/70">To Dual Education</span>
          <Link href="/legal/privacy" className="hover:text-foreground">Политика</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Соглашение</Link>
          <Link href="/legal/consent" className="hover:text-foreground">Согласие</Link>
        </div>
      </footer>
    </div>
  );
}
