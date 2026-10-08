import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Markdown } from "@/components/shared/Markdown";
import { PublicShell } from "@/components/shared/PublicShell";
import { Notice } from "@/components/shared/Notice";
import { loadLegalDocument } from "@/lib/legal/documents";
import { LEGAL_VERSIONS, type LegalSlug } from "@/lib/legal/versions";

/** Документы для пользователя: политика, соглашение, согласие. Статические страницы без входа:
 *  текст читается из docs/legal на сборке, служебные пометки юриста вырезаны (src/lib/legal/documents.ts). */

export const dynamic = "force-static";
export const dynamicParams = false;

const SLUGS = Object.keys(LEGAL_VERSIONS) as LegalSlug[];

export function generateStaticParams(): { doc: LegalSlug }[] {
  return SLUGS.map((doc) => ({ doc }));
}

function isSlug(v: string): v is LegalSlug {
  return (SLUGS as string[]).includes(v);
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  if (!isSlug(doc)) return {};
  return { title: `${loadLegalDocument(doc).title} · To Dual Learn`, robots: { index: false, follow: false } };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isSlug(doc)) notFound();
  const document = loadLegalDocument(doc);

  return (
    <PublicShell
      action={
        <nav aria-label="Документы" className="flex gap-1">
          {SLUGS.map((s) => (
            <Link
              key={s}
              href={`/legal/${s}`}
              aria-current={s === doc ? "page" : undefined}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-sm ${s === doc ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            >
              {LEGAL_TITLES[s]}
            </Link>
          ))}
        </nav>
      }
    >
      <div className="w-full py-10 md:py-14">
        <p className="eyebrow">Версия {document.version}</p>
        <h1 className="mt-1 type-title">{document.title}</h1>
        <Notice className="mt-5">
          Проект документа. Реквизиты оператора пока стоят в квадратных скобках, впишем их после проверки юристом.
        </Notice>
        <article className="mt-8">
          <Markdown text={document.body} />
        </article>
      </div>
    </PublicShell>
  );
}

const LEGAL_TITLES: Record<LegalSlug, string> = {
  consent: "Согласие",
  privacy: "Политика",
  terms: "Соглашение",
};
