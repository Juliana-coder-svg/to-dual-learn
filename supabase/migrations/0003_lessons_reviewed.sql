-- Отметка «урок проверен преподавателем» (docs/legal/ai-in-education.md, 3.1): ставит человек,
-- сохраняя форму редактора урока; сбрасывается, когда модель-методист переписывает урок.
-- Время и автор нужны, чтобы ответить вузу «кто и когда проверил». RLS не меняется:
-- обновлять урок может только владелец курса, студент читает колонки опубликованного урока.

alter table public.lessons
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null;
