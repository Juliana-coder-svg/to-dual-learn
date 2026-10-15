"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** Кнопка отправки формы с предупреждением: пока человек не подтвердит, форма не уходит.
 *  Без подтверждения (message пуст) работает как обычная кнопка. */
export function ConfirmSubmitButton({ message, onClick, ...props }: ComponentProps<typeof Button> & { message?: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (message && !window.confirm(message)) e.preventDefault();
        onClick?.(e);
      }}
    />
  );
}
