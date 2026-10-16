import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";
import { StepMarks } from "@/components/shared/StepMarks";
import { Asterisk } from "@/components/shared/Asterisk";
import { DEFAULT_TRY_SLUG, getTryLesson } from "@/lib/try/catalog";
import { CONTACT_EMAIL, PILOT_MAILTO } from "@/lib/pilot";
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
  {
    title: "Преподаватель загружает материалы",
    text: "Методичку, программу или конспект: PDF, текст или вставка. ИИ задаёт 3–5 вопросов о целях и аудитории.",
  },
  {
    title: "ИИ собирает уроки, преподаватель правит и публикует",
    text: "В уроке короткая теория, открытая задача и критерии. ИИ отмечает, где материалов не хватает. Студенты видят только опубликованное.",
  },
  {
    title: "Студент проходит урок в день",
    text: "Решает задачу, получает разбор по критериям с цитатой из ответа. Если не согласен, может оспорить разбор. Карточки возвращаются через день, неделю, две недели и месяц.",
  },
];

interface Role {
  label: string;
  text: string;
  actions: { label: string; href: string; external?: boolean; aria?: string; primary?: boolean }[];
}

const ROLES: Role[] = [
  {
    label: "Преподаватель",
    text: "загрузите методичку, получите курс уроков по пять минут, дайте группе ссылку и смотрите ответы.",
    actions: [{ label: "Собрать курс", href: "/login?role=teacher", primary: true }],
  },
  {
    label: "Студент",
    text: "если преподаватель прислал ссылку, откройте её. Если нет, начните с пробного урока.",
    actions: [
      { label: "Пробный урок", href: `/try/${DEFAULT_TRY_SLUG}/1` },
      { label: "Войти", href: "/login?role=student" },
    ],
  },
  {
    label: "Автор курса или эксперт",
    text: "соберите из лекций и статей курс «урок в день» и дайте ссылку своей аудитории. Оплаты внутри сервиса пока нет.",
    actions: [{ label: "Собрать курс", href: "/login?role=teacher" }],
  },
  {
    label: "Компания или вуз",
    text: `пилот на одной группе, 4–6 недель, бесплатно. Цену называем после пилота. Почта: ${CONTACT_EMAIL}.`,
    actions: [
      { label: "Запросить пилот", href: PILOT_MAILTO, external: true, primary: true },
      { label: "Условия", href: "/pilot", aria: "Условия пилота" },
      { label: "Данные и безопасность", href: "/about/data" },
    ],
  },
];

const FINDINGS: Finding[] = [
  {
    title: "Возвращаем к теме через паузы",
    text: "Карточки по уроку возвращаются через день, неделю, две недели и месяц: так материал запоминается лучше. В метаанализе 317 экспериментов повторение с перерывами работало лучше, чем подряд за то же время.",
    source: "Cepeda и др., Psychological Bulletin, 2006",
    href: "https://pubmed.ncbi.nlm.nih.gov/16719566/",
  },
  {
    title: "Учим короткими уроками",
    text: "Один урок занимает около пяти минут, как короткий модуль. В пяти исследованиях в вузах (654 студента) группы с короткими модулями написали итоговый тест лучше. Исследований пока мало, вывод предварительный.",
    source: "Senandheera и др., Journal of Multidisciplinary & Translational Research, 2024",
    href: "https://jmtr.sljol.info/en/articles/2",
  },
  {
    title: "Куда развиваем наставника",
    text: "Сейчас наставник разбирает готовый ответ. В планах режим с наводящими вопросами: в Гарварде ИИ-тьютор, который ведёт вопросами, дал прирост знаний более чем вдвое больше, чем занятие в аудитории (194 студента).",
    source: "Kestin и др., Scientific Reports, 2025",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/",
  },
  {
    title: "Объясняем каждый балл",
    text: "Наставник разбирает ответ по каждому критерию с цитатой и сверяется с образцами оценок преподавателя. Студент может оспорить разбор, преподаватель видит все ответы. Почему так: когда пять моделей оценивали 67 эссе, оценки слабо совпадали с преподавательскими и менялись при повторных прогонах.",
    source: "Gaggioli и др., arXiv, 2025",
    href: "https://arxiv.org/abs/2508.02442",
  },
];

const TEAM = ["НИУ ВШЭ", "Яндекс", "ВТБ", "Сколково"];

/** Статичный набросок экрана пробного урока: те же название, навык и задача, что в /try, шаг «Задача». Без поля ответа и кнопки: набросок не должен выглядеть рабочим. */
function LessonSketch() {
  const lesson = getTryLesson(DEFAULT_TRY_SLUG, 1);
  if (!lesson) return null;
  const { title, concept, task } = lesson.content;
  return (
    <figure aria-hidden className="rounded-lg border border-dashed bg-card p-5 text-sm">
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
          <ul aria-label="Выберите, кто вы" className="mt-8 divide-y border-y">
            {ROLES.map((role) => (
              <li key={role.label} className="flex flex-col gap-3 py-4">
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{role.label}:</span> {role.text}
                </p>
                <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
                  {role.actions.map((a) =>
                    a.primary ? (
                      <Button key={a.label} nativeButton={false} render={a.external ? <a href={a.href} /> : <Link href={a.href} />} size="lg">{a.label}</Button>
                    ) : (
                      <Link key={a.label} href={a.href} aria-label={a.aria} className="inline-flex min-h-11 items-center text-sm text-primary-strong underline decoration-primary/40 underline-offset-4 hover:decoration-primary sm:min-h-0">{a.label}</Link>
                    ),
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">Бесплатно. Пароль не нужен: войдите по почте и имени.</p>
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
          <p className="mt-3 text-sm text-muted-foreground">
            Мы опирались на исследования других команд. Результатов своих пилотов пока нет, добавим, когда появятся.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {FINDINGS.map((finding) => (
            <li key={finding.title} className="flex flex-col rounded-lg bg-surface p-6">
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
              Команда To Dual Education. Преподаём в магистратуре ИИМУП «AI в маркетинге и продакт-менеджменте» (Яндекс и НИУ ВШЭ)
              и проводим программы по ИИ для Яндекса, ВТБ и Сколково. В занятиях у нас 25% теории и 75% практики, в уроках сервиса так же:
              короткая теория и сразу задача.
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
