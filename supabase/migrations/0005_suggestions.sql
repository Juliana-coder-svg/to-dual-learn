-- Предложения ИИ-методиста по урокам курса (docs/concepts/learning-course/prototype-spec.md, часть 1, шаг 1).
-- Таблицы создаются в части 1, заполняться начнут в части 2 (маршрут /api/suggestions).
--
-- course_suggestions: одно предложение = одно изменение урока: новая карточка на типичную ошибку
-- (add_flashcard) или уточнённый критерий (clarify_criterion). Хранит числа сигнала, «почему»,
-- готовый текст изменения и контент урока до применения, чтобы принятое можно было отменить.
-- suggestion_excerpts: обезличенные выдержки из ответов студентов, на которых построено предложение.
-- Выдержка копирует кусок персональных данных, поэтому лежит отдельной строкой с внешним ключом
-- на ответ: удаляется вместе с ответом, когда студент удаляет аккаунт (docs/legal/data-map.md).
-- Видит и меняет обе таблицы только владелец курса. Студент получает через RPC course_updates
-- только номер урока, тип и дату принятого изменения, без выдержек и текста.

create table public.course_suggestions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  type text not null check (type in ('add_flashcard', 'clarify_criterion')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'reverted')),
  -- Урок + вид сигнала + номер критерия: по этому ключу не повторяем отклонённое и не дублируем ожидающее.
  signal_key text not null check (length(signal_key) between 1 and 200),
  -- Вид сигнала, число сдавших, доля, число возражений: что именно увидел код.
  signal jsonb not null,
  -- Педагогическое «почему» в одну-две фразы, от модели.
  evidence jsonb not null,
  -- Для карточки {question, answer}, для критерия {index, before, after}.
  change jsonb not null,
  -- lessons.content до применения; заполняется при принятии, нужен для отмены.
  previous_content jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint course_suggestions_decided check ((status = 'pending') = (decided_at is null))
);

create index idx_course_suggestions_course on public.course_suggestions (course_id, created_at desc);
create index idx_course_suggestions_lesson on public.course_suggestions (lesson_id);
-- Пока по сигналу есть ожидающее или отклонённое предложение, новое с тем же ключом не создаётся.
create unique index idx_course_suggestions_open_key
  on public.course_suggestions (course_id, signal_key)
  where status in ('pending', 'rejected');

create table public.suggestion_excerpts (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.course_suggestions (id) on delete cascade,
  submission_id uuid not null references public.submissions (id) on delete cascade,
  excerpt text not null check (length(excerpt) between 1 and 800),
  created_at timestamptz not null default now()
);

create index idx_suggestion_excerpts_suggestion on public.suggestion_excerpts (suggestion_id);
create index idx_suggestion_excerpts_submission on public.suggestion_excerpts (submission_id);

-- ---------------------------------------------------------------------------
-- RLS: только владелец курса.
-- ---------------------------------------------------------------------------

alter table public.course_suggestions enable row level security;
alter table public.suggestion_excerpts enable row level security;

create policy "suggestions owner select" on public.course_suggestions
  for select to authenticated
  using (public.is_course_owner(course_id));
create policy "suggestions owner insert" on public.course_suggestions
  for insert to authenticated
  with check (public.is_course_owner(course_id) and public.owns_lesson_course(lesson_id));
create policy "suggestions owner update" on public.course_suggestions
  for update to authenticated
  using (public.is_course_owner(course_id))
  with check (public.is_course_owner(course_id));

-- Выдержка доступна тому, кому доступно предложение. Подзапрос идёт по course_suggestions
-- с её RLS: чужое предложение не найдётся, значит и выдержка не видна.
create policy "excerpts owner select" on public.suggestion_excerpts
  for select to authenticated
  using (exists (select 1 from public.course_suggestions s where s.id = suggestion_id and public.is_course_owner(s.course_id)));
create policy "excerpts owner insert" on public.suggestion_excerpts
  for insert to authenticated
  with check (
    exists (select 1 from public.course_suggestions s where s.id = suggestion_id and public.is_course_owner(s.course_id))
    and exists (select 1 from public.submissions sub where sub.id = submission_id and public.owns_lesson_course(sub.lesson_id))
  );

-- Supabase выдаёт all на новые таблицы ролям anon и authenticated: сужаем до нужного.
-- Удаления нет: предложение отклоняют или отменяют, история решений остаётся для метрик.
-- Менять можно только решение и сохранённый контент: сигнал, выдержки и текст изменения не переписываются.
revoke all on public.course_suggestions from anon;
revoke all on public.suggestion_excerpts from anon;
revoke insert, update, delete on public.course_suggestions from authenticated;
revoke insert, update, delete on public.suggestion_excerpts from authenticated;
grant select on public.course_suggestions to authenticated;
grant insert (course_id, lesson_id, type, signal_key, signal, evidence, change) on public.course_suggestions to authenticated;
grant update (status, decided_at, previous_content) on public.course_suggestions to authenticated;
grant select on public.suggestion_excerpts to authenticated;
grant insert (suggestion_id, submission_id, excerpt) on public.suggestion_excerpts to authenticated;

-- ---------------------------------------------------------------------------
-- RPC для студента: что в курсе поменялось по ответам группы за последние 7 дней.
-- Без выдержек и текста изменения: только номер урока, тип и дата.
-- ---------------------------------------------------------------------------

create or replace function public.course_updates(c uuid)
returns table (
  lesson_position integer,
  type text,
  decided_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select l.position, s.type, s.decided_at
  from public.course_suggestions s
  join public.lessons l on l.id = s.lesson_id
  where s.course_id = c
    and s.status = 'accepted'
    and s.decided_at >= now() - interval '7 days'
    and (public.is_enrolled(c) or public.is_course_owner(c))
  order by s.decided_at desc;
$$;

revoke execute on function public.course_updates(uuid) from public, anon;
grant execute on function public.course_updates(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC для преподавателя: карточки урока по всем студентам курса, числами.
-- Строки flashcards чужих студентов RLS не отдаёт («только свои»), а сигнал «карточку забывают»
-- нужен владельцу курса. Отдаём только счётчики по уроку, без user_id.
-- old_* считаются по карточкам старше 9 дней: первый круг (через день) у них уже пройден.
-- ---------------------------------------------------------------------------

create or replace function public.course_flashcard_signals(c uuid)
returns table (
  lesson_id uuid,
  reviewed integer,
  forgot integer,
  old_reviewed integer,
  old_forgot integer
)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.is_course_owner(c) then
    raise exception 'not a course owner' using errcode = '42501';
  end if;
  return query
    select f.lesson_id,
           count(*) filter (where f.last_quality is not null)::integer,
           count(*) filter (where f.last_quality = 'forgot')::integer,
           count(*) filter (where f.last_quality is not null and f.created_at < now() - interval '9 days')::integer,
           count(*) filter (where f.last_quality = 'forgot' and f.created_at < now() - interval '9 days')::integer
    from public.flashcards f
    join public.lessons l on l.id = f.lesson_id
    join public.courses co on co.id = l.course_id
    where l.course_id = c and f.user_id <> co.owner_id
    group by f.lesson_id;
end;
$$;

revoke execute on function public.course_flashcard_signals(uuid) from public, anon;
grant execute on function public.course_flashcard_signals(uuid) to authenticated;
