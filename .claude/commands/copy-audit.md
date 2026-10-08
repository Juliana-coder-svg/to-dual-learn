---
description: Редакторский проход по пользовательским текстам: интерфейс, письма, промпты, примеры ответов.
argument-hint: [папка или файл, по умолчанию src и content]
---

Вызови агента `editor` для прохода по текстам: $ARGUMENTS (по умолчанию `src/app`, `src/components`, `src/lib/prompts`, `src/lib/ai/demo.ts`, `content/courses`). Результат: список «было → стало» с файлами, правки внесены. После правок запусти `npx tsc --noEmit` и `npx eslint src`, закоммить одним коммитом на английском.
