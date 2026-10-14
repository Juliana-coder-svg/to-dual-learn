import type { CourseSummary } from "@/lib/db/queries";

/** Cookie «Скрыть» с панели «С чего начать». */
export const START_HIDDEN_COOKIE = "tdd_start_hidden";

export type StepState = "done" | "current" | "next";

export interface TeacherStep {
  id: "materials" | "lessons" | "send";
  title: string;
  text: string;
  /** Подпись у выполненного шага: что именно уже есть. */
  doneNote: string;
  action: string;
  href: string;
  state: StepState;
}

/** Куда вести с шага: первый курс, которому шаг ещё нужен, иначе первый курс. */
function pick(courses: CourseSummary[], needs: (c: CourseSummary) => boolean): CourseSummary | undefined {
  return courses.find(needs) ?? courses[0];
}

/** Три шага считаются по данным курсов, отдельной таблицы нет: материалы есть, есть опубликованный урок, есть записавшийся студент. */
export function teacherSteps(courses: CourseSummary[]): TeacherStep[] {
  const hasMaterials = courses.some((c) => c.materials > 0);
  const hasPublished = courses.some((c) => c.published > 0);
  const hasStudents = courses.some((c) => c.students > 0);
  const done = [hasMaterials, hasPublished, hasStudents];
  const firstOpen = done.indexOf(false);
  const state = (i: number): StepState => (done[i] ? "done" : i === firstOpen ? "current" : "next");

  const forMaterials = pick(courses, (c) => c.materials === 0);
  const forLessons = pick(courses, (c) => c.materials > 0 && c.published === 0);
  const forSend = pick(courses, (c) => c.published > 0 && c.students === 0);

  return [
    {
      id: "materials",
      title: "Загрузите материалы",
      text: "Программа, методичка, статья или конспект: уроки соберутся из них. Материалов под рукой нет? Добавьте готовый курс-пример и посмотрите, как всё устроено.",
      doneNote: "Материалы загружены",
      action: forMaterials ? "Загрузить материалы" : "Создать курс",
      href: forMaterials ? `/teach/${forMaterials.course.id}` : "/teach#new-course",
      state: state(0),
    },
    {
      id: "lessons",
      title: "Соберите и опубликуйте уроки",
      text: "ИИ предложит черновики уроков по пять минут. Откройте урок, поправьте и нажмите «Опубликовать»: пока этого нет, студенты урок не видят.",
      doneNote: "Есть опубликованный урок",
      action: "Собрать уроки",
      href: forLessons ? `/teach/${forLessons.course.id}/lessons` : "/teach#new-course",
      state: state(1),
    },
    {
      id: "send",
      title: "Отправьте ссылку студентам",
      text: "Скопируйте готовое приглашение и отправьте в чат группы. Шаг отметится, когда запишется первый студент.",
      doneNote: "Есть записавшийся студент",
      action: "Отправить студентам",
      href: forSend ? `/teach/${forSend.course.id}/share` : "/teach#new-course",
      state: state(2),
    },
  ];
}

export const allStepsDone = (steps: TeacherStep[]) => steps.every((s) => s.state === "done");
