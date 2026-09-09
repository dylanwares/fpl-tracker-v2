import { PlayerTrigger } from "@/components/player/player-trigger";
import type { Exposure } from "@/lib/model/league";
import type { PooledPlayer } from "@/lib/model/pool";
import { cn, formatSigned } from "@/lib/utils";

function formatValue(value: number | null, digits = 1): string {
  return value === null ? "–" : value.toFixed(digits);
}

/**
 * One table for threats, differentials and swing — the columns are the same
 * question asked three ways, so the reader learns it once.
 */
export function ExposureTable({
  rows,
  metric,
  emptyMessage,
  size,
}: {
  rows: Exposure[];
  metric: "swing" | "threat" | "differential";
  emptyMessage: string;
  size: number;
}) {
  if (rows.length === 0) {
    return <p className="px-1 py-6 text-center text-[13px] text-text-3">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-border bg-surface-1">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-2">
              <th className="px-3 py-2 text-left font-semibold">Player</th>
              <th className="px-2 py-2 text-right font-semibold">EO</th>
              <th className="px-2 py-2 text-right font-semibold">Global</th>
              <th className="px-2 py-2 text-right font-semibold">xP</th>
              <th className="px-2 py-2 text-right font-semibold">
                {metric === "swing" ? "Swing" : metric === "threat" ? "Threat" : "Edge"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const swing = row.swingHorizon;
              return (
                <tr key={row.entry.player.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-1.5">
                    <PlayerTrigger
                      elementId={row.entry.player.id}
                      name={row.entry.player.name}
                      className="block"
                    >
                      <span className="block font-medium text-text-1">
                        {row.entry.player.name}
                        {row.myExposure === 2 && (
                          <span className="ml-1 rounded-[3px] bg-surface-3 px-1 text-[10px] font-bold text-text-2">
                            C
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] text-text-3">
                        {row.entry.team?.shortName ?? "—"} · {row.entry.player.position} · £
                        {row.entry.player.price.toFixed(1)}m ·{" "}
                        {row.starters}/{size} start
                        {row.captains > 0 && `, ${row.captains} captain`}
                      </span>
                    </PlayerTrigger>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-1">
                    {(row.effectiveOwnership * 100).toFixed(0)}%
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-3">
                    {row.entry.player.selectedBy.toFixed(0)}%
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-2">
                    {formatValue(row.entry.xpHorizon)}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right font-semibold tabular-nums",
                      metric === "swing"
                        ? swing === null
                          ? "text-text-3"
                          : swing >= 0
                            ? "text-good"
                            : "text-bad"
                        : "text-text-1",
                    )}
                  >
                    {metric === "swing"
                      ? swing === null
                        ? "–"
                        : formatSigned(swing, 1)
                      : metric === "threat"
                        ? formatValue((row.entry.xpHorizon ?? 0) * row.effectiveOwnership)
                        : formatValue(
                            (row.entry.xpHorizon ?? 0) * (1 - row.effectiveOwnership),
                          )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** High-xP players nobody in the league starts — transfer candidates. */
export function CandidateTable({ players }: { players: PooledPlayer[] }) {
  if (players.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-[13px] text-text-3">
        Everyone with a projection is already started by someone.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-border bg-surface-1">
      <ul>
        {players.map((entry) => (
          <li key={entry.player.id} className="border-b border-border last:border-b-0">
            <PlayerTrigger
              elementId={entry.player.id}
              name={entry.player.name}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 active:bg-surface-2"
            >
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-text-1">
                  {entry.player.name}
                </span>
                <span className="block text-[11px] text-text-3">
                  {entry.team?.shortName ?? "—"} · {entry.player.position} · £
                  {entry.player.price.toFixed(1)}m · {entry.player.selectedBy.toFixed(0)}% global
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-semibold text-good">
                  {formatValue(entry.xpHorizon)}
                </span>
                <span className="block text-[11px] text-text-3">xP</span>
              </span>
            </PlayerTrigger>
          </li>
        ))}
      </ul>
    </div>
  );
}
