import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { enroll, getCourseByJoinCode } from "@/lib/db/queries";

/** Ссылка-приглашение: /join/КОД. Без сессии ведёт на вход и возвращает сюда. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const course = await getCourseByJoinCode(code);
  if (!course) redirect("/learn?error=code");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?role=student&next=${encodeURIComponent(`/join/${code}`)}`);
  if (course.owner_id !== user.id) await enroll(user.id, course.id);
  redirect(`/learn/${course.id}`);
}
