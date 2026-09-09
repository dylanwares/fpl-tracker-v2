import { cn } from "@/lib/utils";

/**
 * Loading / empty / error states (design spec §6.8).
 * Never a spinner for content — the layout holds its shape so nothing jumps.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-[6px] bg-surface-2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)] bg-[length:200%_100%]",
        "motion-safe:animate-[shimmer_2s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-px">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="px-4 py-8 text-center text-[14px] text-text-3">{message}</p>;
}

/** One failing section shouldn't blank the page — this lives inside the card. */
export function ErrorState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-[14px] font-medium text-bad">{message}</p>
      {hint && <p className="mt-1 text-[12px] text-text-3">{hint}</p>}
    </div>
  );
}

/**
 * A non-fatal warning that sits above content rather than replacing it — used
 * when the xP feed is unreachable and the page still has real numbers to show.
 * There is no fallback source for projections (product spec §7.4), so the
 * honest thing is to say so and leave the xP columns blank.
 */
export function WarningBanner({ message, detail }: { message: string; detail?: string }) {
  return (
    <div
      role="status"
      className="rounded-[8px] border border-warn/30 bg-warn/10 px-4 py-3 text-[13px]"
    >
      <p className="font-medium text-warn">{message}</p>
      {detail && <p className="mt-0.5 text-text-3">{detail}</p>}
    </div>
  );
}

/** Placeholder for a page that is on the roadmap but not built yet. */
export function NotBuiltYet({ what, plan }: { what: string; plan: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-border-strong bg-surface-1 px-4 py-10 text-center">
      <p className="text-[15px] font-medium text-text-2">{what}</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-text-3">{plan}</p>
    </div>
  );
}
