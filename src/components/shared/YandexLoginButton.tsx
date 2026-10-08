import { startYandexLogin } from "@/lib/actions/yandex";
import { yandexConfig } from "@/lib/auth/yandex";
import { buttonVariants } from "@/components/ui/button";

/** Тексты ошибок входа через Яндекс. Приходят в /login?yandex=…, отдельно от ?error=,
 *  чтобы не пересекаться с ошибками формы почты. */
const YANDEX_ERRORS: Record<string, string> = {
  off: "Вход через Яндекс сейчас недоступен. Войдите по почте.",
  denied: "Вы не разрешили вход через Яндекс. Можно войти по почте.",
  state: "Вход через Яндекс прервался. Нажмите кнопку ещё раз.",
  email: "В вашем Яндекс ID нет подтверждённой почты. Добавьте её на id.yandex.ru или войдите по почте.",
  failed: "Яндекс не ответил. Попробуйте ещё раз через минуту или войдите по почте.",
};

/** Кнопка «Войти с Яндекс ID». Ставится внутрь формы входа: берёт из неё роль и адрес возврата,
 *  а почту и имя не требует (formNoValidate). Без YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET не рисуется. */
export function YandexLoginButton({ error }: { error?: string }) {
  if (!yandexConfig()) return null;
  const message = error ? YANDEX_ERRORS[error] : undefined;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        или
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="submit"
        formAction={startYandexLogin}
        formNoValidate
        className={buttonVariants({ variant: "outline", className: "w-full" })}
      >
        Войти с Яндекс ID
      </button>
      <p className="text-xs text-muted-foreground">
        Войдём с основной почтой вашего Яндекс ID. Если раньше вы входили с другой почтой, введите её выше.
      </p>
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
    </div>
  );
}
