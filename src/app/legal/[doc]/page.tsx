import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Markdown } from "@/components/shared/Markdown";
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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">← На главную</Link>
        {SLUGS.filter((s) => s !== doc).map((s) => (
          <Link key={s} href={`/legal/${s}`} className="hover:text-foreground">{LEGAL_TITLES[s]}</Link>
        ))}
      </nav>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{document.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Версия {document.version}.</p>
      <p className="mt-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Проект документа. Реквизиты оператора пока стоят в квадратных скобках, впишем их после проверки юристом.
      </p>
      <article className="mt-6">
        <Markdown text={document.body} />
      </article>
    </main>
  );
}

const LEGAL_TITLES: Record<LegalSlug, string> = {
  consent: "Согласие",
  privacy: "Политика",
  terms: "Соглашение",
};
