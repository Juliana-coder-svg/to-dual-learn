import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

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

function EntryButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button nativeButton={false} render={<Link href="/login?role=teacher" />} size="lg">Я преподаватель</Button>
      <Button nativeButton={false} render={<Link href="/login?role=student" />} size="lg" variant="outline">Я студент</Button>
    </div>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <span className="whitespace-nowrap text-base font-semibold tracking-tight"><span className="text-primary">To Dual</span> Learn</span>
          <Button nativeButton={false} render={<Link href="/login" />} size="sm">Войти</Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <section>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Студенты практикуются по вашим материалам по&nbsp;пять минут в&nbsp;день
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Загрузите программу, методичку или конспект лекции. To Dual Learn соберёт из них короткие уроки с задачей
            и разберёт ответы студентов по критериям. Через день, неделю и месяц пройденное вернётся карточками.
          </p>
          <div className="mt-10">
            <EntryButtons />
            <p className="mt-3 text-sm text-muted-foreground">Бесплатно. Пароль не нужен: войдите по почте и имени.</p>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Как это работает</h2>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4 rounded-lg border p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary text-sm font-medium text-primary">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Для кого</h2>
          <div className="mt-6 space-y-6">
            {SEGMENTS.map((segment) => (
              <div key={segment.title} className="border-l-2 border-primary pl-4">
                <h3 className="font-medium">{segment.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{segment.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight">Что говорят исследования</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Это чужие исследования, а не результаты нашего продукта. Свои цифры опубликуем после первых пилотов.
          </p>
          <ul className="mt-6 space-y-4">
            {FINDINGS.map((finding) => (
              <li key={finding.title} className="rounded-lg border p-5">
                <h3 className="font-medium">{finding.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{finding.text}</p>
                <a
                  href={finding.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-primary underline underline-offset-4 hover:no-underline"
                >
                  {finding.source}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20 border-t pt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Кто делает</h2>
          <p className="mt-4 text-muted-foreground">
            Команда To Dual Education. Мы преподаём в НИУ ВШЭ, в магистратуре ИИМУП «AI в маркетинге и продакт-менеджменте»,
            и ведём программы по ИИ для Яндекса, ВТБ и Сколково.
          </p>
        </section>

        <section className="mt-20 rounded-lg border p-6">
          <h2 className="text-2xl font-semibold tracking-tight">Попробуйте на своём материале</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Преподаватель собирает курс и даёт студентам ссылку. Студент входит по ссылке или по коду курса.
          </p>
          <div className="mt-6">
            <EntryButtons />
            <p className="mt-3 text-sm text-muted-foreground">Бесплатно. Пароль не нужен: войдите по почте и имени.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
