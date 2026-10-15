# Источники и лицензии

Навык `russian-editing` собран из трёх внешних наборов и нашей практики. Ниже кто что написал, под какой лицензией, что мы взяли и что изменили.

## humanizer-ru

- Автор: Ilya Utov. Проект humanizer-ru, версия 3.31.4 на момент заимствования.
- Лицензия: MIT.
- Что взято: каталог из 67 паттернов ИИ-текста в 16 категориях (A–P), таблица жёстких запретов, списки слов-маркеров («быстрый сканер»), правила аудита и сверки с исходником, принцип «удалять, не дописывать» и факт-замок.
- Что изменено: примеры «было → стало» заменены на примеры из нашего продукта; категории H и часть C помечены как не применимые в продукте (опечатки, прямые кавычки, дефис вместо тире); жёсткие запреты пересобраны в 21 пункт с кодами HB01–HB21; списки перенесены в машинные блоки для нашего сканера `scripts/text-lint.mjs`, который написан заново на Node и не использует `scan.py` из оригинала.
- Где в нашем навыке: `SKILL.md` (раздел «21 жёсткий запрет»), `references/ai-signs.md`, `references/cliches.md`.

Текст лицензии MIT (для копий и существенных частей проекта):

```
MIT License

Copyright (c) Ilya Utov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Год в строке об авторских правах уточните по оригинальному репозиторию humanizer-ru: в копии, с которой мы работали, он не указан.

## redaktura-skills (redaktura и ux-copy)

- Авторы: Людмила Сарычева и Никита Архипов. Метод Людмилы Сарычевой: [gladlax.ru](https://gladlax.ru). Никита Архипов: [niar42.com](https://niar42.com).
- Наборы: навык `redaktura` (версия 0.4.1) и навык `ux-copy` (версия 0.2.2).
- Лицензия: Creative Commons Attribution 4.0 International (CC BY 4.0), <https://creativecommons.org/licenses/by/4.0/deed.ru>.
- Что взято: порядок редактуры по проходам (смысл, структура, тональность, предложение, слово, ритм, следы нейросети); правила тональности (граница читателя, переворот нравоучения); правила предложения (деятель и действие, информационная ёмкость, однородные члены); правила слова (канцелярит, усилители, штампы, заумь, народная психология, запрещённые слова); категории штампов и два способа лечения (сократить, раскрыть); проход «Следы нейросети» с лимитом антитез; принципы UX-текста, правила элементов, ошибок и состояний.
- Что изменено: материал пересказан и сокращён, примеры заменены на примеры To Dual Learn, часть правил совмещена с правилами humanizer-ru и нашими. Изменения внесены нами; авторы не рецензировали и не одобряли результат.
- Где в нашем навыке: `SKILL.md` (порядок редактуры, интерфейсные тексты), `references/cliches.md` (штампы, канцелярит, усилители, заумь), `references/ux-copy.md`, `references/ai-signs.md` (лимит антитез и «не маркеры»).

Обязательная ссылка на автора метода: [gladlax.ru](https://gladlax.ru).

## Наши собственные материалы

- Словарь терминов продукта, типичные ошибки, правила оформления, особенности аудитории и разбора от наставника (`SKILL.md`).
- Прежний список штампов навыка, вошедший в `references/cliches.md` (блоки HB04–HB21 и W-списки).
- Правила интерфейса UX01–UX05 и сканер `scripts/text-lint.mjs`.
- Школа ясного текста, на которую опирался прежний навык: Нора Галь «Слово живое и мёртвое», Максим Ильяхов и Людмила Сарычева «Пиши, сокращай». Мы пересказываем идеи, текстов оттуда не копируем.

## Как обновлять

Новый признак или штамп добавляйте строкой в машинный блок `references/cliches.md` или `references/ai-signs.md`, и сканер подхватит его без правки кода. Если материал взят из внешнего источника, дописывайте его сюда.
