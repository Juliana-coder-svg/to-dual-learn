-- Пробный разбор для гостя (задача 5.7): строка расхода без пользователя.
-- Гость не создаёт профиль, поэтому user_id может быть пустым, но только у kind = 'try'.
-- Вместо пользователя хранится хэш IP: sha256(соль из TRY_IP_SALT + дата + IP), сырой IP не пишется.
-- Хэш нужен только для суточного лимита и живёт не дольше суток: приложение обнуляет ip_hash у строк старше суток
-- (purgeTryIpHashes в src/lib/db/queries.ts, вызывается на каждом пробном разборе и в кроне). Сама строка расхода остаётся.
-- Строки пишутся только через service role. RLS не менялся: политика "ai_calls insert self"
-- требует user_id = auth.uid(), гостевую строку (user_id null) она не пропускает.
alter table public.ai_calls alter column user_id drop not null;
alter table public.ai_calls add column ip_hash text;
alter table public.ai_calls add constraint ai_calls_user_or_try check (user_id is not null or kind = 'try');
create index idx_ai_calls_ip_hash on public.ai_calls (ip_hash, created_at) where ip_hash is not null;
