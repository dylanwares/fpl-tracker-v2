import { ChevronDown, ChevronUp, Minus } from "lucide-react";
import { ExpandableRow } from "@/components/league/expandable-row";
import { CandidateTable, ExposureTable } from "@/components/league/exposure-table";
import { InsightTabs } from "@/components/league/insight-tabs";
import { Pitch } from "@/components/team/pitch";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState, WarningBanner } from "@/components/ui/states";
import { getLeagueView, unownedCandidates, type LeagueManager, type LeagueView } from "@/lib/model/league";
import { buildRagScorer } from "@/lib/model/rag";
import { chipLabel } from "@/lib/model/squad";
import { cn } from "@/lib/utils";

/** League (product spec §3) — the page the whole app is pointed at. */
export default async function LeaguePage() {
  let view;
  try {
    view = await getLeagueView();
  } catch (error) {
    return (
      <ErrorState
        message="Could not load the league"
        hint={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (view === null) {
    return <ErrorState message="That league has no managers in it" />;
  }

  const scorer = buildRagScorer(view.pool);
  const owned = view.exposures.filter((row) => row.ownedByMe);
  const notOwned = view.exposures.filter((row) => !row.ownedByMe);

  return (
    <div className="flex flex-col gap-4">
      <Headline view={view} />

      {!view.pool.projectionsAvailable && (
        <WarningBanner
          message="Expected points feed unavailable"
          detail="Standings, gaps and chips are live. Every xP-based insight below is blank until the provider returns."
        />
      )}

      <Card>
        <CardHeader title={`${view.leagueName} · GW${view.gameweek} squads`} />
        <div>
          {view.managers.map((manager) => (
            <ExpandableRow
              key={manager.entryId}
              highlight={manager.isMe}
              label={`${manager.managerName}, ${manager.entryName}`}
              header={<ManagerRow manager={manager} />}
            >
              {manager.starters.length === 0 ? (
                <p className="px-2 py-4 text-center text-[13px] text-text-3">
                  No confirmed squad for this manager yet.
                </p>
              ) : (
                <Pitch
                  starters={manager.starters}
                  bench={manager.bench}
                  scorer={scorer}
                  metric="xpNext"
                />
              )}
            </ExpandableRow>
          ))}
        </div>
        <p className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-text-3">
          Squads are as at GW{view.gameweek}. FPL keeps everyone&apos;s upcoming team private until
          the deadline, so rivals may transfer before GW{view.planningGameweek}.
        </p>
      </Card>

      <Card>
        <CardHeader title="Where I gain and lose" />
        <CardBody>
          <InsightTabs
            swing={
              <>
                <ExposureTable
                  rows={[...view.exposures].sort(
                    (a, b) => (b.swingHorizon ?? 0) - (a.swingHorizon ?? 0),
                  )}
                  metric="swing"
                  size={view.size}
                  emptyMessage="No confirmed squads to compare yet."
                />
                <p className="mt-3 text-[11px] leading-relaxed text-text-3">
                  Swing is <span className="text-text-2">xP × (my exposure − effective
                  ownership)</span>. Green means I gain places when he returns; red means the
                  league gains on me. A captain counts twice on both sides, which is why EO can
                  exceed 100%.
                </p>
              </>
            }
            threats={
              <>
                <ExposureTable
                  rows={[...notOwned].sort(
                    (a, b) =>
                      (b.entry.xpHorizon ?? 0) * b.effectiveOwnership -
                      (a.entry.xpHorizon ?? 0) * a.effectiveOwnership,
                  )}
                  metric="threat"
                  size={view.size}
                  emptyMessage="You start every player the league starts."
                />
                <p className="mt-3 text-[11px] leading-relaxed text-text-3">
                  Players I don&apos;t start, ranked by effective ownership × xP — the ones most
                  likely to cost me places. Compare EO against global ownership: a big gap means
                  this league is exposed to him in a way the wider game isn&apos;t.
                </p>
              </>
            }
            differentials={
              <>
                <ExposureTable
                  rows={[...owned].sort(
                    (a, b) =>
                      (b.entry.xpHorizon ?? 0) * (1 - b.effectiveOwnership) -
                      (a.entry.xpHorizon ?? 0) * (1 - a.effectiveOwnership),
                  )}
                  metric="differential"
                  size={view.size}
                  emptyMessage="No confirmed squad of yours to compare."
                />
                <p className="mt-3 text-[11px] leading-relaxed text-text-3">
                  My starters the league mostly doesn&apos;t have, ranked by xP × (1 − EO).
                  {view.gapToLeader !== null && view.gapToLeader > 0 ? (
                    <>
                      {" "}
                      You are {view.gapToLeader} behind the leader, so differentials are working
                      for you.
                    </>
                  ) : (
                    <> Chasing differentials from the front is usually the wrong move.</>
                  )}
                </p>
              </>
            }
            candidates={
              <>
                <CandidateTable players={unownedCandidates(view)} />
                <p className="mt-3 text-[11px] leading-relaxed text-text-3">
                  Highest projected players not started by anyone in the league — transfer
                  candidates rather than current holdings.
                </p>
              </>
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

function Headline({ view }: { view: LeagueView }) {
  const me = view.me;
  if (!me) {
    return (
      <Card>
        <CardBody>
          <p className="text-[14px] text-text-2">
            Your entry isn&apos;t in this league&apos;s standings.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[12px] text-text-2">
            {view.leagueName} · {view.size} managers
          </span>
          <Movement movement={me.movement} />
        </div>

        <div className="grid grid-cols-3 divide-x divide-border">
          <Stat label="Rank" value={`${me.rank}`} sub={`of ${view.size}`} />
          <Stat
            label="Behind above"
            value={view.gapAbove === null ? "—" : String(view.gapAbove)}
            sub={view.gapAbove === null ? "top of the league" : "points"}
            tone={view.gapAbove === null ? undefined : "bad"}
          />
          <Stat
            label="Ahead of below"
            value={view.gapBelow === null ? "—" : String(view.gapBelow)}
            sub={view.gapBelow === null ? "bottom" : "points"}
            tone={view.gapBelow === null ? undefined : "good"}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 text-center">
      <span
        className={cn(
          "text-[28px] font-bold leading-none",
          tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-text-1",
        )}
      >
        {value}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
        {label}
      </span>
      <span className="text-[11px] text-text-3">{sub}</span>
    </div>
  );
}

function Movement({ movement }: { movement: number }) {
  if (movement === 0) {
    return (
      <span className="flex items-center gap-1 text-[12px] text-text-3">
        <Minus size={12} aria-hidden /> No change
      </span>
    );
  }
  const up = movement > 0;
  return (
    <span className={cn("flex items-center gap-1 text-[12px] font-medium", up ? "text-good" : "text-bad")}>
      {up ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
      {Math.abs(movement)} {Math.abs(movement) === 1 ? "place" : "places"}
    </span>
  );
}

function ManagerRow({ manager }: { manager: LeagueManager }) {
  const chip = chipLabel(manager.activeChip);

  return (
    <span className="flex items-center gap-3">
      <span className="w-5 shrink-0 text-[13px] font-semibold tabular-nums text-text-2">
        {manager.rank}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-medium text-text-1">{manager.entryName}</span>
          {manager.isMe && (
            <span className="shrink-0 rounded-[3px] bg-accent-600 px-1 text-[10px] font-bold text-white">
              ME
            </span>
          )}
          {chip && (
            <span className="shrink-0 rounded-[3px] bg-surface-3 px-1 text-[10px] font-bold text-accent-400">
              {chip}
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-text-3">
          <span className="truncate">{manager.managerName}</span>
          <Movement movement={manager.movement} />
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-text-3">
          Chips left: {manager.chipsLeftNow.length === 0 ? "none" : manager.chipsLeftNow.join(", ")}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-semibold tabular-nums text-text-1">
          {manager.total}
        </span>
        <span className="block text-[11px] tabular-nums text-text-3">
          GW {manager.eventTotal}
        </span>
      </span>

      <span className="w-12 shrink-0 text-right">
        <span className="block text-[13px] font-semibold tabular-nums text-text-2">
          {manager.projectedNext === null ? "–" : manager.projectedNext.toFixed(1)}
        </span>
        <span className="block text-[10px] text-text-3">xP next</span>
      </span>
    </span>
  );
}
