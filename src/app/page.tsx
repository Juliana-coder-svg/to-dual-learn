import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";
import { StepMarks } from "@/components/shared/StepMarks";
import { DEFAULT_TRY_SLUG } from "@/lib/try/catalog";
import { SessionRedirect } from "@/components/shared/SessionRedirect";

/** Лендинг статический: без чтения cookie и базы в рендере, его отдаёт CDN. Вошедших уводит SessionRedirect. */
export const dynamic = "force-static";

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
    text: "Решает задачу, получает разбор по каждому критерию с цитатой из своего ответа и может оспорить разбор. Карточки по уроку возвращаются на повторение через день, потом через неделю, две недели и месяц. Если студент забыл ответ, карточка вернётся раньше.",
  },
];

const SEGMENTS: Segment[] = [
  {
    title: "Преподаватель вуза или школы",
    text: "Нужно, чтобы студенты решали задачи между занятиями, а домашние работы не приходилось проверять по одной. Соберите курс из своей методички, дайте группе ссылку и смотрите ответы на вкладке «Студенты». Работы группы можно проверить сразу по своим критериям и выгрузить баллы в CSV.",
  },
  {
    title: "L&D в компании",
    text: "Нужно, чтобы материал тренинга применяли и после него. Загрузите материалы программы и получите уроки по пять минут в день. Видно, кто проходит и что отвечает. Расход на ИИ показан по каждой операции. Сейчас продукт подходит для пилота на одной группе: корпоративного входа и лицензий на места пока нет.",
  },
  {
    title: "Специалист, который учится сам",
    text: "Нужно дойти до конца курса или книги и запомнить главное. Войдите как преподаватель, загрузите конспект или текст и соберите уроки. Потом переключитесь на роль студента, введите код своего курса и проходите по уроку в день. Вместо своих материалов можно взять готовый курс «Критическое мышление в эпоху ИИ» из пяти уроков.",
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
    text: "Сейчас наставник разбирает готовый ответ. В планах режим с наводящими вопросами: в Гарварде ИИ-тьютор, который ведёт вопросами, дал прирост знаний более чем вдвое выше, чем занятие в аудитории (194 студента).",
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

function EntryButtons({ size = "lg", tone = "default", trial = false }: { size?: "lg" | "default"; tone?: "default" | "inverse"; trial?: boolean }) {
  const inverse = tone === "inverse";
  return (
    <div className="flex flex-wrap gap-3">
      {trial ? (
        <Button nativeButton={false} render={<Link href={`/try/${DEFAULT_TRY_SLUG}/1`} />} size={size} variant={inverse ? "inverse" : "default"}>Попробовать урок</Button>
      ) : null}
      <Button nativeButton={false} render={<Link href="/login?role=teacher" />} size={size} variant={inverse ? (trial ? "inverse-outline" : "inverse") : trial ? "outline" : "default"}>Я преподаватель</Button>
      <Button nativeButton={false} render={<Link href="/login?role=student" />} size={size} variant={inverse ? "inverse-outline" : "outline"}>Я студент</Button>
    </div>
  );
}

/** Статичный набросок экрана урока: показывает формат, не обещая больше, чем есть. Собран из тех же токенов, что и продукт. */
function LessonSketch() {
  return (
    <div aria-hidden className="rounded-lg border bg-card p-5 text-sm">
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">Урок 2 · шаг 2 из 3</span>
        <StepMarks total={3} filled={2} size="sm" />
      </div>
      <p className="mt-3 type-heading">Первая цифра решает</p>
      <p className="mt-1 text-muted-foreground">Заметить эффект якоря после подсказки модели</p>
      <div className="mt-5">
        <p className="eyebrow">Задача</p>
        <p className="mt-1 type-body">
          Модель оценила рынок в 48 млрд рублей. Через час коллега назвал 12 млрд. Какие две проверки вы сделаете до того, как вставить цифру в презентацию?
        </p>
      </div>
      <div className="mt-4 rounded-lg border border-input bg-background px-3 py-2 text-muted-foreground/80">
        Первая проверка: откуда модель взяла…
        <span className="ml-px inline-block h-4 w-px translate-y-0.5 bg-foreground" />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex h-9 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground">Отправить на разбор</span>
        <span className="type-caption text-muted-foreground">около 5 минут</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <PublicShell width="wide" action={<Button nativeButton={false} render={<Link href="/login" />} size="sm" variant="outline">Войти</Button>}>
      <SessionRedirect />
      <section className="grid items-center gap-12 py-16 md:grid-cols-[1.15fr_1fr] md:gap-16 md:py-28">
        <div className="flex flex-col">
          <p className="eyebrow text-primary-strong">Микрообучение</p>
          <h1 className="mt-5 max-w-3xl text-balance type-display">
            Пятиминутные уроки из&nbsp;ваших материалов, разбор каждого ответа
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground max-md:order-last max-md:mt-8">
            Загрузите методичку или конспект, и ИИ соберёт уроки с задачей. Он разберёт ответы студентов
            по критериям, а итоговое решение останется за вами. Через день, неделю и месяц пройденное вернётся карточками.
          </p>
          <div className="mt-8 max-md:mt-6">
            <EntryButtons trial />
            <p className="mt-3 text-sm text-muted-foreground">Бесплатно. Пробный урок без входа, пять минут. Дальше пароль не нужен: войдите по почте и имени.</p>
          </div>
        </div>
        <LessonSketch />
      </section>

      <section className="border-t py-20 md:py-24">
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

      <section className="border-t py-20 md:py-24">
        <h2 className="max-w-2xl type-title">Для кого</h2>
        <div className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {SEGMENTS.map((segment, i) => (
            <div key={segment.title} className="border-t pt-5">
              <StepMarks total={3} filled={i + 1} size="sm" />
              <h3 className="mt-4 type-heading">{segment.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{segment.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t py-20 md:py-24">
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

      <section className="border-t py-20 md:py-24">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:gap-16">
          <h2 className="type-title">Кто делает</h2>
          <div className="max-w-lg">
            <p className="type-body text-muted-foreground">
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

      <section className="accent-panel mb-20 md:mb-24 md:p-12">
        <div className="max-w-2xl">
          <StepMarks total={3} filled={3} size="md" tone="inverse" />
          <h2 className="mt-6 text-balance type-title">Попробуйте на своём материале</h2>
          <p className="mt-3 max-w-lg type-body accent-panel-muted">
            Преподаватель собирает курс и даёт студентам ссылку. Студент записывается на курс по ссылке или по коду.
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
