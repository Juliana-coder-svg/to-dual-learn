import Link from "next/link";
import type { TeacherStep } from "@/lib/onboarding/teacher-steps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Три шага преподавателя. Выполненный шаг отмечен галочкой и не зовёт к действию, текущий выделен рамкой акцента. */
export function StartSteps({ steps, className }: { steps: TeacherStep[]; className?: string }) {
  return (
    <ol className={cn("grid gap-3 md:grid-cols-3", className)}>
      {steps.map((s, i) => (
        <li
          key={s.id}
          aria-current={s.state === "current" ? "step" : undefined}
          className={cn("flex flex-col rounded-lg border p-5", s.state === "current" ? "border-primary" : "")}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
                s.state === "done" ? "border-primary bg-primary text-primary-foreground" : s.state === "current" ? "border-primary text-primary-strong" : "text-muted-foreground",
              )}
            >
              {s.state === "done" ? "✓" : i + 1}
            </span>
            <h3 className="text-balance text-base font-semibold">{s.title}</h3>
          </div>
          <p className="mt-3 flex-1 text-sm text-muted-foreground">{s.text}</p>
          <div className="mt-4">
            {s.state === "done" ? (
              <p className="text-sm font-medium"><span className="sr-only">Выполнено: </span>{s.doneNote}</p>
            ) : (
              <Button nativeButton={false} render={<Link href={s.href} />} variant={s.state === "current" ? "default" : "outline"} size="sm">{s.action}</Button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
