"use client";

import { useEffect } from "react";

const TRIED_KEY = "enter-tried";

/** Лендинг отдаётся из кэша без чтения сессии. Если в браузере есть cookie Supabase Auth,
 *  уводим человека на /enter, откуда сервер перенаправит на главную страницу его роли.
 *  Cookie может остаться от умершей сессии (профиль удалён, refresh истёк): тогда /enter ведёт на /login,
 *  и чтобы такой человек всё же мог открыть лендинг, пробуем один раз за вкладку. */
export function SessionRedirect() {
  useEffect(() => {
    if (!/(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie)) return;
    try {
      if (sessionStorage.getItem(TRIED_KEY)) return;
      sessionStorage.setItem(TRIED_KEY, "1");
    } catch {
      // Хранилище закрыто (приватный режим): редиректим без защиты, она нужна только для редкого случая.
    }
    window.location.replace("/enter");
  }, []);
  return null;
}
