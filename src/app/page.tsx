import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { BookOpen, Building2, GraduationCap, PenLine, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";
import { Asterisk } from "@/components/shared/Asterisk";
import { DEFAULT_TRY_SLUG } from "@/lib/try/catalog";
import { PILOT_MAILTO } from "@/lib/pilot";
import { SessionRedirect } from "@/components/shared/SessionRedirect";

/** Лендинг статический: без чтения cookie и базы в рендере, его отдаёт CDN. Вошедших уводит SessionRedirect. */
export const dynamic = "force-static";

/** Каждый блок занимает экран и несёт одну мысль. Отступы кратны 8 px. */
const SCREEN = "rule flex flex-col justify-center py-16 md:min-h-[calc(100svh-4.25rem)] md:py-24";

const TEACHER_HREF = "/login?role=teacher";
const TRY_HREF = `/try/${DEFAULT_TRY_SLUG}/1`;

interface Step {
  caption: string;
  image: string;
  alt: string;
}

/** Снимки сняты с рабочей сборки на тестовом курсе «Критическое мышление в эпоху ИИ». */
const STEPS: Step[] = [
  { caption: "Загрузите материалы.", image: "/landing/step-materials.webp", alt: "Экран преподавателя: вкладка «Материалы» с загруженной методичкой и формой загрузки файлов." },
  { caption: "Поправьте черновики и опубликуйте.", image: "/landing/step-lessons.webp", alt: "Экран преподавателя: вкладка «Уроки», два опубликованных урока с кнопками «Править» и «Снять с публикации»." },
  { caption: "Урок в день и разбор с цитатой.", image: "/landing/step-review.webp", alt: "Экран студента: разбор ответа с баллом 5 из 5, пометкой «Что получилось» и одним следующим шагом." },
];

interface Role {
  label: string;
  text: string;
  icon: LucideIcon;
  action: { label: string; href: string; external?: boolean };
}

const ROLES: Role[] = [
  { label: "Преподаватель", text: "Курс из ваших материалов", icon: GraduationCap, action: { label: "Собрать курс", href: TEACHER_HREF } },
  { label: "Студент", text: "Ссылка от преподавателя или пробный урок", icon: BookOpen, action: { label: "Пробный урок", href: TRY_HREF } },
  { label: "Автор курса", text: "Тренажёр по вашим лекциям", icon: PenLine, action: { label: "Собрать курс", href: TEACHER_HREF } },
  { label: "Компания или вуз", text: "Пилот на одной группе", icon: Building2, action: { label: "Запросить пилот", href: PILOT_MAILTO, external: true } },
];

interface Finding {
  title: string;
  text: string;
  source: string;
  href: string;
}

const FINDINGS: Finding[] = [
  { title: "Повторение с паузами", text: "Карточки через день, неделю, месяц", source: "Cepeda и др., 2006", href: "https://pubmed.ncbi.nlm.nih.gov/16719566/" },
  { title: "Короткие уроки", text: "Пять минут на урок", source: "Senandheera и др., 2024", href: "https://jmtr.sljol.info/en/articles/2" },
  { title: "Разбор по критериям", text: "Балл с цитатой, итог за преподавателем", source: "Gaggioli и др., 2025", href: "https://arxiv.org/abs/2508.02442" },
  { title: "Наставник вопросами", text: "В планах: наводящие вопросы", source: "Kestin и др., 2025", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/" },
];

const LINK = "inline-flex min-h-11 items-center text-[0.9375rem] font-medium text-foreground underline decoration-1 underline-offset-[3px] hover:text-primary-strong";

/** Один снимок для телефона и другой для широкого экрана: таблица студентов на 375 нечитаема, поэтому у телефона свой кадр. */
function StudentsShot() {
  const alt = "Вкладка «Студенты»: фильтры «Не начали», «Застряли», «Сдали», «Идут» и таблица с состоянием, пройденными уроками и средним баллом.";
  const common = { alt, sizes: "(min-width: 1024px) 992px, 100vw" };
  const { props: desktop } = getImageProps({ ...common, src: "/landing/students.webp", width: 2016, height: 1600 });
  const { props: { srcSet: mobileSet, ...mobile } } = getImageProps({ ...common, src: "/landing/students-m.webp", width: 840, height: 1300, sizes: "100vw" });
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} sizes={desktop.sizes} />
      <img {...mobile} srcSet={mobileSet} alt={alt} className="h-auto w-full" />
    </picture>
  );
}

export default function Home() {
  return (
    <PublicShell width="wide" action={<Button nativeButton={false} render={<Link href="/login" />} size="sm" variant="outline">Войти</Button>}>
      <SessionRedirect />

      {/* 1. Первый экран: заголовок, одна фраза, один главный призыв и снимок урока. */}
      <section className="relative my-3 grid items-center gap-10 overflow-clip rounded-3xl bg-surface-deep p-[clamp(1.5rem,5vw,4.5rem)] md:my-6 md:min-h-[calc(100svh-6.5rem)] md:grid-cols-[1fr_360px] md:gap-16">
        <Asterisk className="pointer-events-none absolute -right-24 -top-10 size-[460px] text-white/80 md:-right-16 md:size-[620px]" />
        <div className="relative flex flex-col">
          <h1 className="max-w-3xl text-balance type-mega">
            Из&nbsp;ваших материалов получится курс пятиминутных уроков
          </h1>
          <p className="mt-6 max-w-md type-lead text-ink-soft">ИИ соберёт уроки, итог решаете вы.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Button nativeButton={false} render={<Link href={TEACHER_HREF} />} size="lg" variant="accent">Собрать курс</Button>
            <Link href={TRY_HREF} className={LINK}>Попробовать урок</Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[360px] md:ml-auto">
          <div className="max-h-[400px] overflow-hidden rounded-xl border bg-card md:max-h-none">
            <Image src="/landing/hero-lesson.webp" alt="Экран урока: заголовок «Уверенно, но неправда», короткое объяснение, блок «Идея урока» и признаки, на что смотреть." width={840} height={1280} priority sizes="(min-width: 768px) 360px, 100vw" className="h-auto w-full" />
          </div>
        </div>
      </section>

      {/* 2. Как это работает: три шага, по снимку и одной строке. */}
      <section aria-labelledby="how" className={SCREEN}>
        <h2 id="how" className="type-title">Как это работает</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.caption} className="flex flex-col overflow-hidden rounded-xl bg-ink text-ink-foreground">
              <div className="p-5 md:p-6">
                <span aria-hidden className="type-counter text-primary">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-2 md:min-h-14 type-heading">{step.caption}</p>
              </div>
              <div className="mt-auto aspect-[4/5] overflow-hidden bg-card">
                <Image src={step.image} alt={step.alt} width={840} height={1340} sizes="(min-width: 768px) 320px, 100vw" className="h-auto w-full" />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 3. Кому: четыре плитки, у каждой строка и одна кнопка. */}
      <section aria-labelledby="who" className={SCREEN}>
        <h2 id="who" className="type-title">Кому подойдёт</h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <li key={role.label} className="flex flex-col rounded-xl border bg-card p-6">
                <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-surface text-foreground"><Icon className="size-6" /></span>
                <h3 className="mt-6 type-heading">{role.label}</h3>
                <p className="mt-2 flex-1 text-[0.9375rem] leading-normal text-ink-soft">{role.text}</p>
                <Button
                  nativeButton={false}
                  render={role.action.external ? <a href={role.action.href} /> : <Link href={role.action.href} />}
                  size="lg"
                  variant="outline"
                  className="mt-6 w-full"
                  aria-label={`${role.action.label}: ${role.label.toLowerCase()}`}
                >
                  {role.action.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4. Что видит преподаватель. */}
      <section aria-labelledby="teacher" className={SCREEN}>
        <h2 id="teacher" className="type-title">Что видит преподаватель</h2>
        <p className="mt-4 type-lead text-ink-soft">Кто не начал, кто застрял, кто сдал.</p>
        <div className="mt-10 overflow-hidden rounded-2xl border bg-card p-0 md:p-2">
          <StudentsShot />
        </div>
      </section>

      {/* 5. На чём построено. */}
      <section aria-labelledby="science" className={SCREEN}>
        <h2 id="science" className="type-title">На чём построено</h2>
        <p className="mt-4 type-lead text-ink-soft">Чужие исследования. Своих данных пока нет.</p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FINDINGS.map((f) => (
            <li key={f.title} className="flex flex-col rounded-xl bg-surface p-6">
              <h3 className="type-heading">{f.title}</h3>
              <p className="mt-2 flex-1 text-[0.9375rem] leading-normal text-ink-soft">{f.text}</p>
              <a href={f.href} target="_blank" rel="noreferrer" className={`${LINK} mt-4`}>{f.source}</a>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-[0.9375rem] text-ink-soft">Делает TO DUAL Education: НИУ ВШЭ, Яндекс, ВТБ, Сколково.</p>
      </section>

      {/* 6. Финал: тот же призыв, что на первом экране. */}
      <section aria-labelledby="final" className="rule py-16 md:py-24">
        <div className="accent-panel relative overflow-clip py-12 md:py-16">
          <Asterisk className="pointer-events-none absolute -right-16 -top-16 size-[360px] text-white/70" />
          <div className="relative">
            <h2 id="final" className="max-w-2xl type-title">Соберите первый курс из своих материалов</h2>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Button nativeButton={false} render={<Link href={TEACHER_HREF} />} size="lg" variant="inverse">Собрать курс</Button>
              <span className="text-base font-medium">Бесплатно, без пароля</span>
            </div>
          </div>
        </div>
        <p className="mt-6 flex flex-wrap gap-x-6 text-sm">
          <Link href="/about/data" className={LINK}>Данные и безопасность</Link>
          <Link href="/pilot" className={LINK}>Пилот для вуза или компании</Link>
        </p>
      </section>
    </PublicShell>
  );
}
