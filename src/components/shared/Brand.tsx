import Link from "next/link";
import { cn } from "@/lib/utils";
import { Asterisk } from "@/components/shared/Asterisk";

/** Логотип: оранжевая звёздочка и словесный знак TO DUAL капсом, как в брендбуке. Один на все шапки, чтобы знак не расходился по экранам. */
export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex min-h-11 items-center gap-2 whitespace-nowrap text-base font-medium lg:text-lg", className)}>
      <Asterisk className="size-[18px] text-primary" />
      <span>
        <span className="uppercase tracking-[0.04em]">TO DUAL</span>
        <span className="hidden font-normal text-muted-foreground sm:inline"> Learn</span>
      </span>
    </Link>
  );
}
