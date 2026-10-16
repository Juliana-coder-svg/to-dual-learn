"use client";

import { useState, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** Кнопка отправки формы с подтверждением на странице: пока человек не нажмёт «Да», форма не уходит.
 *  Встроенное окно браузера не годится: во встроенных браузерах и на телефонах его не видно, и кнопка выглядит сломанной.
 *  Без подтверждения (message пуст) работает как обычная кнопка. */
export function ConfirmSubmitButton({ message, confirmLabel, onClick, ...props }: ComponentProps<typeof Button> & { message?: string; confirmLabel?: string }) {
  const [asking, setAsking] = useState(false);
  if (asking && message) {
    return (
      <div role="alertdialog" aria-label="Подтверждение" className="w-80 max-w-full space-y-3 rounded-lg border border-primary p-3 text-sm">
        <p>{message}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" autoFocus onClick={() => setTimeout(() => setAsking(false), 0)}>{confirmLabel ?? "Да, опубликовать"}</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setAsking(false)}>Отмена</Button>
        </div>
      </div>
    );
  }
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (message) {
          e.preventDefault();
          setAsking(true);
        }
        onClick?.(e);
      }}
    />
  );
}
