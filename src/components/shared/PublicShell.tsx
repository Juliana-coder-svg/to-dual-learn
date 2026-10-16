import type { ReactNode } from "react";
import { Brand } from "@/components/shared/Brand";
import { SiteFooter } from "@/components/shared/SiteFooter";

/** Каркас страниц без сессии: лендинг, вход, согласие, документы. Шапка с логотипом и одним действием, подвал со ссылками. */
export function PublicShell({
  action,
  width = "narrow",
  children,
}: {
  action?: ReactNode;
  /** narrow — формы и документы (448 px); wide — лендинг (1024 px). */
  width?: "narrow" | "wide";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Brand />
          {action ? <div className="flex min-w-0 items-center gap-2">{action}</div> : null}
        </div>
      </header>
      <main className={`mx-auto flex w-full flex-1 flex-col px-4 ${width === "wide" ? "max-w-5xl" : "max-w-md"}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
