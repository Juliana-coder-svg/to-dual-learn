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

export const runtime = "nodejs";
export const maxDuration = 300;

/** Письмо «урок дня». Запускается кроном (vercel.json) раз в сутки; защищено CRON_SECRET.
 *  Одному пользователю — не чаще раза в 20 часов, чтобы повторный запуск не дублировал письма. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const cutoff = Date.now() - 20 * 60 * 60 * 1000;
  let sent = 0;
  let skipped = 0;
  for (const user of listUsersForDigest()) {
    if (user.last_digest_at && new Date(user.last_digest_at).getTime() > cutoff) continue;
    const items: string[] = [];
    for (const course of listCoursesForStudent(user.id)) {
      const lessons = listLessons(course.id, { publishedOnly: true });
      const done = latestSubmissionsForCourse(user.id, course.id);
      const next = lessons.find((l) => !done.has(l.id));
      if (next) items.push(`<li><a href="${site}/learn/${course.id}/lesson/${next.id}">${course.title}: урок ${next.position} «${next.title}»</a></li>`);
    }
    const due = countDueFlashcards(user.id);
    if (items.length === 0 && due === 0) continue;
    const html = `<p>${user.name}, на сегодня:</p>
<ul>${items.join("")}${due > 0 ? `<li><a href="${site}/learn/review">Повторить карточки: ${due}</a></li>` : ""}</ul>
<p>Пять минут, и серия ${user.streak > 0 ? `дойдёт до ${user.streak + 1}` : "начнётся"}.</p>
<p style="color:#888;font-size:12px">Отключить письма можно на <a href="${site}/learn">странице курсов</a>.</p>`;
    const result = await sendMail(user.email, items.length > 0 ? "Урок дня ждёт" : "Пора повторить карточки", html);
    if (result === "sent") { sent++; markDigestSent(user.id); } else skipped++;
  }
  return NextResponse.json({ ok: true, sent, skipped });
}
