# Перенос всей платформы в единую систему дизайна

16 октября 2026, ветка `claude/design-all-8b12f0`. Система описана в [docs/design.md](../../design.md), раздел «Единая система» и чеклист.

## Что сделано

- Три ступени радиуса: органы управления 12 px, контейнеры 16 px, пилюли. Прежняя таблица радиусов в `design.md` (2 px) устарела и заменена.
- Классы `.panel`, `.panel-soft`, `.frame`, `.table-frame`, `.tile`, `.field-select`, `.chip` в `globals.css`: экраны больше не собирают рамки заново. Около 40 мест переведены.
- Один подвал `SiteFooter` на обе оболочки; шапка уже была общей по вёрстке. Вошедшие теперь видят в подвале и «Данные и безопасность», «Пилот» (новые ссылки для сессии).
- Таблицы «Студенты», «Сигналы», «Расход по курсу» в одной рамке с прокруткой внутри, клавиатурой и видимым фокусом (у двух последних добавлены `role=region` и `aria-label`, это новые строки для дикторов).
- Письмо «урок дня»: `src/lib/mail-template.ts`, табличная вёрстка в hex-цветах интерфейса, тексты прежние.
- По просьбе владельца бренд везде «TO DUAL» капсом (интерфейс, заголовки, письмо, отправитель, выгрузка данных, `docs/legal/{privacy-policy,terms,consent}.md`, системный промпт).

## Проверки

- `type-check`: 0 ошибок. `lint`: 0 ошибок (1 старое предупреждение в scripts). `text:lint`: 0 жёстких нарушений, 251 предупреждение (были до правок). Сборка проходит.
- 375 и 1280: горизонтальной прокрутки страницы нет ни на одном снимке (скрипт сверял `scrollWidth` с шириной окна).
- Контраст: тексты на `--foreground`, `--muted-foreground` и `--primary-strong` проходят AA, как и раньше; оранжевая заливка с белым текстом остаётся только у кнопок и плашки (крупный или жирный текст), цвета не менялись. В письме ссылки `#BD2900` на белом (выше 5:1).
- Ревьюер: блокирующих находок нет. Учтены: капс в строке 45 согласия, фокус и `region` у таблиц. Решения оставлены владельцу: (1) версия согласий `0.3` не поднималась, правка текста только регистра, нужен взгляд юриста; (2) новые ссылки в подвале для вошедших.
- QA по чеклисту (155 действий в браузере, 375 и 1280): все экраны, вкладки, фильтры, раскрытия проходят. Найдено и исправлено: «Настройки» на 375 прокручивалась по горизонтали (колонка сетки без `min-w-0`), шапка `/legal/*` выходила за экран (навигация документов), таблицы в Markdown политики без рамки, `tabindex` у таблиц «Сигналы» и «Настройки», неразрывный пробел в «TO DUAL» в подписи согласия. После правок повторный прогон скриптом: `scrollWidth` равен ширине окна на всех 68 снимках. Не проверялись платные вызовы ИИ: генерация, чат, проверка работ.

## Доступность (задача из аудита `docs/research/program-2026-10-14/05-accessibility-audit.md`)

- Текст на оранжевой заливке графитовый (6,5:1 вместо 3,4:1): кнопка по умолчанию, бейдж, оранжевая плашка, галочки; кнопки на плашке графитовые.
- Границы полей, select, плиток и контурных кнопок не светлее 3:1; кольцо фокуса сплошное; подсказки в полях 4,5:1 и выше.
- У каждой страницы свой `title` (шаблон «… · TO DUAL Learn»).
- Живые области: диалог с материалами, генератор материалов, этапы сборки уроков, карточка повторения. Результат ответа ИИ в уроке и проверка работ уже были `role=status`.
- Подробности в `docs/design.md`, последний раздел.

## Экраны (31)

| Экран | Адрес | Что изменилось | До 375 / 1280 | После 375 / 1280 |
|---|---|---|---|---|
| Лендинг | `/` | панели 16 px, общий подвал | [375](design-all/before/landing-375.png) [1280](design-all/before/landing-1280.png) | [375](design-all/after/landing-375.png) [1280](design-all/after/landing-1280.png) |
| Данные и безопасность | `/about/data` | общий подвал | [375](design-all/before/about-data-375.png) [1280](design-all/before/about-data-1280.png) | [375](design-all/after/about-data-375.png) [1280](design-all/after/about-data-1280.png) |
| Пилот | `/pilot` | общий подвал | [375](design-all/before/pilot-375.png) [1280](design-all/before/pilot-1280.png) | [375](design-all/after/pilot-375.png) [1280](design-all/after/pilot-1280.png) |
| Документы | `/legal/*` | общий подвал, TO DUAL капсом | [375](design-all/before/legal-375.png) [1280](design-all/before/legal-1280.png) | [375](design-all/after/legal-375.png) [1280](design-all/after/legal-1280.png) |
| Вход | `/login` | плитки роли `.tile`, рамка согласий `.frame` | [375](design-all/before/login-375.png) [1280](design-all/before/login-1280.png) | [375](design-all/after/login-375.png) [1280](design-all/after/login-1280.png) |
| Вход по приглашению | `/login?next=/join/КОД` | то же | [375](design-all/before/login-invite-375.png) [1280](design-all/before/login-invite-1280.png) | [375](design-all/after/login-invite-375.png) [1280](design-all/after/login-invite-1280.png) |
| Приглашение | `/join/КОД` | общий подвал | [375](design-all/before/join-375.png) [1280](design-all/before/join-1280.png) | [375](design-all/after/join-375.png) [1280](design-all/after/join-1280.png) |
| Пробный урок | `/try/…/1` | блоки урока 16 px | [375](design-all/before/try-375.png) [1280](design-all/before/try-1280.png) | [375](design-all/after/try-375.png) [1280](design-all/after/try-1280.png) |
| Согласие | `/consent` | `.frame` у чекбоксов | [375](design-all/before/consent-375.png) [1280](design-all/before/consent-1280.png) | [375](design-all/after/consent-375.png) [1280](design-all/after/consent-1280.png) |
| Сегодня (новичок) | `/learn` | `.panel`, `.panel-soft`, `.card-link` 16 px | [375](design-all/before/learn-new-375.png) [1280](design-all/before/learn-new-1280.png) | [375](design-all/after/learn-new-375.png) [1280](design-all/after/learn-new-1280.png) |
| Сегодня | `/learn` | то же | [375](design-all/before/learn-375.png) [1280](design-all/before/learn-1280.png) | [375](design-all/after/learn-375.png) [1280](design-all/after/learn-1280.png) |
| Курс студента | `/learn/КУРС` | `.panel`, `.card-link` | [375](design-all/before/course-new-375.png) [1280](design-all/before/course-new-1280.png) | [375](design-all/after/course-new-375.png) [1280](design-all/after/course-new-1280.png) |
| Урок: идея | `/learn/…/lesson/…` | блоки 16 px | [375](design-all/before/lesson-idea-375.png) [1280](design-all/before/lesson-idea-1280.png) | [375](design-all/after/lesson-idea-375.png) [1280](design-all/after/lesson-idea-1280.png) |
| Урок: задача | `/learn/…/lesson/…` | `.frame`, блоки 16 px | [375](design-all/before/lesson-task-375.png) [1280](design-all/before/lesson-task-1280.png) | [375](design-all/after/lesson-task-375.png) [1280](design-all/after/lesson-task-1280.png) |
| Урок: разбор | `/learn/…/lesson/…` | `.frame`, `.panel` | [375](design-all/before/lesson-feedback-375.png) [1280](design-all/before/lesson-feedback-1280.png) | [375](design-all/after/lesson-feedback-375.png) [1280](design-all/after/lesson-feedback-1280.png) |
| Повторение (пусто) | `/learn/review` | `.empty-state` | [375](design-all/before/review-empty-375.png) [1280](design-all/before/review-empty-1280.png) | [375](design-all/after/review-empty-375.png) [1280](design-all/after/review-empty-1280.png) |
| История (пусто) | `/learn/history` | `.empty-state` | [375](design-all/before/history-empty-375.png) [1280](design-all/before/history-empty-1280.png) | [375](design-all/after/history-empty-375.png) [1280](design-all/after/history-empty-1280.png) |
| Мои данные | `/account/data` | письмо дня как `.panel`, точка пилюлей | [375](design-all/before/account-375.png) [1280](design-all/before/account-1280.png) | [375](design-all/after/account-375.png) [1280](design-all/after/account-1280.png) |
| Мои курсы | `/teach` | `.card-link`, `.panel-soft` | [375](design-all/before/teach-375.png) [1280](design-all/before/teach-1280.png) | [375](design-all/after/teach-375.png) [1280](design-all/after/teach-1280.png) |
| Как это работает | `/teach/start` | `.panel` | [375](design-all/before/teach-start-375.png) [1280](design-all/before/teach-start-1280.png) | [375](design-all/after/teach-start-375.png) [1280](design-all/after/teach-start-1280.png) |
| Материалы | `/teach/КУРС` | `.frame` | [375](design-all/before/c-materials-375.png) [1280](design-all/before/c-materials-1280.png) | [375](design-all/after/c-materials-375.png) [1280](design-all/after/c-materials-1280.png) |
| Уроки | `/teach/КУРС/lessons` | `.panel`, `.chip` в шапке | [375](design-all/before/c-lessons-375.png) [1280](design-all/before/c-lessons-1280.png) | [375](design-all/after/c-lessons-375.png) [1280](design-all/after/c-lessons-1280.png) |
| Редактор урока | `/teach/КУРС/lessons/…/edit` | блоки 16 px | [375](design-all/before/c-edit-375.png) [1280](design-all/before/c-edit-1280.png) | [375](design-all/after/c-edit-375.png) [1280](design-all/after/c-edit-1280.png) |
| Для занятий | `/teach/КУРС/generate` | `.frame`, `.tile` | [375](design-all/before/c-generate-375.png) [1280](design-all/before/c-generate-1280.png) | [375](design-all/after/c-generate-375.png) [1280](design-all/after/c-generate-1280.png) |
| Вопросы | `/teach/КУРС/chat` | рамка чата 16 px | [375](design-all/before/c-chat-375.png) [1280](design-all/before/c-chat-1280.png) | [375](design-all/after/c-chat-375.png) [1280](design-all/after/c-chat-1280.png) |
| Проверка работ | `/teach/КУРС/homework` | `.frame` | [375](design-all/before/c-homework-375.png) [1280](design-all/before/c-homework-1280.png) | [375](design-all/after/c-homework-375.png) [1280](design-all/after/c-homework-1280.png) |
| Студенты | `/teach/КУРС/students` | `.table-frame`, фильтры | [375](design-all/before/c-students-375.png) [1280](design-all/before/c-students-1280.png) | [375](design-all/after/c-students-375.png) [1280](design-all/after/c-students-1280.png) |
| Настройки | `/teach/КУРС/settings` | `.field-select`, `.tile`, `.table-frame`, `.panel-soft` | [375](design-all/before/c-settings-375.png) [1280](design-all/before/c-settings-1280.png) | [375](design-all/after/c-settings-375.png) [1280](design-all/after/c-settings-1280.png) |
| Сигналы | `/teach/КУРС/signals` | `.table-frame` | [375](design-all/before/c-signals-375.png) [1280](design-all/before/c-signals-1280.png) | [375](design-all/after/c-signals-375.png) [1280](design-all/after/c-signals-1280.png) |
| Отправить студентам | `/teach/КУРС/share` | панель 16 px | [375](design-all/before/c-share-375.png) [1280](design-all/before/c-share-1280.png) | [375](design-all/after/c-share-375.png) [1280](design-all/after/c-share-1280.png) |
| Письмо «урок дня» | `cron/daily` | новая табличная вёрстка | [375](design-all/before/email-375.png) [1280](design-all/before/email-1280.png) | [375](design-all/after/email-375.png) [1280](design-all/after/email-1280.png) |

Тестовые учётки на боевой базе удалены по завершении (см. ниже). Снимки до: часть («lesson-feedback») снята только на 1280. Данные: тестовые учётки `design-*@example.test` на боевой базе, удаляются после отчёта.

## Что осталось

- Старая версия согласий и подвал: решения выше.
- Экраны с данными (повторение с карточками, история с ответами) сняты пустыми: у тестовых учёток карточки появятся только завтра.
