import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";
import { StepMarks } from "@/components/shared/StepMarks";
import { Asterisk } from "@/components/shared/Asterisk";
import { DEFAULT_TRY_SLUG, getTryLesson } from "@/lib/try/catalog";
import { PILOT_MAILTO } from "@/lib/pilot";
import { SessionRedirect } from "@/components/shared/SessionRedirect";

/** Лендинг статический: без чтения cookie и базы в рендере, его отдаёт CDN. Вошедших уводит SessionRedirect. */
export const dynamic = "force-static";

interface Step {
  title: string;
  text: string;
}

interface Finding {
  title: string;
  text: string;
  source: string;
  href: string;
}

const STEPS: Step[] = [
  { title: "Загрузите материалы", text: "Методичка, программа или конспект: PDF или текст." },
  { title: "Поправьте уроки и опубликуйте", text: "ИИ собирает черновики, последнее слово за вами." },
  { title: "Студенты решают по уроку в день", text: "Пять минут, разбор ответа с цитатой, карточки на повторение." },
];

interface Role {
  label: string;
  text: string;
  actions: { label: string; href: string; external?: boolean; aria?: string; primary?: boolean }[];
}

const ROLES: Role[] = [
  { label: "Преподаватель", text: "соберите курс из своих материалов.", actions: [{ label: "Собрать курс", href: "/login?role=teacher", primary: true }] },
  { label: "Студент", text: "откройте ссылку от преподавателя или попробуйте урок.", actions: [{ label: "Пробный урок", href: `/try/${DEFAULT_TRY_SLUG}/1` }] },
  { label: "Автор курса", text: "сделайте тренажёр по своим лекциям.", actions: [{ label: "Собрать курс", href: "/login?role=teacher" }] },
  { label: "Компания или вуз", text: "бесплатный пилот на одной группе.", actions: [{ label: "Запросить пилот", href: PILOT_MAILTO, external: true }, { label: "Условия", href: "/pilot", aria: "Условия пилота" }] },
];

const FINDINGS: Finding[] = [
  { title: "Повторение с паузами", text: "Карточки возвращаются через день, неделю и месяц: так запоминается лучше, чем подряд.", source: "Cepeda и др., 2006", href: "https://pubmed.ncbi.nlm.nih.gov/16719566/" },
  { title: "Короткие уроки", text: "Пять минут на урок: в пяти вузовских исследованиях такие группы писали тест лучше.", source: "Senandheera и др., 2024", href: "https://jmtr.sljol.info/en/articles/2" },
  { title: "Разбор по критериям", text: "Каждый балл объяснён с цитатой из ответа, оценку можно оспорить, итог за преподавателем.", source: "Gaggioli и др., 2025", href: "https://arxiv.org/abs/2508.02442" },
  { title: "Наставник вопросами", text: "Дальше: режим наводящих вопросов, который в Гарварде дал вдвое больший прирост знаний.", source: "Kestin и др., 2025", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/" },
];

const TEAM = ["НИУ ВШЭ", "Яндекс", "ВТБ", "Сколково"];

/** Статичный набросок экрана пробного урока: те же название, навык и задача, что в /try, шаг «Задача». Без поля ответа и кнопки: набросок не должен выглядеть рабочим. */
function LessonSketch() {
  const lesson = getTryLesson(DEFAULT_TRY_SLUG, 1);
  if (!lesson) return null;
  const { title, concept, task } = lesson.content;
  return (
    <figure aria-hidden className="rounded-xl border border-dashed bg-card p-5 text-sm">
      <figcaption className="eyebrow text-muted-foreground">Так выглядит урок</figcaption>
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="eyebrow">Урок 1 · шаг 2 из 3</span>
        <StepMarks total={3} filled={2} size="sm" />
      </div>
      <p className="mt-3 type-heading">{title}</p>
      <p className="mt-1 text-muted-foreground">{concept}</p>
      <div className="mt-5">
        <p className="eyebrow">Задача</p>
        <p className="mt-1 line-clamp-5 type-body">{task}</p>
      </div>
      <p className="mt-5 type-caption text-muted-foreground">Дальше: ответ своими словами и разбор по критериям. Около пяти минут.</p>
    </figure>
  );
}

export default function Home() {
  return (
    <PublicShell width="wide" action={<Button nativeButton={false} render={<Link href="/login" />} size="sm" variant="outline">Войти</Button>}>
      <SessionRedirect />
      <section className="relative grid items-center gap-10 overflow-clip py-10 md:grid-cols-[1.15fr_1fr] md:gap-16 md:py-28">
        {/* Фирменная звёздочка огромным бледным фоном, как на страницах брендбука. Плоская линия, без градиента. */}
        <Asterisk className="pointer-events-none absolute -right-24 -top-10 size-[460px] text-muted md:-right-16 md:size-[620px]" />
        <div className="relative flex flex-col">
          <p className="eyebrow text-primary-strong">Микрообучение</p>
          <h1 className="mt-5 max-w-3xl text-balance type-display">
            Из&nbsp;ваших материалов получится курс пятиминутных уроков
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Загрузите методичку, ИИ соберёт уроки с задачей и разберёт ответы. Итог решаете вы.
          </p>
          <ul aria-label="Выберите, кто вы" className="mt-8 space-y-3">
            {ROLES.map((role) => (
              <li key={role.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span><span className="font-medium text-foreground">{role.label}:</span> <span className="text-muted-foreground">{role.text}</span></span>
                {role.actions.map((a) =>
                  a.primary ? (
                    <Button key={a.label} nativeButton={false} render={a.external ? <a href={a.href} /> : <Link href={a.href} />} size="sm">{a.label}</Button>
                  ) : (
                    <Link key={a.label} href={a.href} aria-label={a.aria} className="inline-flex min-h-11 items-center text-sm text-primary-strong underline decoration-primary/40 underline-offset-4 hover:decoration-primary sm:min-h-0">{a.label}</Link>
                  ),
                )}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">Бесплатно, без пароля.</p>
        </div>
        <div className="relative"><LessonSketch /></div>
      </section>

      <section className="border-t py-12 md:py-16">
        <h2 className="max-w-2xl type-title">Как это работает</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-primary pt-5">
              <span className="type-counter text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 type-heading">{step.title}</h3>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t py-12 md:py-16">
        <div className="max-w-2xl">
          <h2 className="type-title">На чём построен продукт</h2>
          <p className="mt-3 text-sm text-muted-foreground">Чужие исследования. Свои пилоты добавим, когда будут.</p>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {FINDINGS.map((finding) => (
            <li key={finding.title} className="flex flex-col rounded-xl bg-surface p-6">
              <h3 className="type-heading">{finding.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{finding.text}</p>
              <a
                href={finding.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-sm text-primary-strong underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                {finding.source}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:gap-16">
          <h2 className="type-title">Кто делает</h2>
          <div className="max-w-lg">
            <p className="type-body text-muted-foreground">
              {/* text-lint-ignore: «AI» из официального названия программы */}
              TO DUAL Education: магистратура ИИМУП «AI в маркетинге и продакт-менеджменте» (Яндекс и НИУ ВШЭ), программы по ИИ для Яндекса, ВТБ и Сколково.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {TEAM.map((t) => (
                <li key={t} className="rounded-full border px-3 py-1 text-sm">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
