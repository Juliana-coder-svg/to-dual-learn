import { NextResponse } from "next/server";
import {
  countDueFlashcards,
  latestSubmissionsForCourse,
  listCoursesForStudent,
  listLessons,
  listUsersForDigest,
  markDigestSent,
} from "@/lib/db/queries";
import { sendMail } from "@/lib/mail";
import { runAsService } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Письмо «урок дня». Запускается кроном (vercel.json) раз в сутки; защищено CRON_SECRET.
 *  Без секрета маршрут закрыт: он работает от service role и читает всех пользователей,
 *  поэтому открывать его «по умолчанию» нельзя.
 *  Одному пользователю — не чаще раза в 20 часов, чтобы повторный запуск не дублировал письма.
 *  У крона нет пользователя, поэтому запросы идут от service role: RLS не применяется. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const cutoff = Date.now() - 20 * 60 * 60 * 1000;
  return runAsService(async () => {
  let sent = 0;
  let skipped = 0;
  for (const user of await listUsersForDigest()) {
    if (user.last_digest_at && new Date(user.last_digest_at).getTime() > cutoff) continue;
    const items: string[] = [];
    for (const course of await listCoursesForStudent(user.id)) {
      const lessons = await listLessons(course.id, { publishedOnly: true });
      const done = await latestSubmissionsForCourse(user.id, course.id);
      const next = lessons.find((l) => !done.has(l.id));
      if (next) items.push(`<li><a href="${site}/learn/${course.id}/lesson/${next.id}">${course.title}: урок ${next.position} «${next.title}»</a></li>`);
    }
    const due = await countDueFlashcards(user.id);
    if (items.length === 0 && due === 0) continue;
    const html = `<p>${user.name}, на сегодня:</p>
<ul>${items.join("")}${due > 0 ? `<li><a href="${site}/learn/review">Повторить карточки: ${due}</a></li>` : ""}</ul>
<p>Пять минут, и серия ${user.streak > 0 ? `дойдёт до ${user.streak + 1}` : "начнётся"}.</p>
<p style="color:#888;font-size:12px">Отключить письма можно на <a href="${site}/learn">странице курсов</a>.</p>`;
    const result = await sendMail(user.email, items.length > 0 ? "Ваш урок на сегодня" : "Пора повторить карточки", html);
    if (result === "sent") { sent++; await markDigestSent(user.id); } else skipped++;
  }
  return NextResponse.json({ ok: true, sent, skipped });
  });
}
