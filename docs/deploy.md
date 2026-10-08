# Выкладка на Vercel

> Для продакшена с данными граждан РФ используется переезд в Selectel: см. `docs/deploy-selectel.md`. Vercel остаётся для демо без персональных данных.

## Предусловия

- База и вход переведены на Supabase (ветка сессии переезда влита в main). На Vercel файловая система не сохраняется между запросами, поэтому `node:sqlite` там работать не будет.
- Аккаунт Vercel. Вход через CLI: `npx vercel login`, дальше подтверждение в браузере.

## Первая выкладка

```bash
npx vercel
```

CLI спросит область (scope), имя проекта и папку. Соглашаемся с определением Next.js. Первая выкладка уходит в preview-адрес, production получаем командой `npx vercel --prod`.

## Переменные окружения

Задаются в Vercel: Project → Settings → Environment Variables, для Production и Preview.

| Переменная | Что это |
|---|---|
| `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_MODEL` | Модель через OpenRouter (Anthropic Messages API). Либо вместо них `ANTHROPIC_API_KEY` для Anthropic напрямую |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `SESSION_SECRET` | Длинная случайная строка, если cookie-сессия ещё используется |
| `NEXT_PUBLIC_SITE_URL` | Публичный адрес, для ссылок в письмах и приглашениях |
| `CRON_SECRET` | Vercel подставляет его в заголовок cron-запроса к `/api/cron/daily` |
| `RESEND_API_KEY`, `MAIL_FROM` | Письма «урок дня», необязательно |
| `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` | Вход через Яндекс ID, необязательно. Без них кнопки на `/login` нет. Secret отметить как Sensitive. См. раздел «Яндекс ID» |

Таймауты: маршруты с `maxDuration = 300` (сборка уроков, проверка работ, извлечение PDF) требуют тариф с лимитом функции не меньше 300 секунд. На бесплатном тарифе лимит 60 секунд, тогда большие PDF и сборку 10 уроков придётся делать частями.

Крон из `vercel.json` (06:00 UTC, то есть 09:00 по Москве) включается автоматически после выкладки.

## Яндекс ID

Вход через Яндекс ID работает поверх Supabase Auth: Яндекс подтверждает почту, а сервер выпускает сессию Supabase по этой почте (`src/app/auth/yandex/callback/route.ts`). Провайдер Яндекса в Supabase не включается, настройки Supabase не меняются.

1. Создать приложение: https://oauth.yandex.ru/client/new (нужен аккаунт Яндекса владельца продукта, не личный). Название и иконка видны пользователю на экране «Разрешить доступ».
2. Платформа: «Веб-сервисы». Redirect URI, по одному на строку:
   - `https://to-dual-daily.vercel.app/auth/yandex/callback`
   - `http://localhost:3000/auth/yandex/callback`
   - после переезда на Selectel (`docs/deploy-selectel.md`) добавить `https://<боевой домен>/auth/yandex/callback`.
   Яндекс принимает только адреса из этого списка, поэтому на preview-деплоях Vercel вход не заработает: у них другой хост.
3. Доступ к данным, ровно два права: «Доступ к адресу электронной почты» (`login:email`) и «Доступ к логину, имени и фамилии, полу» (`login:info`). Других не добавлять: список `scope` в коде (`src/lib/auth/yandex.ts`) должен совпадать с правами приложения, иначе Яндекс ответит `invalid_scope`.
4. После сохранения Яндекс покажет ClientID и Client secret. Положить их в Vercel: Project → Settings → Environment Variables, `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET`, только для Production, secret с флагом Sensitive. Для Preview не задавать: кнопка там просто скрыта.
5. `NEXT_PUBLIC_SITE_URL` на Production должен в точности совпадать с адресом из Redirect URI (без завершающего `/`), иначе Яндекс вернёт `redirect_uri mismatch`.
6. Передеплоить и проверить сценарий из `docs/daily/2026-10-08/yandex-login.md`.

Ограничения: Яндекс отдаёт одну почту (`default_email`), её и используем. Пользователь с другой почтой в профиле получит второй аккаунт без прогресса, объединения аккаунтов нет. Токены Яндекса не хранятся. Если в Supabase выключить «Allow new users to sign up», новые пользователи через Яндекс входить перестанут, как и в режиме без письма.

### Проверить обмен кода на токен вручную

Нужно, когда вход падает с `yandex=failed`, а в логе Vercel строка `[auth] yandex failed: token …` или `info …`. Ключи берутся из того же `.env.local`.

```bash
set -a; source .env.local; set +a
open "https://oauth.yandex.ru/authorize?response_type=code&client_id=$YANDEX_CLIENT_ID&redirect_uri=http://localhost:3000/auth/yandex/callback&scope=login:email%20login:info&state=manual"
```

Браузер после «Разрешить» перейдёт на `http://localhost:3000/auth/yandex/callback?code=…&state=manual`. Если dev-сервер не запущен, код виден в адресной строке. Код живёт 10 минут и одноразовый.

```bash
curl -s -X POST https://oauth.yandex.ru/token -d grant_type=authorization_code -d code=КОД -d client_id="$YANDEX_CLIENT_ID" -d client_secret="$YANDEX_CLIENT_SECRET"
```

Ответ `{"access_token": "...", "expires_in": ..., "token_type": "bearer"}`. Ошибки: `invalid_client` — не те ключи, `invalid_grant` — код устарел или уже использован, `redirect_uri mismatch` на предыдущем шаге — адрес не в списке приложения.

```bash
curl -s -H "Authorization: OAuth ТОКЕН" "https://login.yandex.ru/info?format=json"
```

В ответе нужны `default_email` (и тот же адрес в `emails`) и `real_name` или `display_name`. Нет `default_email` — у приложения нет права `login:email` или у аккаунта нет почты.
