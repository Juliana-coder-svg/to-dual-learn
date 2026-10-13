-- Согласия пользователя (docs/legal/consent.md): обработка данных для работы сервиса (processing),
-- письма о программах To Dual (marketing), принятие пользовательского соглашения (terms).
-- IP и user agent не храним. Время принятия ставит база; пользователь может только отозвать своё
-- согласие (withdrawn_at), историю не стирает. Строки уходят каскадом вместе с профилем.

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('processing', 'marketing', 'terms')),
  version text not null check (length(version) between 1 and 100),
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create index idx_consents_user on public.consents (user_id, kind, accepted_at desc);

alter table public.consents enable row level security;

create policy "consents select own" on public.consents
  for select to authenticated
  using (user_id = auth.uid());

create policy "consents insert own" on public.consents
  for insert to authenticated
  with check (user_id = auth.uid() and withdrawn_at is null);

create policy "consents withdraw own" on public.consents
  for update to authenticated
  using (user_id = auth.uid() and withdrawn_at is null)
  with check (user_id = auth.uid() and withdrawn_at is not null);

-- Supabase выдаёт all на новые таблицы в public ролям anon и authenticated: сужаем до нужного.
-- Политики delete нет, и грант на delete снят: историю согласий пользователь не стирает.
revoke all on public.consents from anon;
revoke insert, update, delete on public.consents from authenticated;
grant select on public.consents to authenticated;
grant insert (user_id, kind, version) on public.consents to authenticated;
grant update (withdrawn_at) on public.consents to authenticated;
