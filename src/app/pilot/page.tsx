import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PublicShell } from "@/components/shared/PublicShell";
import { CONTACT_EMAIL, PILOT_MAILTO } from "@/lib/pilot";

/** Условия пилота для заказчика. Источник: docs/partnerships (hse-pilot-one-pager, corporate-vtb). Цену называем только после пилота. */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Пилот для компании или вуза",
  description: "Пилот TO DUAL Learn на одной группе: что входит, сроки, что нужно от заказчика и что вы получите.",
};

interface Block {
  title: string;
  items: string[];
}

const BLOCKS: Block[] = [
  {
    title: "Что входит",
    items: [
      "Установка, модель и сопровождение.",
      "6–15 уроков по пять минут из материалов вашей программы. Собираем вместе с вашим методистом или преподавателем, они правят и публикуют.",
      "Доступ для одной группы из 30–50 человек. Сотрудник или студент входит по почте.",
      "Разбор ответов группы: что ИИ предлагает поправить в курсе. Что принять, решает преподаватель.",
    ],
  },
  {
    title: "Сроки",
    items: [
      "4–6 недель.",
      "Около недели на подготовку после того, как мы получили материалы.",
      "Дальше группа проходит уроки, мы разбираем ответы в середине и в конце.",
      "Отчёт в конце пилота.",
    ],
  },
  {
    title: "Что нужно от вас",
    items: [
      "Одна программа, один ведущий и одна группа.",
      "Материалы программы и образовательные результаты. У вуза ещё 2–3 задания с критериями.",
      "Работы для проверки передаёте без имён, под кодами. Если участники входят по своей почте, нужно письменное решение ответственного за персональные данные: данные пилота пока лежат за границей. Подробности в разделе «Данные и безопасность».",
      "До полутора часов ведущего до старта и не больше двух часов в неделю во время пилота.",
      "Две встречи: на старте и по итогам.",
    ],
  },
  {
    title: "Что вы получите",
    items: [
      "Собранные из ваших материалов уроки, которые прошла группа.",
      "Отчёт на две страницы: сколько человек начали, вернулись на 7-й день и дошли до пятого урока.",
      "Два разбора ответов группы в виде «было → стало» по курсу.",
      "Расход на ИИ на одного человека.",
      "Для вуза по желанию: насколько оценка ИИ совпадает с оценкой преподавателя на 100 работах без имён. Оценку в ведомость ставит преподаватель.",
    ],
  },
  {
    title: "Чего пока нет",
    items: [
      "Входа через корпоративную учётную запись и лицензий на места.",
      "Установки в ваш контур и хранения данных в России. Модель можно подключить вашу через OpenAI-совместимый интерфейс, но база остаётся у нас.",
      "Договоров по 152-ФЗ с нашими поставщиками, журнала действий администраторов и процедуры по инцидентам: готовим до пилота.",
      "Сервис рассчитан на пользователей от 18 лет, школьные пилоты не проводим.",
      "Выводов об эффекте обучения: на группе в 30–50 человек мы показываем активность и возврат, а не прирост навыка.",
    ],
  },
];

export default function PilotPage() {
  return (
    <PublicShell width="wide" action={<Button nativeButton={false} render={<Link href="/login" />} size="sm" variant="outline">Войти</Button>}>
      <article className="max-w-2xl py-10 md:py-16">
        <p className="eyebrow text-primary-strong">Условия пилота</p>
        <h1 className="mt-4 text-balance type-title">Пилот для компании или вуза</h1>
        <p className="mt-5 type-body text-muted-foreground">
          Проверяем на одной группе, помогают ли короткие уроки по вашим материалам, и по цифрам решаем, продолжать ли.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} size="lg" render={<a href={PILOT_MAILTO} />}>Запросить пилот</Button>
          <Button nativeButton={false} size="lg" render={<Link href="/about/data" />} variant="outline">Данные и безопасность</Button>
        </div>

        <div className="mt-10 divide-y border-y">
          {BLOCKS.map((b) => (
            <section key={b.title} className="grid gap-3 py-6 md:grid-cols-[200px_1fr] md:gap-8">
              <h2 className="type-heading">{b.title}</h2>
              <ul className="list-disc space-y-1.5 pl-5 type-body text-muted-foreground">
                {b.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </section>
          ))}
          <section className="grid gap-3 py-6 md:grid-cols-[200px_1fr] md:gap-8">
            <h2 className="type-heading">Цена</h2>
            <p className="type-body text-muted-foreground">
              Пилот бесплатный. Цену на семестр или год назовём после пилота, по фактическому расходу. Продолжать платно вы не обязаны. Обязательства по конфиденциальности и удалению данных остаются по договору пилота.
            </p>
          </section>
          <section className="grid gap-3 py-6 md:grid-cols-[200px_1fr] md:gap-8">
            <h2 className="type-heading">Контакт</h2>
            <p className="type-body text-muted-foreground">
              Напишите на <a href={PILOT_MAILTO} className="text-primary-strong underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{CONTACT_EMAIL}</a>: кто вы, какая программа, сколько человек в группе и когда хотели бы
              начать.
            </p>
          </section>
        </div>
      </article>
    </PublicShell>
  );
}
