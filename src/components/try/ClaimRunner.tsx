"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { claimTryAttemptAction } from "@/lib/actions/try-claim";
import { TRY_STORAGE_KEY } from "@/components/learn/LessonPlayer";

type State = "working" | "empty" | "invalid" | "expired" | "unavailable" | "error";

const MESSAGES: Record<Exclude<State, "working">, { title: string; text: string }> = {
  empty: { title: "Пробного ответа в этом браузере нет", text: "Если вы проходили урок на другом устройстве или в другом браузере, ответ остался там. Пройдите урок в курсе заново, это займёт пять минут." },
  invalid: { title: "Сервер не принял сохранённый ответ", text: "Такой ответ перенести нельзя. Пройдите урок в курсе заново." },
  expired: { title: "Пробный ответ устарел", text: "Пробный ответ хранится сутки. Пройдите урок в курсе заново." },
  unavailable: { title: "Курс-пример сейчас недоступен", text: "Ответ остался в этом браузере. Откройте эту страницу позже." },
  error: { title: "Ответ пока не перенесён", text: "Ответ остался в этом браузере. Обновите страницу, а если не выйдет, повторите через минуту." },
};

/** Берёт ответ гостя из localStorage и просит сервер перенести его в профиль. */
export function ClaimRunner() {
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const forget = () => {
      try {
        localStorage.removeItem(TRY_STORAGE_KEY);
      } catch {
        // не критично
      }
    };
    async function run(): Promise<State | null> {
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(TRY_STORAGE_KEY);
      } catch {
        raw = null;
      }
      if (!raw) return "empty";
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return "invalid";
      }
      const res = await claimTryAttemptAction(parsed);
      if (res.ok) {
        forget();
        router.replace(`${res.href}?claimed=1`);
        return null;
      }
      if (res.reason === "consent") {
        router.replace("/consent?next=%2Ftry%2Fclaim");
        return null;
      }
      if (res.reason !== "unavailable") forget();
      return res.reason;
    }
    run().then((next) => next && setState(next), () => setState("error"));
  }, [router]);

  if (state === "working") {
    return <p role="status" className="type-body text-muted-foreground">Переносим ответ в профиль…</p>;
  }
  const m = MESSAGES[state];
  return (
    <div>
      <h1 className="type-title">{m.title}</h1>
      <p className="mt-3 type-body text-muted-foreground">{m.text}</p>
      <div className="mt-6">
        <Button nativeButton={false} render={<Link href="/learn" />} size="lg">К курсам</Button>
      </div>
    </div>
  );
}
