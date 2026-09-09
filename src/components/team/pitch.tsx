import { PlayerTrigger } from "@/components/player/player-trigger";
import type { RagScorer } from "@/lib/model/rag";
import { formationRows, type SquadPick } from "@/lib/model/squad";
import { PlayerChip } from "./player-chip";

export type PitchMetric = "xpNext" | "xpHorizon" | "points";

const metricLabels: Record<PitchMetric, string> = {
  xpNext: "xP next gameweek",
  xpHorizon: "xP over the horizon",
  points: "Season points",
};

/**
 * The pitch view (design spec §6.9). Four rows in formation order, bench in a
 * strip beneath — the arrangement the FPL app uses, so the squad is readable
 * without being learned.
 *
 * The pitch is CSS, not an image: it scales to any width and recolours with the
 * tokens.
 */
export function Pitch({
  starters,
  bench,
  scorer,
  metric = "xpNext",
}: {
  starters: SquadPick[];
  bench: SquadPick[];
  scorer: RagScorer;
  metric?: PitchMetric;
}) {
  const rows = formationRows(starters);

  return (
    <div className="overflow-hidden rounded-[10px] border border-border">
      <div className="pitch flex flex-col justify-between gap-3 px-2 py-4 sm:gap-5 sm:px-4 sm:py-6">
        {rows.map((row, index) => (
          <div key={index} className="flex items-start justify-evenly gap-1">
            {row.map((pick) => (
              <PlayerTrigger
                key={pick.entry.player.id}
                elementId={pick.entry.player.id}
                name={pick.entry.player.name}
              >
                <PlayerChip pick={pick} rating={scorer.rate(pick.entry)} metric={metric} />
              </PlayerTrigger>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-border bg-surface-1 px-2 py-3 sm:px-4">
        <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-text-3">
          Bench
        </p>
        <div className="flex items-start justify-evenly gap-1">
          {bench.map((pick) => (
            <PlayerTrigger
              key={pick.entry.player.id}
              elementId={pick.entry.player.id}
              name={pick.entry.player.name}
            >
              <PlayerChip pick={pick} rating={scorer.rate(pick.entry)} metric={metric} />
            </PlayerTrigger>
          ))}
        </div>
      </div>

      <p className="border-t border-border bg-surface-1 px-4 py-2 text-center text-[11px] text-text-3">
        Number shown: {metricLabels[metric]}. The bar beside each name is the overall RAG. Tap a
        player for fixtures and the numbers behind them.
      </p>
    </div>
  );
}
