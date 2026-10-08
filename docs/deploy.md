# Выкладка на Vercel

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
| `ALLOW_DIRECT_LOGIN` | `1` включает вход без письма на стенде для показа. В production без неё вход только по ссылке на почту; адрес `<домен>/auth/callback` должен быть в Redirect URLs проекта Supabase |
| `CRON_SECRET` | Обязательно. Vercel подставляет его в заголовок cron-запроса к `/api/cron/daily`; без переменной маршрут отвечает 401 и письма не уходят |
| `RESEND_API_KEY`, `MAIL_FROM` | Письма «урок дня», необязательно |

Порядок выкладки изменений схемы: сначала выполнить новые файлы из `supabase/migrations/` в SQL Editor, потом деплоить код. Код, который ждёт таблицу `consents` или колонки `lessons.reviewed_*`, без миграции падает на каждой странице с сессией.

Таймауты: маршруты с `maxDuration = 300` (сборка уроков, проверка работ, извлечение PDF) требуют тариф с лимитом функции не меньше 300 секунд. На бесплатном тарифе лимит 60 секунд, тогда большие PDF и сборку 10 уроков придётся делать частями.

Крон из `vercel.json` (06:00 UTC, то есть 09:00 по Москве) включается автоматически после выкладки.
