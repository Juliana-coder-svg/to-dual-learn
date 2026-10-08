# Переезд в Selectel: база, приложение, почта, вход

Дата: 8 октября 2026. Заменяет `docs/deploy.md` (Vercel) для продакшена, когда переезд завершён. OpenRouter остаётся, пока не выбрана российская модель.

Зачем: требование локализации, ст. 18 ч. 5 152-ФЗ (см. `docs/legal/data-map.md`, раздел 7.1, вариант В).

Что проверено, а что нет:
- Проверено: сборка `NEXT_OUTPUT=standalone npm run build` проходит, `node .next/standalone/server.js` отдаёт страницу, `npm run type-check` и `npm run lint` чистые. Ревьюер сверил имена переменных и портов с текущим шаблоном `supabase/docker` (master на 8 октября 2026).
- Не проверено: образ в Docker (на машине разработки Docker нет), отправка на настоящий SMTP, весь стенд Supabase целиком, интерфейс Selectel. Первый запуск делайте на тестовой ВМ и пройдите проверку из шага 10 до переключения.
- Официальная документация, с которой сверяться: [Supabase self-hosting с Docker](https://supabase.com/docs/guides/self-hosting/docker).

## Что куда переезжает

| Было | Станет |
|---|---|
| Supabase Cloud (регион вне РФ) | Supabase self-hosted в Docker на ВМ в Selectel |
| Vercel | Docker-контейнер с Next.js (`Dockerfile`) за Caddy на той же ВМ |
| Cron Vercel (`vercel.json`) | cron на ВМ, команда в шаге 7 |
| Resend, встроенная почта Supabase | свой SMTP (шаг 6) |
| OpenRouter | остаётся |

## 0. Что делаете вы

Оформляет Юлиана, у меня нет доступа и платёжных данных:
1. Аккаунт Selectel на юрлицо, договор. В договоре или приложении к нему запросить аттестат или заключение о соответствии 152-ФЗ для выбранного сегмента (Selectel заявляет такие сегменты, проверить) и условия поручения обработки (ст. 6 ч. 3).
2. Домен и доступ к DNS. Нужны две записи: `learn.<домен>` и `api.learn.<домен>`.
3. Почтовый сервис с SMTP (Unisender Go, Yandex Cloud Postbox, Mailganer или другой) и подтверждённый домен отправителя. Уточнить, открыт ли исходящий порт для SMTP на ВМ (у облачных провайдеров порт 25 часто закрыт; используйте 587 или 465).

## 1. Виртуальная машина

Рекомендация на старт, оценка (проверить по расчёту Selectel): Ubuntu 24.04 LTS, 4 vCPU, 8 ГБ RAM, SSD 80 ГБ.

1. Регион: любой дата-центр в РФ.
2. Публичный IPv4. **Группа безопасности Selectel — главная защита портов:** входящие только 22 (лучше ограничить вашим IP), 80 и 443. Остальное закрыто. `ufw` Docker обходит (он пишет свои правила iptables), поэтому на него не рассчитываем.
3. Включить регулярные снимки диска и записать срок хранения: он попадёт в политику (`docs/legal/privacy-policy.md`, раздел 7).
4. Вход по SSH-ключу, пароль отключить.
5. DNS: A-записи `learn.<домен>` и `api.learn.<домен>` на IP машины.

## 2. Docker на ВМ

```bash
sudo apt update && sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # перелогиниться
```

## 3. Код

```bash
sudo mkdir -p /opt/todual && sudo chown $USER /opt/todual
git clone <адрес репозитория> /opt/todual/app && cd /opt/todual/app
git checkout claude/ru-migration   # после влития ветки в main: git checkout main
```

## 4. Секреты

Генерируем на ВМ, не в чате и не в git. Хранить в менеджере паролей.

```bash
openssl rand -hex 32   # CRON_SECRET
openssl rand -hex 32   # POSTGRES_PASSWORD (hex: символы / и + из base64 ломают URL подключения у сервисов Supabase)
```

Остальные секреты Supabase (`JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `SECRET_KEY_BASE`, `VAULT_ENC_KEY`, `PG_META_CRYPTO_KEY`, токены Logflare, ключи S3 и прочее) генерирует скрипт из шаблона Supabase, см. шаг 5. Руками их не придумываем.

## 5. Supabase

```bash
sudo mkdir -p /opt/supabase && sudo chown $USER /opt/supabase
git clone --depth 1 https://github.com/supabase/supabase /tmp/supabase
git -C /tmp/supabase rev-parse HEAD   # записать версию (хеш) в журнал обслуживания
cp -r /tmp/supabase/docker/. /opt/supabase/ && cd /opt/supabase
cp .env.example .env
sh utils/generate-keys.sh             # генерирует секреты; точное имя и вывод скрипта сверить с документацией
```

В `/opt/supabase/.env` проверить и задать (имена по текущему шаблону, сверить):
- `POSTGRES_PASSWORD` (из шага 4), `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD` — не значения по умолчанию;
- после генерации убедиться, что **ни один секрет не совпадает с `.env.example`** (`diff` по строкам с `KEY`, `SECRET`, `PASSWORD`, `TOKEN`);
- `SITE_URL=https://learn.<домен>`, `API_EXTERNAL_URL=https://api.learn.<домен>`, `SUPABASE_PUBLIC_URL=https://api.learn.<домен>`;
- `ADDITIONAL_REDIRECT_URLS=https://learn.<домен>/auth/callback`;
- `ENABLE_EMAIL_SIGNUP=true`, `ENABLE_EMAIL_AUTOCONFIRM=false`, `ENABLE_ANONYMOUS_USERS=false`;
- **`ENABLE_PHONE_SIGNUP=false` и `ENABLE_PHONE_AUTOCONFIRM=false`**: по умолчанию в шаблоне включены, и с публичным anon-ключом можно без проверки почты создать подтверждённого пользователя через `POST /auth/v1/signup` с телефоном и паролем. Проверить на поднятом стенде, что запрос с телефоном отклоняется;
- почта: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME` (те же данные, что в шаге 6).

**Порты.** Шаблон публикует на всех интерфейсах шлюз (`8000`, `8443`), Postgres и пулер (`5432`, `6543`). Docker обходит `ufw`, поэтому эти порты нельзя оставлять опубликованными. В `/opt/supabase/docker-compose.yml` удалить секции `ports:` у шлюза и пулера (supavisor) или привязать их к `127.0.0.1:...`. Caddy ходит к шлюзу по внутренней сети Docker (`api-gw:8000`), публикация не нужна. Имя сервиса шлюза проверить командой `docker compose ps`: в текущем шаблоне это Envoy `api-gw`, раньше был `kong`. Если имя другое, задать его в `SUPABASE_GATEWAY` (шаг 7).

Studio (панель базы с SQL) в Caddy не проксируется: её открывают только через SSH-туннель к ВМ.

```bash
docker compose pull && docker compose up -d
docker compose ps    # все сервисы healthy
docker network ls    # имя сети Supabase понадобится в шаге 7 (по умолчанию supabase_default)
```

Миграция схемы (в одной транзакции, остановится при первой ошибке):

```bash
docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -1 < /opt/todual/app/supabase/migrations/0001_init.sql
```

Миграции сессии `legal-dev` (0002 и далее) применить так же, по порядку номеров.

## 6. Почта

1. В панели почтового сервиса: домен отправителя, записи SPF, DKIM, DMARC в DNS (без них письма со ссылкой входа попадают в спам).
2. SMTP-данные внести в `/opt/supabase/.env` (письма входа, переменная пароля `SMTP_PASS`) и в `deploy/selectel/.env` (письма «урок дня»; приложение читает `SMTP_PASSWORD`, а при его отсутствии `SMTP_PASS`, см. `src/lib/mail.ts`).
3. Порты: 587 (STARTTLS) или 465 (TLS с первого байта). Если задан `SMTP_USER`, пароль обязателен: приложение иначе не отправит письмо и напишет ошибку в лог.
4. Проверка: войти на сайте почтой, убедиться, что ссылка пришла и ведёт на `https://learn.<домен>/auth/callback`.

Ошибка отправки одному адресу не останавливает рассылку остальным; в логе остаётся только маска адреса и код ошибки SMTP.

## 7. Приложение

```bash
cd /opt/todual/app/deploy/selectel
cp .env.example .env && chmod 600 .env   # заполнить, ключи ANON_KEY и SERVICE_ROLE_KEY из шага 5
docker compose --env-file .env up -d --build
docker compose ps
```

Что делает compose: `app` — Next.js; `caddy` — HTTPS и маршрутизация (`learn.<домен>` на приложение, `api.learn.<домен>` на шлюз Supabase, наружу только `/auth/v1/*` и `/rest/v1/*`, остальное 404). Контейнер `app` обращается к API Supabase через публичный домен, но запись `extra_hosts` отправляет запрос на Caddy этой же ВМ, поэтому зависимость от петли через NAT облака не возникает.

Крон «урок дня», 09:00 по Москве. Часовой пояс задаём в самом crontab, лог пишем в домашнюю папку:

```bash
( crontab -l 2>/dev/null; cat <<'EOF'
CRON_TZ=Europe/Moscow
0 9 * * * cd /opt/todual/app/deploy/selectel && docker compose exec -T app wget -T 120 -qO- --header="Authorization: Bearer $(grep ^CRON_SECRET .env | cut -d= -f2)" http://127.0.0.1:3000/api/cron/daily >> $HOME/todual-cron.log 2>&1
EOF
) | crontab -
```

Вручную проверить: команда из строки без `0 9 * * *` должна вернуть JSON `{"ok":true,...}`, а такой же запрос без заголовка — 401.

**Режим входа и крон** в `deploy/selectel/.env`: `AUTH_LOGIN_MODE=magic`, `CRON_SECRET` непустой. Если в коде эти значения по умолчанию ещё опасны (режим `direct`, открытый крон без секрета), их закрывает сессия `legal-dev` (задача «безопасность» из `docs/legal/data-map.md`, раздел 7.5); до её слияния проверьте оба пункта вручную в шаге 10.

Обновление приложения:

```bash
cd /opt/todual/app && git pull && cd deploy/selectel && docker compose --env-file .env up -d --build
```

## 8. Данные из старой базы

Если в Supabase Cloud только тестовые данные, проще начать с чистой базы и удалить старый проект: персональные данные не переезжают и не остаются за границей. Если нужны пользователи и курсы, перенос требует аккуратности и **не отрабатывался**: репетируйте на копии.

Предварительные замечания:
- `auth.users` и `auth.identities` из облака и из self-hosted GoTrue могут отличаться набором колонок, залить «как есть» может не получиться; проверить `\d auth.users` в обеих базах;
- отключение триггеров и `session_replication_role = replica` требуют суперпользователя. В образе Supabase это `supabase_admin`, а не `postgres`;
- триггер `on_auth_user_created` создаёт профиль при вставке в `auth.users`, поэтому данные профилей заливать с отключёнными триггерами, иначе будет конфликт.

План: `pg_dump --data-only` для схемы `public` и отдельно для `auth.users`, `auth.identities` (флаг `--schema` с `-t` не комбинируется, делать двумя запусками), залить в новую базу под `supabase_admin` с `session_replication_role = replica`, сверить число строк по каждой таблице.

Решение «чистая база или перенос» принимает Юлиана. Этот шаг не выполнять до её ответа.

## 9. Резервные копии (до переключения)

Бэкап нужно настроить и один раз восстановить из него **до** удаления старых проектов.

```bash
mkdir -p $HOME/backups
( crontab -l 2>/dev/null; cat <<'EOF'
CRON_TZ=Europe/Moscow
30 3 * * * cd /opt/supabase && docker compose exec -T db pg_dump -U postgres -d postgres -Fc > $HOME/backups/todual-$(date +\%F).dump 2>> $HOME/todual-backup.log
EOF
) | crontab -
```

Копии вывозить в объектное хранилище Selectel (S3-совместимое, настроить доступ отдельным ключом) и хранить [срок, фиксируем в политике]. Снимок диска с работающим Postgres согласован только как после аварийного отключения и как единственный бэкап не годится.

Проверка восстановления (на тестовой ВМ или в отдельной базе): `pg_restore --dbname=... --clean --if-exists todual-<дата>.dump`, затем сверить число строк.

## 10. Проверка перед переключением

- [ ] `https://learn.<домен>` открывается, сертификат действителен.
- [ ] Вход по ссылке: письмо пришло, не в спаме, ссылка ведёт на свой домен.
- [ ] Вход без письма выключен (`AUTH_LOGIN_MODE=magic`; без этой переменной в старом коде включался `direct`).
- [ ] Запрос регистрации по телефону на `https://api.learn.<домен>/auth/v1/signup` отклонён.
- [ ] `https://api.learn.<домен>/` и пути вне `/auth/v1`, `/rest/v1` отвечают 404 (Studio не видна).
- [ ] Две учётные записи студента не видят ответы друг друга; преподаватель видит свой курс.
- [ ] `curl https://learn.<домен>/api/cron/daily` без заголовка возвращает 401.
- [ ] Оценка ответа и сборка уроков работают через OpenRouter.
- [ ] Порты 5432, 6543, 8000, 8443, 3000 снаружи недоступны (`nmap -Pn <IP>` с чужой машины).
- [ ] Бэкап снят и восстановлен хотя бы раз (шаг 9).
- [ ] Адреса в логах приложения замаскированы (`docker compose logs app | grep @`).

## 11. Переключение и откат

1. Проверка шага 10 пройдена на новом адресе.
2. Переключить DNS (или основной адрес) на ВМ. Старые проекты пока оставить.
3. Через [3] дня без проблем: удалить проект Supabase Cloud, остановить деплой Vercel, отозвать `RESEND_API_KEY`. Удаление необратимо, делает Юлиана.
4. Обновить `docs/legal/privacy-policy.md` (раздел 6) и `docs/legal/data-map.md` (раздел 3): поставщики, страна, срок резервных копий.

Откат до шага 3: вернуть DNS на Vercel. Данные, созданные на новой стороне, при откате пропадут.

## 12. Обслуживание

- Обновления ОС и образов раз в месяц: `apt upgrade`, в `/opt/supabase` — `docker compose pull && up -d` после просмотра заметок о выпуске; версию Supabase фиксировать в журнале.
- Доступ по SSH: список лиц, двухфакторная защита в аккаунте Selectel.
- Мониторинг: доступность `https://learn.<домен>` внешним сервисом, место на диске, ошибки в `$HOME/todual-cron.log` и `$HOME/todual-backup.log`.

## 13. Что остаётся вне РФ

OpenRouter и Anthropic: запросы к модели. Для них нужно уведомление Роскомнадзора о трансграничной передаче (`docs/legal/templates/rkn-notification-draft.md`) и настройки приватности в OpenRouter (`docs/legal/data-map.md`, раздел 7.4). Vercel, Supabase Cloud и Resend после переезда не используются.
