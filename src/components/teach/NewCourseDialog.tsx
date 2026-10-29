"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/shared/Notice";

interface DemoCourse {
  slug: string;
  title: string;
  short: string;
  note: string;
  /** Серверное действие, уже привязанное к slug. */
  action: () => Promise<void>;
}

interface Props {
  createAction: (formData: FormData) => Promise<void>;
  demos: DemoCourse[];
  /** Ошибка из адреса после неудачной отправки: окно открывается сразу, чтобы её показать. */
  error?: string;
  /** Кнопка-триггер: в заголовке страницы или в пустом состоянии. */
  variant?: "default" | "outline";
}

/** «Создать курс» открывает окно с формой: создание курса это действие на странице «Мои курсы», а не отдельный раздел. */
export function NewCourseDialog({ createAction, demos, error, variant = "default" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (error && ref.current && !ref.current.open) ref.current.showModal();
  }, [error]);

  return (
    <>
      <Button type="button" variant={variant} onClick={() => ref.current?.showModal()}>Создать курс</Button>
      <dialog
        ref={ref}
        aria-labelledby="new-course-title"
        className="m-auto w-[min(100%-2rem,36rem)] rounded-3xl border bg-background p-0 text-foreground backdrop:bg-foreground/30"
        onClick={(e) => { if (e.target === ref.current) ref.current.close(); }}
      >
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="new-course-title" className="type-heading">Новый курс</h2>
              <p className="mt-1 text-sm text-muted-foreground">Материалы и уроки добавите после.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => ref.current?.close()} aria-label="Закрыть">Закрыть</Button>
          </div>
          {error === "title" ? <Notice kind="error" className="mt-4">Введите название курса.</Notice> : null}
          {error === "seed" ? <Notice kind="error" className="mt-4">Файл курса-примера не найден. Попробуйте ещё раз или напишите нам.</Notice> : null}
          <form action={createAction} className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input id="title" name="title" required placeholder="Например, «Переговоры с клиентами»" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">О чём курс</Label>
              <Textarea id="description" name="description" rows={3} placeholder="Чему научатся и зачем" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Аудитория</Label>
              <Input id="audience" name="audience" placeholder="Маркетологи и продакты 25–40 лет" />
            </div>
            <Button type="submit" className="w-full">Создать курс</Button>
          </form>
          <div className="mt-6 border-t pt-5">
            <p className="text-sm font-medium">Или добавьте готовый курс-пример</p>
            <p className="mt-1 text-sm text-muted-foreground">Методичка и уроки уже опубликованы: удобно показать формат.</p>
            <ul className="mt-3 space-y-2">
              {demos.map((d) => (
                <li key={d.slug} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span><span className="font-medium">{d.title}</span><span className="text-muted-foreground">: {d.note}</span></span>
                  <form action={d.action}>
                    <Button type="submit" variant="outline" size="sm">Добавить</Button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </dialog>
    </>
  );
}
