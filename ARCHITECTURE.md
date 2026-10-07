# To Dual Daily — Architecture

## Обзор

Веб-приложение на Next.js, с серверным рендерингом, серверными вызовами AI и хранением прогресса в Supabase.

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Браузер   │ ──────► │  Next.js Server  │ ──────► │  Anthropic API  │
│  (React UI) │ ◄────── │  (API + SSR)     │ ◄────── │  (Claude)       │
└─────────────┘         └──────────────────┘         └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │    Supabase      │
                        │  (Auth + DB)     │
                        └──────────────────┘
```

## Структура файлов

```
to-dual-daily/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Лендинг, about, для незалогиненных
│   │   ├── page.tsx              # Главная (welcome)
│   │   └── about/page.tsx
│   ├── (app)/                    # Приложение для залогиненных
│   │   ├── home/page.tsx         # Главный экран с дорожкой уроков
│   │   ├── lesson/[id]/page.tsx  # Урок
│   │   ├── result/[id]/page.tsx  # Результат урока
│   │   ├── flashcards/page.tsx   # Повторение карточек
│   │   └── layout.tsx
│   ├── api/
│   │   ├── evaluate/route.ts     # POST: оценить ответ пользователя
│   │   ├── reevaluate/route.ts   # POST: переоценить с возражением
│   │   └── progress/route.ts     # POST: сохранить прогресс
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                       # shadcn/ui компоненты (button, card, …)
│   ├── lesson/
│   │   ├── LessonIntro.tsx
│   │   ├── LessonConcept.tsx
│   │   ├── LessonTaskOpen.tsx
│   │   ├── LessonTaskMCQ.tsx
│   │   └── LessonResult.tsx
│   ├── home/
│   │   ├── ProgressCard.tsx
│   │   ├── TodayLessonCard.tsx
│   │   └── LessonRoadmap.tsx
│   └── shared/
│       ├── Brand.tsx
│       └── ShareCard.tsx
│
├── content/
│   └── lessons/
│       ├── 01-hallucinations.json
│       ├── 02-anchor-effect.json
│       ├── 03-source-check.json
│       ├── 04-correlation.json
│       └── 05-ai-razor.json
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # для клиентских компонентов
│   │   ├── server.ts             # для серверных компонентов и route handlers
│   │   └── types.ts              # типы из БД
│   ├── prompts/
│   │   ├── evaluate.ts           # промпт для оценки открытого ответа
│   │   ├── reevaluate.ts         # промпт для переоценки
│   │   └── system.ts             # общая системная инструкция
│   ├── claude/
│   │   └── client.ts             # обёртка над Anthropic SDK
│   ├── lessons/
│   │   ├── load.ts               # загрузка JSON-уроков
│   │   └── types.ts              # типы уроков
│   ├── progress/
│   │   ├── streak.ts             # логика streak
│   │   ├── flashcards.ts         # spaced repetition
│   │   └── xp.ts                 # очки
│   └── utils.ts                  # cn (для tailwind), форматирование дат
│
├── public/
│   └── (картинки, иконки)
│
├── CLAUDE.md                     # для Claude Code
├── ARCHITECTURE.md               # этот файл
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── .env.local                    # ключи (НЕ КОММИТИТЬ)
```

## Схема базы данных (Supabase)

### `users` (от Supabase Auth — не трогаем)

Стандартная таблица Supabase Auth. Используем `user.id` как внешний ключ везде.

### `profiles`

Профиль пользователя. Создаётся автоматически после регистрации через trigger.

| поле | тип | описание |
|---|---|---|
| id | uuid | PK, ссылка на auth.users.id |
| role | text | 'marketer' / 'product' / 'manager' / 'other' |
| created_at | timestamptz | время регистрации |
| streak | int | текущий streak (дней подряд) |
| last_lesson_at | timestamptz | когда последний раз проходил урок (для streak) |
| xp | int | очки опыта |

### `lesson_completions`

История прохождений уроков.

| поле | тип | описание |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK на profiles.id |
| lesson_id | text | ID урока из JSON-файла |
| completed_at | timestamptz | |
| score | int | 1–5 |
| user_answer | text | ответ пользователя (для аналитики и калибровки) |
| ai_feedback | jsonb | полный JSON фидбека от Claude |

### `flashcards`

Карточки на повторение (spaced repetition).

| поле | тип | описание |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK на profiles.id |
| lesson_id | text | ID урока |
| created_at | timestamptz | |
| next_due_at | timestamptz | когда показать следующий раз |
| round | int | какой круг повторения (0, 1, 2, ...) |
| last_recall_quality | text | 'forgot' / 'vague' / 'remembered' |

### Row Level Security (RLS)

Каждый пользователь видит только свои данные:
- `profiles`: SELECT/UPDATE where `id = auth.uid()`
- `lesson_completions`: SELECT/INSERT where `user_id = auth.uid()`
- `flashcards`: ALL where `user_id = auth.uid()`

## Формат урока (JSON)

```json
{
  "id": "01-hallucinations",
  "order": 1,
  "title": "Галлюцинации AI",
  "concept": "Распознать, когда модель уверенно врёт",
  "duration": "5 мин",
  "icon": "ghost",
  "color": "purple",
  "taskType": "open",
  "content": {
    "intro": "AI-модели не «знают»...",
    "keyIdea": "Галлюцинация — это сгенерированное утверждение...",
    "signals": [
      "Конкретные имена и даты без источника",
      "..."
    ],
    "task": "Найди в тексте ниже...",
    "sample": "«Согласно исследованию профессора Майкла Брауна...»",
    "rubricCriteria": [
      "Назван конкретный фрагмент текста",
      "Объяснено, почему именно этот фрагмент подозрителен",
      "Описана процедура проверки"
    ],
    "keyTakeaway": "Если утверждение звучит конкретно и проверяемо, но источника нет..."
  }
}
```

Для MCQ-урока вместо `rubricCriteria` будут `mcqOptions` и `mcqExplanation`.

## AI-движок: как работает оценка

1. Пользователь отправляет ответ → POST `/api/evaluate` с `{ lessonId, userAnswer }`
2. Server route загружает урок из JSON
3. Формирует промпт из шаблона в `/lib/prompts/evaluate.ts`
4. Делает запрос к Claude (модель `claude-opus-4-7` или `claude-sonnet-4-5` для дешевизны)
5. Парсит JSON-ответ
6. Сохраняет в `lesson_completions`
7. Возвращает фидбек клиенту

**Принципы промпта:**
- Двухходовая оценка: сначала по критериям, потом общий балл
- Не оценивать фактическую точность — только структуру рассуждения
- Не вестись на «красивые общие слова»
- Цитировать конкретные фрагменты ответа пользователя

## Spaced repetition

После прохождения урока создаётся флешкарта с `next_due_at = now + 1 day`.

После прохождения карточки:
- «забыл» → `next_due_at = now + 1 day` (повтор завтра)
- «смутно» → `next_due_at = now + 2 days`
- «помню» → `next_due_at = now + 7 days`, потом 14, потом 30

## Деплой

Vercel:
- автодеплой из main-ветки в production
- preview-deploy для каждого PR
- переменные окружения через Vercel UI

Supabase:
- проект на free tier на старте
- бэкапы автоматические

## Переменные окружения

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

## Стоимость на старте (оценка)

- Vercel: бесплатно (Hobby plan)
- Supabase: бесплатно (Free tier до 500 МБ БД, 50k MAU)
- Anthropic API: ~$0.01 за оценку ответа (claude-sonnet) × количество прохождений
- Yandex Metrika: бесплатно
- PostHog: бесплатно (1M событий)

При 1000 активных пользователей и 5 уроках в день: ~$150/мес на AI-токены, остальное в free-tiers.
