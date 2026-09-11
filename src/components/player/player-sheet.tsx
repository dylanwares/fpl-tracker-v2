"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { BlankCell, FixtureCell } from "@/components/ui/fixture-cell";
import { RagPill, RagValue } from "@/components/ui/rag";
import { Skeleton } from "@/components/ui/states";
import { badgeUrl } from "@/lib/model/assets";
import type { DetailGameweek, PlayerDetail } from "@/lib/model/detail";
import { deltaToPeers, type MetricScore } from "@/lib/model/rag";
import { cn, formatSigned } from "@/lib/utils";

/**
 * The universal player sheet (design spec §6.10).
 *
 * The panel keeps its shape while loading rather than collapsing to a spinner,
 * so opening it doesn't shift the page behind or flash an empty box.
 */
export function PlayerSheet({
  detail,
  isLoading,
  onClose,
}: {
  detail: PlayerDetail | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-[16px] border border-border bg-surface-1 pb-[env(safe-area-inset-bottom)] sm:rounded-[12px]">
      {/* Grab handle — mobile affordance, hidden once the panel is centred. */}
      <div className="sticky top-0 z-10 flex justify-center bg-surface-1 pt-2 sm:hidden">
        <span aria-hidden className="h-1 w-9 rounded-full bg-border-strong" />
      </div>

      {detail === null ? (
        <LoadingBody isLoading={isLoading} />
      ) : (
        <Body detail={detail} onClose={onClose} />
      )}
    </div>
  );
}

function LoadingBody({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) {
    return (
      <p className="px-4 py-10 text-center text-[14px] text-text-3">
        That player could not be found.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function Body({ detail, onClose }: { detail: PlayerDetail; onClose: () => void }) {
  return (
    <>
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        {detail.teamCode !== null ? (
          <Image
            src={badgeUrl(detail.teamCode)}
            alt=""
            width={70}
            height={70}
            unoptimized
            className="size-10 shrink-0"
          />
        ) : (
          <span className="size-10 shrink-0 rounded-full bg-surface-3" />
        )}

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-semibold text-text-1">{detail.fullName}</h2>
          <p className="mt-0.5 text-[12px] text-text-2">
            {detail.position} · {detail.teamName} · £{detail.price.toFixed(1)}m
            {detail.priceChangeEvent !== 0 && (
              <span className={detail.priceChangeEvent > 0 ? "text-good" : "text-bad"}>
                {" "}
                {formatSigned(detail.priceChangeEvent, 1)}m
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-[8px] text-text-2 transition-colors duration-100 hover:bg-surface-2 hover:text-text-1"
        >
          <X size={18} aria-hidden />
        </button>
      </header>

      {detail.availability !== "available" && (
        <p
          className={`border-b border-border px-4 py-2 text-[13px] ${
            detail.availability === "out" ? "text-bad" : "text-warn"
          }`}
        >
          {detail.news ||
            (detail.availability === "out" ? "Unavailable for selection" : "Doubtful")}
          {detail.chanceOfPlaying !== null && (
            <span className="text-text-3"> · {detail.chanceOfPlaying}% chance of playing</span>
          )}
        </p>
      )}

      <Section title="Ownership and form">
        <StatGrid
          items={[
            ["Selected by", `${detail.selectedBy.toFixed(1)}%`],
            ["Form", detail.form.toFixed(1)],
            ["Total points", String(detail.totalPoints)],
            ["Per game", detail.pointsPerGame.toFixed(1)],
            ["Points per £m", detail.pointsPerMillion.toFixed(1)],
            ["Minutes", `${detail.minutes} (${(detail.minutesShare * 100).toFixed(0)}%)`],
          ]}
        />
      </Section>

      <Section title="Ratings">
        <div className="flex flex-col gap-2">
          <RatingRow
            label="Points vs position"
            metric={detail.rating.points}
            digits={0}
          />
          <RatingRow label="Points per £m" metric={detail.rating.value} digits={1} />
          <RatingRow label="Expected points" metric={detail.rating.expected} digits={1} />
          <RatingRow label="Overall" rag={detail.rating.overall} emphasis />
        </div>
        {detail.rating.insufficientMinutes && (
          <p className="mt-2 text-[12px] text-text-3">
            Too few minutes to rate on points. Expected points is still rated — it&apos;s a
            forecast, not a record.
          </p>
        )}
      </Section>

      <Section title="Form and fixtures">
        {/* Both rows scroll together, so a double gameweek can never push the
            sheet itself sideways. */}
        <div className="-mx-1 overflow-x-auto px-1">
          <div className="flex w-max min-w-full flex-col gap-2.5">
            <FormRow
              label="Last 5"
              columns={detail.history}
              past
              keeper={detail.position === "GKP"}
            />
            <FormRow label={`Next ${detail.fixtures.length}`} columns={detail.fixtures} />
          </div>
        </div>

        <p className="mt-3 text-[11px] text-text-3">
          Results are rated against what a starting {detail.position} is expected to return in
          a gameweek; forecasts against the spread of every {detail.position}&apos;s xP. Grey
          means he didn&apos;t play, not that he played badly. Past cells show minutes and xG.
          Difficulty from {detail.difficultySource}.
        </p>

        {!detail.isProjected && (
          <p className="mt-2 text-[12px] text-warn">
            Not covered by the expected-points feed, so every xP above is “–” rather than zero.
          </p>
        )}
      </Section>

      <Section title="Underlying, per 90">
        <StatGrid
          items={[
            ["xG", detail.per90.xg.toFixed(2)],
            ["xA", detail.per90.xa.toFixed(2)],
            ["xGI", detail.per90.xgi.toFixed(2)],
            detail.position === "GKP"
              ? ["Saves", detail.per90.saves.toFixed(2)]
              : ["Def. contrib.", detail.per90.defcon.toFixed(2)],
            ["xGC", detail.per90.xgc.toFixed(2)],
            ["Starts", String(detail.starts)],
          ]}
        />
      </Section>

      <Section title="This season" last>
        <StatGrid
          items={[
            ["Goals", String(detail.goals)],
            ["Assists", String(detail.assists)],
            ["Clean sheets", String(detail.cleanSheets)],
            ["Bonus", String(detail.bonus)],
            ["Def. contributions", String(detail.defensiveContribution)],
            ["xP over horizon", detail.xpHorizon === null ? "–" : detail.xpHorizon.toFixed(1)],
          ]}
        />
      </Section>
    </>
  );
}

/**
 * One row of the form strip (design spec §6.10): a fixed five columns, past
 * above future. Fixed-width cells rather than a grid — the two rows then line
 * up column for column without either knowing about the other.
 */
function FormRow({
  label,
  columns,
  past = false,
  keeper = false,
}: {
  label: string;
  columns: DetailGameweek[];
  past?: boolean;
  /** Keepers get saves under the score; xG is 0.00 for them every week. */
  keeper?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3">
        {label}
      </span>
      <ol className="flex items-stretch gap-1">
        {columns.map((column, index) => (
          <FormCell
            key={column.gameweek ?? `pad-${index}`}
            column={column}
            past={past}
            keeper={keeper}
          />
        ))}
      </ol>
    </div>
  );
}

function FormCell({
  column,
  past,
  keeper,
}: {
  column: DetailGameweek;
  past: boolean;
  keeper: boolean;
}) {
  // A padding column is a gameweek that hasn't happened — distinct from a blank,
  // which is a gameweek his team sits out and gets the hatched cell. It carries
  // one dash and no other furniture, so the eye skips straight past it.
  const isPadding = column.gameweek === null;
  const blank = "\u00a0";

  return (
    <li
      className={cn(
        "flex w-[3.6rem] shrink-0 flex-col items-center gap-1 rounded-[8px] px-1 py-1.5",
        isPadding ? "bg-surface-2/40" : "bg-surface-2",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-text-3">
        {isPadding ? blank : `GW${column.gameweek}`}
      </span>

      <span className="flex w-full flex-col items-center gap-0.5">
        {isPadding ? (
          <span
            aria-label="Not played yet"
            className="inline-flex h-7 w-full items-center justify-center text-[12px] text-text-3"
          >
            –
          </span>
        ) : column.matches.length === 0 ? (
          <BlankCell className="h-7 w-full min-w-0" />
        ) : (
          column.matches.map((match) => (
            <FixtureCell
              key={`${match.opponent}-${match.isHome}`}
              opponent={match.opponent}
              home={match.isHome}
              difficulty={match.difficulty}
              className="h-7 w-full min-w-0"
            />
          ))
        )}
      </span>

      <span className="tabular-nums">
        {isPadding ? (
          <span className="text-[13px]">{blank}</span>
        ) : column.points === null ? (
          <span className="text-[13px] text-text-3">–</span>
        ) : (
          <RagValue rag={column.rag} className="gap-1 text-[13px]">
            {past ? column.points : column.points.toFixed(1)}
          </RagValue>
        )}
      </span>

      {/* Rendered in both rows, empty upcoming, so the two rows stay the same
          height and the columns read as one grid. */}
      <span className="text-[10px] tabular-nums text-text-3">
        {past && column.minutes !== null
          ? `${column.minutes}' · ${keeper ? `${column.saves ?? 0} sv` : (column.xg?.toFixed(2) ?? "–")}`
          : blank}
      </span>
    </li>
  );
}

function Section({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section className={last ? "px-4 py-3" : "border-b border-border px-4 py-3"}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function StatGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-3">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="truncate text-[11px] text-text-3">{label}</dt>
          <dd className="text-[14px] font-medium text-text-1">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RatingRow({
  label,
  metric,
  rag,
  digits = 1,
  emphasis = false,
}: {
  label: string;
  metric?: MetricScore;
  rag?: Parameters<typeof RagPill>[0]["rag"];
  digits?: number;
  emphasis?: boolean;
}) {
  const delta = metric ? deltaToPeers(metric) : null;
  const rating = metric?.rag ?? rag ?? "none";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className={emphasis ? "text-[14px] font-medium text-text-1" : "text-[14px] text-text-2"}>
        {label}
      </span>
      <span className="flex items-center gap-2">
        {metric && (
          <span className="text-[13px] text-text-2">
            {metric.value === null ? "–" : metric.value.toFixed(digits)}
            {delta !== null && (
              <span className={delta >= 0 ? "ml-1 text-good" : "ml-1 text-bad"}>
                {formatSigned(delta, digits)}
              </span>
            )}
          </span>
        )}
        <RagPill rag={rating} title={label} />
      </span>
    </div>
  );
}
