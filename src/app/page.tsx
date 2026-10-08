import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";

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

function EntryButtons({ size = "lg" }: { size?: "lg" | "default" }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button nativeButton={false} render={<Link href="/login?role=teacher" />} size={size}>Я преподаватель</Button>
      <Button nativeButton={false} render={<Link href="/login?role=student" />} size={size} variant="outline">Я студент</Button>
    </div>
  );
}

/** Статичный набросок экрана урока: показывает формат, не обещая больше, чем есть. Собран из тех же токенов, что и продукт. */
function LessonSketch() {
  return (
    <div aria-hidden className="rounded-lg border bg-card p-5 text-sm">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Урок 2 · шаг 2 из 3</span>
        <span className="flex gap-1">
          <span className="h-1.5 w-7 rounded-full bg-primary" />
          <span className="h-1.5 w-7 rounded-full bg-primary" />
          <span className="h-1.5 w-7 rounded-full bg-muted" />
        </span>
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

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <PublicShell width="wide" action={<Button nativeButton={false} render={<Link href="/login" />} size="sm" variant="outline">Войти</Button>}>
      <section className="grid items-center gap-10 py-14 md:grid-cols-[1.1fr_1fr] md:gap-14 md:py-24">
        <div>
          <p className="eyebrow text-primary-strong">Микрообучение по вашим материалам</p>
          <h1 className="mt-4 text-balance type-title md:type-display">
            Студенты практикуются по вашим материалам по&nbsp;пять минут в&nbsp;день
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Загрузите программу, методичку или конспект лекции. To Dual Learn соберёт из них короткие уроки с задачей
            и разберёт ответы студентов по критериям. Через день, неделю и месяц пройденное вернётся карточками.
          </p>
          <div className="mt-8">
            <EntryButtons />
            <p className="mt-3 text-sm text-muted-foreground">Бесплатно. Пароль не нужен: войдите по почте и имени.</p>
          </div>
        </div>
        <LessonSketch />
      </section>

      <section className="border-t py-14 md:py-20">
        <h2 className="type-heading md:type-title">Как это работает</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-primary pt-4">
              <span className="type-title tabular-nums text-primary-strong">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t py-14 md:py-20">
        <h2 className="type-heading md:type-title">Для кого</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SEGMENTS.map((segment) => (
            <div key={segment.title} className="rounded-lg border p-5">
              <h3 className="text-base font-semibold">{segment.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{segment.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t py-14 md:py-20">
        <div className="max-w-2xl">
          <h2 className="type-heading md:type-title">Что говорят исследования</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Это чужие исследования, а не результаты нашего продукта. Свои цифры опубликуем после первых пилотов.
          </p>
        </div>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {FINDINGS.map((finding) => (
            <li key={finding.title} className="flex flex-col rounded-lg border p-5">
              <h3 className="text-base font-semibold">{finding.title}</h3>
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

      <section className="border-t py-14 md:py-20">
        <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:gap-14">
          <h2 className="type-heading md:type-title">Кто делает</h2>
          <div>
            <p className="type-body text-muted-foreground">
              Команда To Dual Education. Мы преподаём в НИУ ВШЭ, в магистратуре ИИМУП «AI в маркетинге и продакт-менеджменте»,
              и ведём программы по ИИ для Яндекса, ВТБ и Сколково.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {TEAM.map((t) => (
                <li key={t} className="rounded-full border px-3 py-1 text-sm">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-14 rounded-lg bg-primary-soft p-6 md:mb-20 md:p-10">
        <div className="max-w-2xl">
          <h2 className="type-heading md:type-title">Попробуйте на своём материале</h2>
          <p className="mt-2 type-body text-muted-foreground">
            Преподаватель собирает курс и даёт студентам ссылку. Студент входит по ссылке или по коду курса.
          </p>
          <div className="mt-6">
            <EntryButtons />
            <p className="mt-3 text-sm text-muted-foreground">Бесплатно. Пароль не нужен: войдите по почте и имени.</p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
