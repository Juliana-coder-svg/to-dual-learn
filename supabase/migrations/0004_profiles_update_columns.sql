-- Пользователь меняет в своём профиле только то, что меняет приложение из его сессии:
-- имя, роль, подписку на письмо и прогресс. Остальное (email, id, created_at, last_digest_at)
-- пишут триггер handle_new_user и service role (крон).
-- До этой миграции политика «profiles update own» вместе с grant all позволяла через PostgREST
-- с публичным ключом переписать свою почту, которую преподаватель видит в списке студентов.
-- Код, который начнёт обновлять другие колонки из пользовательской сессии, получит
-- «permission denied for column»: тогда дополнить список здесь.

revoke update on public.profiles from anon, authenticated;
grant update (name, role, daily_email, streak, xp, last_lesson_at) on public.profiles to authenticated;
