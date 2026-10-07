-- To Dual Learn: схема Postgres для Supabase.
-- Переносит таблицы из src/lib/db/schema.ts (SQLite): uuid вместо text для id,
-- timestamptz вместо строк дат, jsonb вместо строк JSON, profiles вместо users.
-- Доступ ограничивается Row Level Security: преподаватель видит свои курсы и всё
-- внутри них, студент — курсы, на которые записан, только опубликованные уроки,
-- свои ответы и свои флешкарты.

-- ---------------------------------------------------------------------------
-- Таблицы
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'student' check (role in ('teacher', 'student')),
  created_at timestamptz not null default now(),
  streak integer not null default 0,
  last_lesson_at timestamptz,
  xp integer not null default 0,
  daily_email boolean not null default true,
  last_digest_at timestamptz
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  audience text not null default '',
  outcomes text not null default '',
  tone text not null default 'ty' check (tone in ('ty', 'vy')),
  daily_limit integer not null default 1,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  filename text not null,
  kind text not null,
  content_text text not null,
  char_count integer not null,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null,
  title text not null,
  concept text not null,
  content jsonb not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  review jsonb,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null,
  score integer not null,
  feedback jsonb not null,
  objection text,
  created_at timestamptz not null default now()
);

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  card_index integer not null default 0,
  next_due_at timestamptz not null,
  round integer not null default 0,
  last_quality text,
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id, card_index)
);

-- Образцы оценок преподавателя для калибровки AI-ментора.
create table public.calibration_samples (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  answer text not null,
  score integer not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  prompt text not null,
  output text not null,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table public.homework_checks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task text not null,
  criteria text not null,
  results jsonb not null,
  created_at timestamptz not null default now()
);

-- Учёт вызовов модели: токены и оценка стоимости.
create table public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete set null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_usd double precision not null default 0,
  duration_ms integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_courses_owner on public.courses (owner_id, created_at desc);
create index idx_materials_course on public.materials (course_id, created_at);
create index idx_lessons_course on public.lessons (course_id, position);
create index idx_enrollments_course on public.enrollments (course_id, joined_at);
create index idx_submissions_lesson_user on public.submissions (lesson_id, user_id, created_at desc);
create index idx_submissions_user on public.submissions (user_id, created_at desc);
create index idx_flashcards_user_due on public.flashcards (user_id, next_due_at);
create index idx_generations_course on public.generations (course_id, created_at desc);
create index idx_chat_course_user on public.chat_messages (course_id, user_id, created_at);
create index idx_homework_course on public.homework_checks (course_id, created_at desc);
create index idx_calibration_course on public.calibration_samples (course_id, created_at);
create index idx_ai_calls_course on public.ai_calls (course_id, created_at);

-- ---------------------------------------------------------------------------
-- Профиль создаётся при регистрации в Supabase Auth.
-- Имя и роль берутся из user_metadata, которые передаёт форма входа.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper-функции для политик. security definer, чтобы политики не упирались
-- в RLS других таблиц и не зацикливались.
-- ---------------------------------------------------------------------------

create or replace function public.is_course_owner(c uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.courses where id = c and owner_id = auth.uid());
$$;

create or replace function public.is_enrolled(c uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.enrollments where course_id = c and user_id = auth.uid());
$$;

-- Урок доступен владельцу курса всегда, студенту — только опубликованный.
create or replace function public.can_view_lesson(l uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lessons
    where id = l
      and (public.is_course_owner(course_id) or (status = 'published' and public.is_enrolled(course_id)))
  );
$$;

create or replace function public.owns_lesson_course(l uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.lessons where id = l and public.is_course_owner(course_id)
  );
$$;

-- Преподаватель видит профили студентов, записанных на его курсы.
create or replace function public.teaches_user(u uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.user_id = u and c.owner_id = auth.uid()
  );
$$;

revoke execute on function public.is_course_owner(uuid), public.is_enrolled(uuid),
  public.can_view_lesson(uuid), public.owns_lesson_course(uuid), public.teaches_user(uuid)
  from public, anon;
grant execute on function public.is_course_owner(uuid), public.is_enrolled(uuid),
  public.can_view_lesson(uuid), public.owns_lesson_course(uuid), public.teaches_user(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------------

-- Курс по коду для записи студента: до записи RLS не даёт прочитать курс напрямую.
create or replace function public.course_by_join_code(code text)
returns setof public.courses
language sql stable security definer
set search_path = public
as $$
  select * from public.courses where join_code = upper(trim(code)) limit 1;
$$;

-- Сводка по студентам курса для преподавателя: пройдено уроков, средний балл.
create or replace function public.course_students_stats(c uuid)
returns table (
  user_id uuid,
  name text,
  email text,
  streak integer,
  xp integer,
  completed integer,
  avg_score double precision,
  joined_at timestamptz
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
    select p.id, p.name, p.email, p.streak, p.xp,
           count(distinct s.lesson_id)::integer,
           avg(s.score)::double precision,
           e.joined_at
    from public.enrollments e
    join public.profiles p on p.id = e.user_id
    left join public.submissions s on s.user_id = p.id
      and s.lesson_id in (select l.id from public.lessons l where l.course_id = c)
    where e.course_id = c
    group by p.id, e.joined_at
    order by e.joined_at;
end;
$$;

-- Сколько уроков курса студент начал с момента since (первая сдача по уроку). Для лимита уроков в день.
create or replace function public.count_lessons_started_today(u uuid, c uuid, since timestamptz)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::integer from (
    select s.lesson_id, min(s.created_at) as first_at
    from public.submissions s
    where s.user_id = u
      and (u = auth.uid() or public.is_course_owner(c))
      and s.lesson_id in (select l.id from public.lessons l where l.course_id = c)
    group by s.lesson_id
  ) t where t.first_at >= since;
$$;

-- Расход по курсу: только владельцу.
create or replace function public.course_usage(c uuid)
returns table (calls integer, input_tokens bigint, output_tokens bigint, cache_read_tokens bigint, cost_usd double precision)
language sql stable security definer
set search_path = public
as $$
  select count(*)::integer, coalesce(sum(input_tokens), 0), coalesce(sum(output_tokens), 0),
         coalesce(sum(cache_read_tokens), 0), coalesce(sum(cost_usd), 0)
  from public.ai_calls
  where course_id = c and public.is_course_owner(c);
$$;

create or replace function public.course_usage_by_kind(c uuid)
returns table (kind text, calls integer, input_tokens bigint, output_tokens bigint, cache_read_tokens bigint, cost_usd double precision)
language sql stable security definer
set search_path = public
as $$
  select kind, count(*)::integer, sum(input_tokens), sum(output_tokens), sum(cache_read_tokens), sum(cost_usd)
  from public.ai_calls
  where course_id = c and public.is_course_owner(c)
  group by kind
  order by sum(cost_usd) desc;
$$;

revoke execute on function public.course_by_join_code(text), public.course_students_stats(uuid),
  public.count_lessons_started_today(uuid, uuid, timestamptz), public.course_usage(uuid), public.course_usage_by_kind(uuid)
  from public, anon;
grant execute on function public.course_by_join_code(text), public.course_students_stats(uuid),
  public.count_lessons_started_today(uuid, uuid, timestamptz), public.course_usage(uuid), public.course_usage_by_kind(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.materials enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.submissions enable row level security;
alter table public.flashcards enable row level security;
alter table public.generations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.homework_checks enable row level security;
alter table public.calibration_samples enable row level security;
alter table public.ai_calls enable row level security;

-- profiles: свой профиль плюс профили своих студентов. Вставка — только триггером.
create policy "profiles select own or students" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.teaches_user(id));
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- courses: владелец — всё, студент — чтение курсов, где записан.
create policy "courses select owner or enrolled" on public.courses
  for select to authenticated
  using (owner_id = auth.uid() or public.is_enrolled(id));
create policy "courses insert own" on public.courses
  for insert to authenticated
  with check (owner_id = auth.uid());
create policy "courses update own" on public.courses
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "courses delete own" on public.courses
  for delete to authenticated
  using (owner_id = auth.uid());

-- materials: только владелец курса.
create policy "materials owner all" on public.materials
  for all to authenticated
  using (public.is_course_owner(course_id)) with check (public.is_course_owner(course_id));

-- lessons: владелец — всё, студент — чтение опубликованных.
create policy "lessons select owner or published" on public.lessons
  for select to authenticated
  using (public.is_course_owner(course_id) or (status = 'published' and public.is_enrolled(course_id)));
create policy "lessons insert owner" on public.lessons
  for insert to authenticated
  with check (public.is_course_owner(course_id));
create policy "lessons update owner" on public.lessons
  for update to authenticated
  using (public.is_course_owner(course_id)) with check (public.is_course_owner(course_id));
create policy "lessons delete owner" on public.lessons
  for delete to authenticated
  using (public.is_course_owner(course_id));

-- enrollments: студент записывает себя, видит свои; владелец видит записи на свои курсы.
create policy "enrollments select own or owner" on public.enrollments
  for select to authenticated
  using (user_id = auth.uid() or public.is_course_owner(course_id));
create policy "enrollments insert self" on public.enrollments
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "enrollments delete own or owner" on public.enrollments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_course_owner(course_id));

-- submissions: студент — свои, владелец курса — все по своим урокам.
create policy "submissions select own or owner" on public.submissions
  for select to authenticated
  using (user_id = auth.uid() or public.owns_lesson_course(lesson_id));
create policy "submissions insert self" on public.submissions
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_view_lesson(lesson_id));

-- flashcards: только свои.
create policy "flashcards own all" on public.flashcards
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- generations, chat_messages, homework_checks: только владелец курса.
create policy "generations owner all" on public.generations
  for all to authenticated
  using (public.is_course_owner(course_id))
  with check (public.is_course_owner(course_id) and user_id = auth.uid());
create policy "chat owner all" on public.chat_messages
  for all to authenticated
  using (public.is_course_owner(course_id))
  with check (public.is_course_owner(course_id) and user_id = auth.uid());
create policy "homework owner all" on public.homework_checks
  for all to authenticated
  using (public.is_course_owner(course_id))
  with check (public.is_course_owner(course_id) and user_id = auth.uid());
create policy "calibration owner all" on public.calibration_samples
  for all to authenticated
  using (public.is_course_owner(course_id)) with check (public.is_course_owner(course_id));

-- ai_calls: пишет любой вошедший за себя, читает владелец курса (через RPC course_usage*).
create policy "ai_calls insert self" on public.ai_calls
  for insert to authenticated
  with check (user_id = auth.uid());
create policy "ai_calls select owner" on public.ai_calls
  for select to authenticated
  using (user_id = auth.uid() or (course_id is not null and public.is_course_owner(course_id)));
