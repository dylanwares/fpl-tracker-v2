import { BarChart, LineChart } from "@/components/charts/chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState, WarningBanner } from "@/components/ui/states";
import { getAnalysis } from "@/lib/model/analysis-data";
import { chipLabel } from "@/lib/model/squad";
import type { AnalysisView, GameweekAnalysis } from "@/lib/model/analysis";
import { cn, formatSigned } from "@/lib/utils";

/**
 * Analysis (product spec §4) — how good my decisions were, not how many points
 * they scored.
 */
export default async function AnalysisPage() {
  let view;
  try {
    view = await getAnalysis();
  } catch (error) {
    return (
      <ErrorState
        message="Could not load your season"
        hint={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (view === null) {
    return (
      <Card>
        <CardBody>
          <p className="text-[14px] text-text-2">
            No gameweeks played yet — there is nothing to analyse.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {view.isEarly && (
        <WarningBanner
          message={`Only ${view.gameweeks.length} gameweek${view.gameweeks.length === 1 ? "" : "s"} played`}
          detail="Every number here is real, but none of it is a trend yet. This page gets useful around GW10."
        />
      )}

      <Totals view={view} />
      <Captaincy view={view} />
      <Bench view={view} />
      <Transfers view={view} />
      <VsAverages view={view} />
    </div>
  );
}

function Totals({ view }: { view: AnalysisView }) {
  const { totals } = view;

  return (
    <Card>
      <CardHeader title="Season so far" />
      <CardBody>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <Figure label="Points" value={String(totals.points)} />
          <Figure
            label="Lost to captaincy"
            value={totals.captaincyLoss === 0 ? "0" : `−${totals.captaincyLoss}`}
            tone={totals.captaincyLoss > 0 ? "bad" : undefined}
          />
          <Figure
            label="Left on bench"
            value={String(totals.benchPoints)}
            tone={totals.benchPoints > 0 ? "warn" : undefined}
          />
          <Figure
            label="Vs game average"
            value={formatSigned(totals.vsGameAverage)}
            tone={totals.vsGameAverage >= 0 ? "good" : "bad"}
          />
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-4 sm:grid-cols-4">
          <Figure
            label="Vs league average"
            value={
              totals.vsLeagueAverage === null ? "—" : formatSigned(totals.vsLeagueAverage, 1)
            }
            tone={
              totals.vsLeagueAverage === null
                ? undefined
                : totals.vsLeagueAverage >= 0
                  ? "good"
                  : "bad"
            }
          />
          <Figure
            label="Transfer net"
            value={formatSigned(totals.transferNet)}
            tone={totals.transferNet >= 0 ? "good" : "bad"}
          />
          <Figure
            label="Hits taken"
            value={totals.hits === 0 ? "0" : `${totals.hits} (−${totals.hitCost})`}
            tone={totals.hits > 0 ? "bad" : undefined}
          />
          <Figure
            label="Best gameweek"
            value={
            view.best === null ? "—" : `GW${view.best.gameweek} · ${view.best.netPoints}`
          }
          />
        </div>
      </CardBody>
    </Card>
  );
}

function Captaincy({ view }: { view: AnalysisView }) {
  const chips = view.gameweeks.filter((week) => week.chip !== null);

  return (
    <Card>
      <CardHeader title="Captaincy" />
      <CardBody className="flex flex-col gap-4">
        <BarChart
          label="Points lost to captaincy by gameweek"
          points={view.gameweeks.map((week) => ({
            label: week.gameweek,
            value: -week.captaincyLoss,
          }))}
        />

        <ul className="flex flex-col gap-px">
          {view.gameweeks.map((week) => (
            <li
              key={week.gameweek}
              className="flex items-center gap-3 border-b border-border py-1.5 text-[13px] last:border-b-0"
            >
              <span className="w-10 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3">
                GW{week.gameweek}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-1">
                {week.captain.name}
                <span className="text-text-3"> ({week.captain.points})</span>
                {week.multiplier === 3 && (
                  <span className="ml-1 rounded-[3px] bg-surface-3 px-1 text-[10px] font-bold text-accent-400">
                    TC
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-text-2">
                best: {week.best.name}
                <span className="text-text-3"> ({week.best.points})</span>
              </span>
              <span
                className={cn(
                  "w-10 shrink-0 text-right font-semibold tabular-nums",
                  week.captaincyLoss > 0 ? "text-bad" : "text-good",
                )}
              >
                {week.captaincyLoss > 0 ? `−${week.captaincyLoss}` : "✓"}
              </span>
            </li>
          ))}
        </ul>

        {chips.length > 0 && (
          <div className="rounded-[6px] border border-border bg-surface-2/50 px-3 py-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
              Chips played
            </h3>
            <ul className="mt-1 flex flex-col gap-0.5 text-[13px]">
              {chips.map((week) => (
                <li key={week.gameweek} className="flex justify-between gap-3">
                  <span className="text-text-1">
                    GW{week.gameweek} · {chipLabel(week.chip)}
                  </span>
                  <span className={week.chipGain === null ? "text-text-3" : "text-text-2"}>
                    {week.chipGain === null
                      ? "no counterfactual to measure"
                      : `+${week.chipGain} points`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-text-3">
          Loss is <span className="text-text-2">(best in my XI − my captain) × multiplier</span>,
          so a poor Triple Captain costs three times the gap. There is no
          &ldquo;highest xP&rdquo; baseline: the feed re-projects past gameweeks, so what it
          expected before a deadline cannot be recovered.
        </p>
      </CardBody>
    </Card>
  );
}

function Bench({ view }: { view: AnalysisView }) {
  const subs = view.gameweeks.flatMap((week) =>
    week.autoSubs.map((sub) => ({ ...sub, gameweek: week.gameweek })),
  );

  return (
    <Card>
      <CardHeader title="Bench" />
      <CardBody className="flex flex-col gap-4">
        <BarChart
          label="Points left on the bench by gameweek"
          points={view.gameweeks.map((week) => ({
            label: week.gameweek,
            value: week.benchPoints,
          }))}
          positiveColour="var(--warn)"
        />

        <ul className="flex flex-col gap-px text-[13px]">
          {view.gameweeks.map((week) => (
            <li
              key={week.gameweek}
              className="flex items-center gap-3 border-b border-border py-1.5 last:border-b-0"
            >
              <span className="w-10 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3">
                GW{week.gameweek}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-2">
                {week.benchRegret === null
                  ? "nothing scored on the bench"
                  : `${week.benchRegret.name} scored ${week.benchRegret.points}`}
              </span>
              <span
                className={cn(
                  "w-10 shrink-0 text-right font-semibold tabular-nums",
                  week.benchPoints > 0 ? "text-warn" : "text-text-3",
                )}
              >
                {week.benchPoints}
              </span>
            </li>
          ))}
        </ul>

        {subs.length > 0 && (
          <div className="rounded-[6px] border border-border bg-surface-2/50 px-3 py-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
              Automatic substitutions
            </h3>
            <ul className="mt-1 flex flex-col gap-0.5 text-[13px]">
              {subs.map((sub) => (
                <li key={`${sub.gameweek}-${sub.inName}`} className="flex justify-between gap-3">
                  <span className="text-text-1">
                    GW{sub.gameweek} · {sub.inName} for {sub.outName}
                  </span>
                  <span className={sub.gained >= 0 ? "text-good" : "text-bad"}>
                    {formatSigned(sub.gained)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-text-3">
          Bench points are not all mistakes — a defender who blanks is meant to be benched. The
          cause split the spec asks for (rotation vs. injury) is left out: it needs a
          player&apos;s status in that week, which the API doesn&apos;t keep.
        </p>
      </CardBody>
    </Card>
  );
}

function Transfers({ view }: { view: AnalysisView }) {
  return (
    <Card>
      <CardHeader title="Transfers" />
      <CardBody>
        {view.transfers.length === 0 ? (
          <p className="py-4 text-center text-[13px] text-text-3">
            No transfers made yet — nothing to grade.
          </p>
        ) : (
          <ul className="flex flex-col gap-px">
            {view.transfers.map((transfer) => (
              <li
                key={`${transfer.gameweek}-${transfer.inId}`}
                className="flex items-center gap-3 border-b border-border py-2 text-[13px] last:border-b-0"
              >
                <span className="w-10 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3">
                  GW{transfer.gameweek}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-text-1">
                    {transfer.outName} → {transfer.inName}
                  </span>
                  <span className="block text-[11px] text-text-3">
                    {transfer.pointsIn} in, {transfer.pointsOut} out
                    {transfer.cost > 0 && `, −${transfer.cost} hit`}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[15px] font-semibold tabular-nums",
                    transfer.net >= 0 ? "text-good" : "text-bad",
                  )}
                >
                  {formatSigned(transfer.net)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-text-3">
          Points scored by the player in minus the player out, from the transfer gameweek onward,
          minus any hit. A hit that returned +2 is still a loss against doing nothing.
        </p>
      </CardBody>
    </Card>
  );
}

function VsAverages({ view }: { view: AnalysisView }) {
  const hasLeague = view.gameweeks.some((week) => week.leagueAverage !== null);

  return (
    <Card>
      <CardHeader title="Against the field" />
      <CardBody className="flex flex-col gap-5">
        <LineChart
          label="My points against the game and league averages, by gameweek"
          series={[
            {
              name: "Me",
              colour: "var(--accent-400)",
              points: view.gameweeks.map((week) => ({
                label: week.gameweek,
                value: week.netPoints,
              })),
            },
            {
              name: "Game average",
              colour: "var(--text-3)",
              dashed: true,
              points: view.gameweeks.map((week) => ({
                label: week.gameweek,
                value: week.gameAverage,
              })),
            },
            ...(hasLeague
              ? [
                  {
                    name: "League average",
                    colour: "var(--warn)",
                    dashed: true,
                    points: view.gameweeks.map((week) => ({
                      label: week.gameweek,
                      value: week.leagueAverage ?? 0,
                    })),
                  },
                ]
              : []),
          ]}
        />

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
            Margin over the game average
          </h3>
          <BarChart
            label="Points above or below the game average, by gameweek"
            points={view.gameweeks.map((week) => ({
              label: week.gameweek,
              value: week.points - week.gameAverage,
            }))}
          />
        </div>

        <div>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
            Overall rank
          </h3>
          <RankTrail gameweeks={view.gameweeks} />
        </div>
      </CardBody>
    </Card>
  );
}

/** Rank is better when lower, so the series is inverted before plotting. */
function RankTrail({ gameweeks }: { gameweeks: GameweekAnalysis[] }) {
  const ranked = gameweeks.filter((week) => week.overallRank !== null);
  if (ranked.length === 0) {
    return <p className="text-[13px] text-text-3">No rank recorded yet.</p>;
  }

  return (
    <>
      <LineChart
        label="Overall rank by gameweek, better is higher"
        series={[
          {
            name: "Overall rank (better is higher)",
            colour: "var(--good)",
            points: ranked.map((week) => ({
              label: week.gameweek,
              value: -(week.overallRank ?? 0),
            })),
          },
        ]}
      />
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-text-2">
        {ranked.map((week) => (
          <li key={week.gameweek}>
            <span className="text-text-3">GW{week.gameweek}</span>{" "}
            {(week.overallRank ?? 0).toLocaleString("en-GB")}
          </li>
        ))}
      </ul>
    </>
  );
}

function Figure({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn";
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
        {label}
      </dt>
      <dd
        className={cn(
          "text-[20px] font-bold leading-none",
          tone === "good"
            ? "text-good"
            : tone === "bad"
              ? "text-bad"
              : tone === "warn"
                ? "text-warn"
                : "text-text-1",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
