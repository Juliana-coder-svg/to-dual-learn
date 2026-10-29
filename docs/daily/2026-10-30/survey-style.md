# Стиль опроса на платформе, 30 октября 2026

Ветка `claude/survey-style-a565d4`. Вся платформа переведена в стиль опроса «Как вы работаете с ИИ» (проект `to-dual-research`, только чтение). Менялись токены, классы и разметка. Функции, тексты и маршруты прежние.

Словарь соответствия «опрос → наши токены и классы», что взяли, что оставили и где расходимся: [docs/design.md](../../design.md), раздел «Стиль опроса».

## Что сделано

- `src/app/globals.css`: палитра опроса (графит #161616, серые #4A4A47 и #6B6B66, поверхность #F6F6F4, сцена #EFEEEB, оранжевый #FF4A07 и #C43C00, подложка #FBEEE7), радиусы поле 12 / карточка 16–20 / панель 20–28 / пилюля, шкала текста опроса, графитовый фокус, `.container-x`, `.band`, `.label-dot`, `type-page`, `type-lead`.
- Шрифт: Onest одним семейством, Unbounded убран из `src/app/layout.tsx`.
- Общие компоненты: `AppShell`, `PublicShell`, `SiteFooter`, `NavLinks`, `Brand`, `PageHeader`, `EmptyState`, `Notice`, `StepMarks`.
- shadcn: `Button` (пилюля, графитовая; размеры 52 / 44 / 36 / 28 px; новый вид `accent`), `Input`, `Textarea`, `Card`, `Badge`, `Progress`.
- Экраны: лендинг (сцена первого экрана, линейки, оранжевая кнопка только на первом экране), окно «Новый курс», вкладка курса, счётчики; письмо в тех же цветах.
- Звёздочка и `ProgressAsterisk` оставлены (решение владельца).

## Где следуем опросу, где нет

Следуем: графитовые кнопки-пилюли, Onest 400–500, радиусы, полоса и линейка, шапка и подвал, графитовый прогресс и фокус.

Не следуем, по правилам CLAUDE.md и AA: теней и градиентов нет (рамка 1 px вместо `--elev`, сцена лендинга плоская); на оранжевой кнопке графитовый текст вместо белого (6,5:1 против 3,2:1); сплошная оранжевая плашка заменена подложкой `--primary-soft`; поле 44 px вместо 52. Подробнее в design.md.

## Экраны

Снимки: полная страница, production-сборка воркдерева (`next build`, `next start -p 3200`, ключи из `.env.local` основного чекаута), headless Chrome. Опрос: https://to-dual.ru/research-ai и /research-ai/survey (тот же стиль, поэтому пара для всех экранов платформы, кроме лендинга, это экран анкеты). `/research-ai/stats` закрыт входом администратора, снимка нет.

| № | Экран | Маршрут | Опрос 375 / 1280 | Наш экран 375 / 1280 | Overflow 375 / 1280 |
|---|---|---|---|---|---|
| 1 | Лендинг | `/` | [375](survey-style/survey/landing-375.jpg) [1280](survey-style/survey/landing-1280.jpg) | [375](survey-style/ours/landing-375.jpg) [1280](survey-style/ours/landing-1280.jpg) | нет / нет |
| 2 | Вход | `/login` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/login-375.jpg) [1280](survey-style/ours/login-1280.jpg) | нет / нет |
| 3 | Вход по приглашению | `/login?next=/join/КОД` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/login-invite-375.jpg) [1280](survey-style/ours/login-invite-1280.jpg) | нет / нет |
| 4 | Приглашение на курс | `/join/КОД` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/join-375.jpg) [1280](survey-style/ours/join-1280.jpg) | нет / нет |
| 5 | Согласие | `/consent` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/consent-375.jpg) [1280](survey-style/ours/consent-1280.jpg) | нет / нет |
| 6 | Пробный урок | `/try/critical-thinking-ai/1` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/try-375.jpg) [1280](survey-style/ours/try-1280.jpg) | нет / нет |
| 7 | Учиться (главная студента) | `/learn` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/learn-375.jpg) [1280](survey-style/ours/learn-1280.jpg) | нет / нет |
| 8 | Курс студента | `/learn/КУРС` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-s-375.jpg) [1280](survey-style/ours/course-s-1280.jpg) | нет / нет |
| 9 | Урок: идея | `/learn/КУРС/lesson/УРОК` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/lesson-idea-375.jpg) [1280](survey-style/ours/lesson-idea-1280.jpg) | нет / нет |
| 10 | Урок: задача | `то же, шаг 2` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/lesson-task-375.jpg) [1280](survey-style/ours/lesson-task-1280.jpg) | нет / нет |
| 11 | Урок: разбор | `то же, шаг 3` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/lesson-feedback-375.jpg) [1280](survey-style/ours/lesson-feedback-1280.jpg) | нет / нет |
| 12 | Повторение | `/learn/review` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/review-375.jpg) [1280](survey-style/ours/review-1280.jpg) | нет / нет |
| 13 | История ответов | `/learn/history` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/history-375.jpg) [1280](survey-style/ours/history-1280.jpg) | нет / нет |
| 14 | Мои данные | `/account/data` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/account-data-375.jpg) [1280](survey-style/ours/account-data-1280.jpg) | нет / нет |
| 15 | Данные и безопасность | `/about/data` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/about-data-375.jpg) [1280](survey-style/ours/about-data-1280.jpg) | нет / нет |
| 16 | Пилот | `/pilot` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/pilot-375.jpg) [1280](survey-style/ours/pilot-1280.jpg) | нет / нет |
| 17 | Политика | `/legal/privacy` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/legal-privacy-375.jpg) [1280](survey-style/ours/legal-privacy-1280.jpg) | нет / нет |
| 18 | Соглашение | `/legal/terms` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/legal-terms-375.jpg) [1280](survey-style/ours/legal-terms-1280.jpg) | нет / нет |
| 19 | Согласие (документ) | `/legal/consent` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/legal-consent-375.jpg) [1280](survey-style/ours/legal-consent-1280.jpg) | нет / нет |
| 20 | Мои курсы | `/teach` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/teach-375.jpg) [1280](survey-style/ours/teach-1280.jpg) | нет / нет |
| 21 | Окно «Новый курс» | `/teach, кнопка «Создать курс»` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/new-course-375.jpg) [1280](survey-style/ours/new-course-1280.jpg) | нет / нет |
| 22 | Как это работает | `/teach/start` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/teach-start-375.jpg) [1280](survey-style/ours/teach-start-1280.jpg) | нет / нет |
| 23 | Курс: Материалы | `/teach/КУРС` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-materials-375.jpg) [1280](survey-style/ours/course-materials-1280.jpg) | нет / нет |
| 24 | Курс: Уроки | `/teach/КУРС/lessons` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-lessons-375.jpg) [1280](survey-style/ours/course-lessons-1280.jpg) | нет / нет |
| 25 | Курс: Правка урока | `/teach/КУРС/lessons/УРОК/edit` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/lesson-edit-375.jpg) [1280](survey-style/ours/lesson-edit-1280.jpg) | нет / нет |
| 26 | Курс: Для занятий | `/teach/КУРС/generate` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-generate-375.jpg) [1280](survey-style/ours/course-generate-1280.jpg) | нет / нет |
| 27 | Курс: Вопросы | `/teach/КУРС/chat` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-chat-375.jpg) [1280](survey-style/ours/course-chat-1280.jpg) | нет / нет |
| 28 | Курс: Проверка работ | `/teach/КУРС/homework` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-homework-375.jpg) [1280](survey-style/ours/course-homework-1280.jpg) | нет / нет |
| 29 | Курс: Студенты | `/teach/КУРС/students` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-students-375.jpg) [1280](survey-style/ours/course-students-1280.jpg) | нет / нет |
| 30 | Курс: Настройки | `/teach/КУРС/settings` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-settings-375.jpg) [1280](survey-style/ours/course-settings-1280.jpg) | нет / нет |
| 31 | Курс: Отправить студентам | `/teach/КУРС/share` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/course-share-375.jpg) [1280](survey-style/ours/course-share-1280.jpg) | нет / нет |
| 32 | Письмо «урок дня» | `src/lib/mail-template.ts` | [375](survey-style/survey/survey-375.jpg) [1280](survey-style/survey/survey-1280.jpg) | [375](survey-style/ours/email-375.jpg) [1280](survey-style/ours/email-1280.jpg) | нет / нет |

Всего экранов: 32. Горизонтальной прокрутки нет ни на одном (`scrollWidth` равен ширине окна 375 и 1280, замер скриптом при съёмке).

## Проверки

- `npm run type-check`: без ошибок. `npm run lint`: 0 ошибок, одно старое предупреждение в `scripts/text-lint.mjs`.
- `npm run text:lint`: жёстких нарушений 0 (тексты не менялись).
- Тесты `node --import ./scripts/register.mjs --test scripts/*.test.ts`: 18 из 18.
- `next build`: собирается.
- Ревью и QA: ниже.

## Ограничения

- Логотип: у опроса знак другой (оранжевый блок), у нас звёздочка.
- В опросе линия шапки появляется после прокрутки, у нас показана всегда.
- Анимации опроса (маска заголовка, появление при прокрутке) не переносились.
- Снимки показывают тестовые учётки `style-*@example.test`; они удалены по завершении.
