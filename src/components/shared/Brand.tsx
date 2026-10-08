import Link from "next/link";
import { cn } from "@/lib/utils";

/** Логотип: оранжевый квадрат и словесный знак. Один на все шапки, чтобы знак не расходился по экранам. */
export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 whitespace-nowrap text-base font-semibold tracking-tight", className)}>
      <span aria-hidden className="size-3 rounded-[3px] bg-primary" />
      <span>
        To Dual <span className="font-normal text-muted-foreground">Learn</span>
      </span>
    </Link>
  );
}
