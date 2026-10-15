import { cn } from "@/lib/utils";

/**
 * Звёздочка To Dual: фирменный знак из брендбука. Три штриха с круглыми концами, цвет от currentColor. Декоративная.
 * Логотип всегда целый: в шапке, фавиконе и рядом со словами TO DUAL или LEARN стоит только она, без серых лучей
 * и без вращения. Индикатор прогресса это другой компонент, `ProgressAsterisk`, и он живёт только рядом с числом.
 */
export function Asterisk({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" className={cn("size-4 shrink-0", className)}>
      <path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5" />
    </svg>
  );
}
