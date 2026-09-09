"use client";

import { X } from "lucide-react";
import type { ScoutPlayer } from "@/lib/model/scout";
import { cn, formatSigned } from "@/lib/utils";

interface Metric {
  label: string;
  read: (player: ScoutPlayer) => number | null;
  digits: number;
  /** Lower is better for this one. */
  inverted?: boolean;
  signed?: boolean;
}

const metrics: Metric[] = [
  { label: "Price £m", read: (p) => p.price, digits: 1, inverted: true },
  { label: "xP next", read: (p) => p.xpNext, digits: 1 },
  { label: "xP run", read: (p) => p.xpHorizon, digits: 1 },
  { label: "Fixture swing", read: (p) => p.fixtureSwing, digits: 1, signed: true },
  { label: "Points", read: (p) => p.totalPoints, digits: 0 },
  { label: "Points per £m", read: (p) => p.pointsPerMillion, digits: 1 },
  { label: "Points per 90", read: (p) => p.pointsPer90, digits: 1 },
  { label: "Form", read: (p) => p.form, digits: 1 },
  { label: "Minutes", read: (p) => p.minutes, digits: 0 },
  { label: "xG per 90", read: (p) => p.xgPer90, digits: 2 },
  { label: "xA per 90", read: (p) => p.xaPer90, digits: 2 },
  { label: "Owned %", read: (p) => p.selectedBy, digits: 1 },
];

/**
 * Side-by-side comparison of two to four players (§5.1).
 *
 * The best value in each row is highlighted rather than left to be eyeballed —
 * the whole point of putting them side by side is to see who wins each line
 * without doing arithmetic.
 */
export function ComparePanel({
  players,
  horizon,
  onRemove,
  onClear,
}: {
  players: ScoutPlayer[];
  horizon: number;
  onRemove: (id: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-border-strong bg-surface-1">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <h3 className="text-[13px] font-semibold text-text-1">
          Comparing {players.length} player{players.length === 1 ? "" : "s"}
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] font-medium text-text-2 hover:text-text-1"
        >
          Clear
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
                Metric
              </th>
              {players.map((player) => (
                <th key={player.id} className="px-2 py-2 text-right">
                  <span className="flex items-start justify-end gap-1">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-text-1">
                        {player.name}
                      </span>
                      <span className="block text-[11px] font-normal text-text-3">
                        {player.teamShort} · {player.position}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(player.id)}
                      aria-label={`Remove ${player.name}`}
                      className="shrink-0 text-text-3 hover:text-text-1"
                    >
                      <X size={13} aria-hidden />
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const values = players.map(metric.read);
              const present = values.filter((value): value is number => value !== null);
              const best =
                present.length === 0
                  ? null
                  : metric.inverted
                    ? Math.min(...present)
                    : Math.max(...present);

              return (
                <tr key={metric.label} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-1.5 text-text-2">
                    {metric.label === "xP run" ? `xP next ${horizon}` : metric.label}
                  </td>
                  {values.map((value, index) => (
                    <td
                      key={players[index].id}
                      className={cn(
                        "px-2 py-1.5 text-right tabular-nums",
                        value !== null && value === best && present.length > 1
                          ? "font-semibold text-good"
                          : "text-text-1",
                      )}
                    >
                      {value === null
                        ? "–"
                        : metric.signed
                          ? formatSigned(value, metric.digits)
                          : value.toFixed(metric.digits)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="border-t border-border px-3 py-2 text-[11px] text-text-3">
        Best value in each row in green. Price is inverted — cheaper wins. Tap a name in the table
        below for full fixtures and underlying numbers.
      </p>
    </div>
  );
}
