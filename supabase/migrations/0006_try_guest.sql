-- Пробный разбор для гостя (задача 5.7): строка расхода без пользователя.
-- Гость не создаёт профиль, поэтому user_id может быть пустым; вместо него хранится
-- хэш IP с солью и датой (сырой IP не пишем), по нему считается суточный лимит.
-- Строки пишутся только через service role: политика "ai_calls insert self" требует auth.uid().
alter table public.ai_calls alter column user_id drop not null;
alter table public.ai_calls add column ip_hash text;
alter table public.ai_calls add constraint ai_calls_user_or_ip check (user_id is not null or ip_hash is not null);
create index idx_ai_calls_ip_hash on public.ai_calls (ip_hash, created_at) where ip_hash is not null;
