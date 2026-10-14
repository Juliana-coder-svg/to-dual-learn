import Link from "next/link";
import { headers } from "next/headers";
import { teacherCourse, noCourseAccess } from "@/lib/auth/access";
import { listLessonSummaries } from "@/lib/db/queries";
import { yandexConfig } from "@/lib/auth/yandex";
import { MINUTES_PER_LESSON, inviteText } from "@/lib/invite";
import { SectionHeader } from "@/components/shared/PageHeader";
import { Notice } from "@/components/shared/Notice";
import { CopyButton } from "@/components/teach/CopyButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { plural } from "@/lib/utils/format";

export const metadata = { title: "Отправить студентам" };

/** Адрес сайта для ссылки: из настроек, иначе из заголовков запроса (за прокси Vercel нужен x-forwarded-*). */
async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function SharePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const [ctx, lessons] = await Promise.all([teacherCourse(courseId), listLessonSummaries(courseId)]);
  if (!ctx) return noCourseAccess(`/teach/${courseId}/share`);
  const { course } = ctx;
  const published = lessons.filter((l) => l.status === "published").length;
  const link = `${await siteOrigin()}/join/${course.join_code}`;
  const yandex = Boolean(yandexConfig());
  const text = inviteText({ title: course.title, lessons: published, link, code: course.join_code, yandex });

  return (
    <div className="max-w-3xl">
      <SectionHeader title="Отправить студентам" description="Скопируйте приглашение и отправьте в чат или на почту. Студент откроет ссылку, войдёт и сразу окажется на курсе." />

      {published === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-5">
          <p className="font-medium">Ссылка пока не готова</p>
          <p className="mt-1 text-sm text-muted-foreground">
            В курсе нет опубликованных уроков: студент записался бы и увидел пустой курс. Опубликуйте хотя бы один урок, и здесь появится приглашение.
          </p>
          <Button nativeButton={false} render={<Link href={`/teach/${courseId}/lessons`} />} size="lg" className="mt-4">К урокам</Button>
        </div>
      ) : (
        <>
          {published < lessons.length ? (
            <Notice className="mt-6">
              Опубликовано {published} из {plural(lessons.length, "урока", "уроков", "уроков")}. Студенты увидят только опубликованные, остальные откроются, когда вы их опубликуете.
            </Notice>
          ) : null}

          <section className="mt-6">
            <h3 className="type-heading">Приглашение</h3>
            <Textarea id="invite-text" readOnly rows={9} value={text} className="mt-3 bg-surface leading-relaxed" aria-label="Текст приглашения" />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <CopyButton text={text} label="Скопировать приглашение" fieldId="invite-text" />
            </div>
          </section>

          <section className="mt-8">
            <h3 className="type-heading">Только ссылка</h3>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input id="invite-link" readOnly value={link} aria-label="Ссылка на курс" className="min-w-0 flex-1 font-mono" />
              <CopyButton text={link} label="Скопировать ссылку" variant="outline" fieldId="invite-link" />
            </div>
            <p className="mt-2 type-caption text-muted-foreground">Код для ввода вручную: <span className="font-mono font-semibold tracking-wider text-foreground">{course.join_code}</span></p>
          </section>
        </>
      )}

      <section className="mt-10 border-t pt-8">
        <h3 className="type-heading">Что увидит студент</h3>
        <ol className="mt-4 list-decimal space-y-2 pl-5 type-body">
          <li>Откроет ссылку: название курса «{course.title}», ваше имя и число уроков. Нажмёт «Войти и записаться».</li>
          <li>Войдёт {yandex ? "через Яндекс ID или по почте" : "по почте"} и согласится на обработку данных. Это один раз.</li>
          <li>Окажется в курсе и откроет первый урок: идея, задача, разбор. Около {MINUTES_PER_LESSON} минут, дальше по одному уроку в день.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">Кто записался и кто сдал, видно на вкладке «<Link href={`/teach/${courseId}/students`} className="underline underline-offset-4 hover:text-foreground">Студенты</Link>».</p>
      </section>
    </div>
  );
}
