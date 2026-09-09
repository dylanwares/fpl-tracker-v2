import { Skeleton } from "./states";

/**
 * Shown while a route resolves. The point is that the page keeps its shape —
 * a native app doesn't blank out between tabs, and neither should this.
 */
export function PageSkeleton({ cards = 2, rows = 5 }: { cards?: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      {Array.from({ length: cards }, (_, card) => (
        <div key={card} className="rounded-[8px] border border-border bg-surface-1">
          <div className="flex h-11 items-center border-b border-border px-4">
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: rows }, (_, row) => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
