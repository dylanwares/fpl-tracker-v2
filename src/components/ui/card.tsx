import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Surface-1 container, 1px border, 8px radius. No shadows — ever (§4). */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[8px] border border-border bg-surface-1", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-11 items-center justify-between gap-3 border-b border-border px-4",
        className,
      )}
    >
      <h2 className="text-[15px] font-semibold text-text-1">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

/** Small uppercase label above a value. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
      {children}
    </span>
  );
}
