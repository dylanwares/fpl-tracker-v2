"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BlankCell, FixtureCell } from "@/components/ui/fixture-cell";
import { FilterPills } from "@/components/ui/pills";
import { badgeUrl } from "@/lib/model/assets";
import {
  HORIZONS,
  rateRows,
  sortRated,
  type RatingKey,
  type TickerRow,
} from "@/lib/model/ticker";
import { cn, formatSigned } from "@/lib/utils";

type SortKey = RatingKey | "name";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "fixtures", label: "Best fixtures" },
  { value: "attack", label: "Form + fixtures: attack" },
  { value: "defence", label: "Form + fixtures: defence" },
  { value: "name", label: "A–Z" },
];

/**
 * The ticker (design spec §6.6). All eight gameweeks are sent once; changing
 * the horizon or the sort is arithmetic on data already here, so it never
 * refetches and never blanks the grid.
 */
export function Ticker({
  rows,
  gameweeks,
  difficultySource,
}: {
  rows: TickerRow[];
  gameweeks: number[];
  difficultySource: string;
}) {
  const [horizon, setHorizon] = useState<number>(5);
  const [sort, setSort] = useState<SortKey>("fixtures");

  const rated = useMemo(() => sortRated(rateRows(rows, horizon), sort), [rows, horizon, sort]);
  const shown = gameweeks.slice(0, horizon);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <FilterPills
          label="Gameweeks ahead"
          value={horizon}
          onChange={setHorizon}
          options={HORIZONS.map((value) => ({ value, label: `Next ${value}` }))}
        />
        <FilterPills label="Sort by" value={sort} onChange={setSort} options={sortOptions} />
      </div>

      <div className="overflow-hidden rounded-[8px] border border-border bg-surface-1">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 border-b border-r border-border-strong bg-surface-1 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
                  Team
                </th>
                {shown.map((gameweek) => (
                  <th
                    key={gameweek}
                    className="border-b border-border bg-surface-1 px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2"
                  >
                    GW{gameweek}
                  </th>
                ))}
                <th className="border-b border-l border-border bg-surface-1 px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
                  {sort === "attack" ? "ATT" : sort === "defence" ? "DEF" : "Run"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rated.map((entry) => (
                <tr key={entry.row.team.id} className="border-b border-border last:border-b-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-border-strong bg-surface-1 px-3 py-1.5 text-left font-normal"
                  >
                    <span className="flex items-center gap-2">
                      <Image
                        src={badgeUrl(entry.row.team.code)}
                        alt=""
                        width={70}
                        height={70}
                        unoptimized
                        className="size-6 shrink-0"
                      />
                      <span className="text-[13px] font-medium text-text-1">
                        {entry.row.team.shortName}
                      </span>
                    </span>
                  </th>

                  {entry.row.cells.slice(0, horizon).map((cell) => (
                    <td key={cell.gameweek} className="px-1 py-1.5 text-center">
                      {cell.matches.length === 0 ? (
                        <BlankCell />
                      ) : (
                        <span className="inline-flex items-center gap-px">
                          {cell.matches.map((match) => (
                            <FixtureCell
                              key={`${match.opponent}-${match.isHome}`}
                              opponent={match.opponent}
                              home={match.isHome}
                              difficulty={match.difficulty}
                              className={cell.matches.length > 1 ? "min-w-9 px-1" : undefined}
                            />
                          ))}
                        </span>
                      )}
                    </td>
                  ))}

                  <td className="border-l border-border px-2 py-1.5 text-right">
                    <span
                      className={cn(
                        "text-[13px] font-semibold tabular-nums",
                        ratingTone(entry, sort),
                      )}
                    >
                      {sort === "attack"
                        ? formatSigned(entry.attackRating, 2)
                        : sort === "defence"
                          ? formatSigned(entry.defenceRating, 2)
                          : entry.runValue.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-text-3">
        A gameweek scores <span className="text-text-2">6 − difficulty</span> per fixture, so a
        blank is 0 and a double counts both — higher is better. Attack and defence combine recent
        form with the fixture run as z-scores across the 20 teams. Difficulty from{" "}
        {difficultySource}.
      </p>
    </div>
  );
}

function ratingTone(
  entry: { runValue: number; attackRating: number; defenceRating: number },
  sort: SortKey,
): string {
  if (sort === "attack") return entry.attackRating >= 0 ? "text-good" : "text-bad";
  if (sort === "defence") return entry.defenceRating >= 0 ? "text-good" : "text-bad";
  return "text-text-1";
}
