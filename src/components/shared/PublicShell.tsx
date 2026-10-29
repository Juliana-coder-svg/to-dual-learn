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
  /** narrow — формы и документы (480 px); wide — лендинг (1240 px). */
  width?: "narrow" | "wide";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md">
        <div className="container-x flex min-h-15 items-center justify-between gap-4 lg:min-h-17">
          <Brand />
          {action ? <div className="flex min-w-0 items-center gap-2">{action}</div> : null}
        </div>
      </header>
      <main id="main" className={`mx-auto flex w-full flex-1 flex-col px-[clamp(1.125rem,4vw,3rem)] ${width === "wide" ? "max-w-[77.5rem]" : "max-w-[calc(30rem+2*clamp(1.125rem,4vw,3rem))]"}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}
