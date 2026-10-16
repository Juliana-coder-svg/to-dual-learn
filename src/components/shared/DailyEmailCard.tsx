import type { User } from "@/lib/db/queries";
import { setDailyEmailAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

/** Включить или выключить письмо с уроком дня. Стоит там, где человек ищет это сам: у студента на /learn,
 *  у преподавателя на /teach, у всех в «Моих данных». next: куда вернуться после нажатия. */
export function DailyEmailCard({ user, next }: { user: User; next: "/learn" | "/teach" | "/account/data" }) {
  const teacher = user.role === "teacher";
  return (
    <section className={next === "/account/data" ? "panel" : "panel-soft"}>
      <h2 className="text-base font-semibold">Письмо с уроком дня</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {teacher
          ? `Если вы сами учитесь на курсах, каждое утро на ${user.email} приходит письмо: какой урок ждёт и сколько карточек пора повторить. О ваших студентах письма нет.`
          : `Каждое утро на ${user.email} приходит письмо: какой урок ждёт и сколько карточек пора повторить.`}
      </p>
      <form action={setDailyEmailAction} className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2">
          <span aria-hidden className={`size-2 rounded-full ${user.daily_email ? "bg-primary" : "bg-border"}`} />
          {user.daily_email ? "Включено" : "Выключено"}
        </span>
        <input type="hidden" name="enabled" value={user.daily_email ? "0" : "1"} />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" variant="outline" size="sm">{user.daily_email ? "Выключить" : "Включить"}</Button>
      </form>
    </section>
  );
}
