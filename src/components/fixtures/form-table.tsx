"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { FilterPills } from "@/components/ui/pills";
import { badgeUrl } from "@/lib/model/assets";
import type { TickerRow } from "@/lib/model/ticker";
import { cn } from "@/lib/utils";

type FormSort = "attack" | "defence" | "points";

const options: { value: FormSort; label: string }[] = [
  { value: "points", label: "Points" },
  { value: "attack", label: "Attack" },
  { value: "defence", label: "Defence" },
];

/**
 * Five-game form, attack and defence separated (product spec §6.2) — a team can
 * be excellent to own attackers from and a liability to own defenders from, and
 * a single "form" number hides exactly that.
 */
export function FormTable({ rows }: { rows: TickerRow[] }) {
  const [sort, setSort] = useState<FormSort>("points");

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === "attack") return copy.sort((a, b) => b.form.goalsFor - a.form.goalsFor);
    if (sort === "defence") return copy.sort((a, b) => a.form.goalsAgainst - b.form.goalsAgainst);
    return copy.sort((a, b) => b.form.points - a.form.points);
  }, [rows, sort]);

  const window = Math.max(...rows.map((row) => row.form.played), 0);

  return (
    <div className="flex flex-col gap-3">
      <FilterPills label="Sort form by" value={sort} onChange={setSort} options={options} />

      <div className="overflow-hidden rounded-[8px] border border-border bg-surface-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-2">
                <th className="px-3 py-2 text-left font-semibold">Team</th>
                <th className="px-2 py-2 text-right font-semibold">P</th>
                <th className="px-2 py-2 text-right font-semibold">W-D-L</th>
                <th className="px-2 py-2 text-right font-semibold">GF</th>
                <th className="px-2 py-2 text-right font-semibold">GA</th>
                <th className="px-2 py-2 text-right font-semibold">CS</th>
                <th className="px-2 py-2 text-right font-semibold">Pts</th>
                <th className="px-2 py-2 text-right font-semibold">xG</th>
                <th className="px-2 py-2 text-right font-semibold">xGC</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.team.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-2">
                      <Image
                        src={badgeUrl(row.team.code)}
                        alt=""
                        width={70}
                        height={70}
                        unoptimized
                        className="size-6 shrink-0"
                      />
                      <span className="font-medium text-text-1">{row.team.shortName}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-2">
                    {row.form.played}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-2">
                    {row.form.wins}-{row.form.draws}-{row.form.losses}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right font-medium tabular-nums",
                      sort === "attack" ? "text-good" : "text-text-1",
                    )}
                  >
                    {row.form.goalsFor}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-1.5 text-right font-medium tabular-nums",
                      sort === "defence" ? "text-good" : "text-text-1",
                    )}
                  >
                    {row.form.goalsAgainst}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-2">
                    {row.form.cleanSheets}
                  </td>
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-text-1">
                    {row.form.points}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-2">
                    {row.form.expectedGoals.toFixed(1)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-2">
                    {row.form.expectedGoalsConceded.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-text-3">
        Results cover the last {window} {window === 1 ? "match" : "matches"}. xG and xGC are{" "}
        <span className="text-text-2">season to date</span>, not the form window — the FPL API
        publishes no per-match expected goals, so they are derived from the player table (team xG
        is the sum of its players&apos; individual xG; xGC is the first-choice keeper&apos;s).
      </p>
    </div>
  );
}
