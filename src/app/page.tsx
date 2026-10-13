import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";
import { Building2, Compass, GraduationCap } from "lucide-react";
import { Asterisk } from "@/components/shared/Asterisk";
import { StepMarks } from "@/components/shared/StepMarks";
import { LessonFeedbackScreen, LessonIdeaScreen, LessonTaskScreen } from "@/components/shared/LessonScreens";

interface Step {
  title: string;
  text: string;
}

interface Segment {
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
    text: "Программу, методичку или конспект лекции: PDF, текстовый файл или вставленный текст. Перед сборкой ИИ задаёт 3–5 вопросов о целях курса и аудитории.",
  },
  {
    title: "ИИ собирает уроки, преподаватель правит и публикует",
    text: "В каждом уроке короткая теория, открытая задача и критерии оценки. Затем ИИ ещё раз сверяет уроки с материалами и отмечает, где материалов не хватает. Студенты видят только опубликованные уроки.",
  },
  {
    title: "Студент проходит урок в день",
    text: "Решает задачу, получает разбор по каждому критерию с цитатой из своего ответа и может оспорить оценку. Карточки по уроку возвращаются на повторение через день, потом через неделю, две недели и месяц. Если студент забыл ответ, карточка вернётся раньше.",
  },
];

const SEGMENTS: Segment[] = [
  {
    title: "Преподаватель вуза или школы",
    text: "Нужно, чтобы студенты решали задачи между занятиями, а домашние работы не приходилось проверять по одной. Соберите курс из своей методички, дайте группе ссылку и смотрите ответы на вкладке «Студенты». Пачку домашних работ можно проверить по своим критериям и выгрузить оценки в CSV.",
  },
  {
    title: "L&D в компании",
    text: "Нужно, чтобы материал тренинга применяли и после него. Загрузите материалы программы и получите серию заданий на пять минут в день. Видно, кто проходит и что отвечает. Расход на модель показан по каждой операции. Сейчас продукт подходит для пилота на одной группе: корпоративного входа и лицензий на места пока нет.",
  },
  {
    title: "Специалист, который учится сам",
    text: "Нужно дойти до конца курса или книги и запомнить главное. Войдите как преподаватель, загрузите конспект или текст и соберите уроки. Потом переключитесь на роль студента, введите код своего курса и проходите по уроку в день. Вместо своих материалов можно взять готовый курс «Критическое мышление в эпоху ИИ» из пяти уроков.",
  },
];

const FINDINGS: Finding[] = [
  {
    title: "Повторение с перерывами",
    text: "Метаанализ 317 экспериментов на запоминание: материал, который повторяли с перерывами, помнят лучше, чем повторённый подряд за то же время. Чем дольше нужно помнить, тем длиннее должны быть перерывы. На этом построены наши интервалы.",
    source: "Cepeda и др., Psychological Bulletin, 2006",
    href: "https://pubmed.ncbi.nlm.nih.gov/16719566/",
  },
  {
    title: "Короткие уроки",
    text: "Метаанализ пяти исследований в вузах, 654 студента: у групп с короткими модулями баллы за итоговый тест выше, чем у групп с обычными занятиями. Исследований пока мало, вывод предварительный.",
    source: "Senandheera и др., Journal of Multidisciplinary & Translational Research, 2024",
    href: "https://jmtr.sljol.info/en/articles/2",
  },
  {
    title: "ИИ-тьютор",
    text: "Рандомизированное исследование в Гарварде: 194 студента курса физики, две темы. С ИИ-тьютором, который ведёт вопросами и не выдаёт готовый ответ, прирост знаний оказался более чем вдвое выше, чем на активном занятии в аудитории. Времени на это ушло меньше. Наш наставник пока разбирает готовый ответ, режим с наводящими вопросами в планах.",
    source: "Kestin и др., Scientific Reports, 2025",
    href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/",
  },
  {
    title: "Автоматическая оценка",
    text: "Пять моделей, среди них Claude 3.5, GPT-4 и Gemini 2.5, оценивали 67 эссе студентов-психологов. Согласие с преподавателями оказалось низким, а при повторных прогонах оценки расходились. Поэтому наш наставник разбирает ответ по каждому критерию с цитатой и сверяется с образцами оценок преподавателя. Студент может оспорить оценку, а преподаватель видит все ответы. Насколько оценки наставника совпадают с оценками преподавателя, мы ещё не измеряли.",
    source: "Gaggioli и др., arXiv, 2025",
    href: "https://arxiv.org/abs/2508.02442",
  },
];

const TEAM = ["НИУ ВШЭ", "Яндекс", "ВТБ", "Сколково"];

function EntryButtons({ size = "lg", tone = "default" }: { size?: "lg" | "default"; tone?: "default" | "inverse" }) {
  const inverse = tone === "inverse";
  return (
    <div className="flex flex-wrap gap-3">
      <Button nativeButton={false} render={<Link href="/login?role=teacher" />} size={size} variant={inverse ? "inverse" : "default"}>Я преподаватель</Button>
      <Button nativeButton={false} render={<Link href="/login?role=student" />} size={size} variant={inverse ? "inverse-outline" : "outline"}>Я студент</Button>
    </div>
  );
}

/** Секция в журнальной сетке: слева номер и заголовок на четырёх колонках, справа содержимое на восьми. */
function MagSection({ n, title, note, children }: { n: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rule grid gap-8 py-16 md:grid-cols-12 md:gap-8 md:py-24">
      <header className="md:col-span-4">
        <p className="type-caption tabular-nums text-muted-foreground">{n}</p>
        <h2 className="mt-2 text-balance type-title">{title}</h2>
        {note ? <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{note}</p> : null}
      </header>
      <div className="md:col-span-8">{children}</div>
    </section>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <PublicShell width="wide" action={<Button nativeButton={false} render={<Link href="/login" />} size="sm" variant="outline">Войти</Button>}>
      <section className="relative overflow-clip pt-16 pb-12 md:pt-24 md:pb-20">
        {/* Фирменная звёздочка огромным бледным фоном, как на страницах брендбука. Плоская заливка линией, без градиента. */}
        <Asterisk className="pointer-events-none absolute -right-24 -top-10 size-[460px] text-muted md:-right-16 md:size-[620px]" />
        <p className="relative eyebrow text-primary-strong">Микрообучение по вашим материалам</p>
        <h1 className="relative mt-6 text-balance type-mega">
          Студенты практикуются по вашим материалам по&nbsp;пять минут в&nbsp;день
        </h1>
        {/* Асимметрия: текст в левых пяти колонках, экран урока сдвинут вправо и вниз. */}
        <div className="relative mt-10 grid gap-12 md:mt-16 md:grid-cols-12 md:gap-8">
          <div className="flex flex-col md:col-span-5 md:pt-8">
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground max-md:order-last max-md:mt-8">
              Загрузите программу, методичку или конспект лекции. To Dual Learn соберёт из них короткие уроки с задачей
              и разберёт ответы студентов по критериям. Через день, неделю и месяц пройденное вернётся карточками.
            </p>
            <div className="mt-8 max-md:mt-0">
              <EntryButtons />
              <p className="mt-3 text-sm text-muted-foreground">Бесплатно. Пароль не нужен: войдите по почте и имени.</p>
            </div>
          </div>
          <div className="md:col-span-6 md:col-start-7 md:mt-24">
            <LessonTaskScreen />
          </div>
        </div>
      </section>

      {/* Знак как графика: три сегмента во всю ширину отделяют героя от остального. */}
      <StepMarks total={3} filled={2} current={3} size="xl" />

      <section className="rule py-16 md:py-24">
        <p className="type-caption tabular-nums text-muted-foreground">01</p>
        <h2 className="mt-2 max-w-2xl text-balance type-title">Как это работает</h2>
        {/* Графитовые карточки с большой цифрой справа сверху, как шаги процесса в брендбуке. */}
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex min-h-72 flex-col justify-between rounded-2xl bg-ink p-6 text-ink-foreground">
              <span className="type-counter self-end text-ink-foreground">{i + 1}</span>
              <div>
                <h3 className="type-heading">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-foreground/80">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rule py-16 md:py-24">
        <p className="type-caption tabular-nums text-muted-foreground">02</p>
        <h2 className="mt-2 max-w-2xl type-title">Так выглядит урок</h2>
        <p className="mt-3 max-w-prose text-sm text-muted-foreground">Экраны из курса-примера «Критическое мышление в эпоху ИИ». Преподаватель собирает такие же из своих материалов.</p>
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-8">
          <LessonIdeaScreen />
          <div className="md:mt-20"><LessonFeedbackScreen /></div>
        </div>
      </section>

      <MagSection n="03" title="Для кого">
        <ul className="divide-y border-b">
          {SEGMENTS.map((segment, i) => {
            const Icon = [GraduationCap, Building2, Compass][i] ?? Compass;
            return (
            <li key={segment.title} className="grid gap-x-8 gap-y-3 py-7 md:grid-cols-[13rem_1fr]">
              <div>
                <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon aria-hidden className="size-5" /></span>
                <h3 className="type-heading">{segment.title}</h3>
              </div>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{segment.text}</p>
            </li>
            );
          })}
        </ul>
      </MagSection>

      <MagSection
        n="04"
        title="Что говорят исследования"
        note="Это чужие исследования, а не результаты нашего продукта. Свои цифры опубликуем после первых пилотов."
      >
        <ul className="divide-y border-b">
          {FINDINGS.map((finding) => (
            <li key={finding.title} className="grid gap-x-8 gap-y-2 py-7 md:grid-cols-[13rem_1fr]">
              <h3 className="type-heading">{finding.title}</h3>
              <div>
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{finding.text}</p>
                <a
                  href={finding.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-primary-strong underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                >
                  {finding.source}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </MagSection>

      <MagSection n="05" title="Кто делает">
        <p className="max-w-prose type-body text-muted-foreground">
          Команда To Dual Education. Мы преподаём в НИУ ВШЭ, в магистратуре ИИМУП «AI в маркетинге и продакт-менеджменте»,
          и ведём программы по ИИ для Яндекса, ВТБ и Сколково.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {TEAM.map((t) => (
            <li key={t} className="rounded-full border px-3 py-1 text-sm">{t}</li>
          ))}
        </ul>
      </MagSection>

      <section className="accent-panel relative mb-20 overflow-clip md:mb-24 md:p-12">
        <Asterisk className="pointer-events-none absolute -right-10 -bottom-10 size-72 text-primary-foreground/15 md:size-96" />
        <div className="relative max-w-2xl">
          <StepMarks total={3} filled={3} size="xl" tone="inverse" />
          <h2 className="mt-6 text-balance type-title">Попробуйте на своём материале</h2>
          <p className="mt-3 max-w-lg type-body accent-panel-muted">
            Преподаватель собирает курс и даёт студентам ссылку. Студент входит по ссылке или по коду курса.
          </p>
          <div className="mt-8">
            <EntryButtons tone="inverse" />
            <p className="mt-3 text-sm accent-panel-muted">Бесплатно. Пароль не нужен: войдите по почте и имени.</p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
