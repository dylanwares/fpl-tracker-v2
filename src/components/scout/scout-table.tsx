"use client";

import { useMemo, useState } from "react";
import { PlayerTrigger } from "@/components/player/player-trigger";
import { FilterPills } from "@/components/ui/pills";
import type { ScoutPlayer } from "@/lib/model/scout";
import type { Position } from "@/lib/model/xp";
import { cn, formatSigned } from "@/lib/utils";
import { ComparePanel } from "./compare-panel";

type SortKey =
  | "xpHorizon"
  | "xpNext"
  | "fixtureSwing"
  | "pointsPerMillion"
  | "pointsPer90"
  | "totalPoints"
  | "form"
  | "selectedBy";

const columns: { key: SortKey; label: string; digits: number }[] = [
  { key: "xpNext", label: "xP next", digits: 1 },
  { key: "xpHorizon", label: "xP run", digits: 1 },
  { key: "fixtureSwing", label: "Swing", digits: 1 },
  { key: "pointsPerMillion", label: "Pts/£m", digits: 1 },
  { key: "pointsPer90", label: "Pts/90", digits: 1 },
  { key: "totalPoints", label: "Pts", digits: 0 },
  { key: "form", label: "Form", digits: 1 },
  { key: "selectedBy", label: "Own%", digits: 0 },
];

const positions: (Position | "ALL")[] = ["ALL", "GKP", "DEF", "MID", "FWD"];
const PAGE = 25;
const MAX_COMPARE = 4;

/**
 * The full pool (design spec §6.5). Every player is already in the page, so
 * filtering and sorting are synchronous — no request, no skeleton, no jump.
 * Only the first `PAGE` rows are mounted at a time. 654 rows of nine columns is
 * a lot of DOM to hand a phone, and the interesting players are at the top of
 * whichever column you just sorted by — if they aren't, that's a filter to
 * change rather than a scroll to make.
 */
export function ScoutTable({
  players,
  leagueSize,
  horizon,
}: {
  players: ScoutPlayer[];
  leagueSize: number;
  horizon: number;
}) {
  const [position, setPosition] = useState<Position | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("xpHorizon");
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(16);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [playedOnly, setPlayedOnly] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [compare, setCompare] = useState<number[]>([]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return players
      .filter((player) => {
        if (position !== "ALL" && player.position !== position) return false;
        if (player.price > maxPrice) return false;
        if (availableOnly && player.availability === "out") return false;
        if (playedOnly && player.minutes === 0) return false;
        if (term && !player.name.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => {
        const left = a[sort];
        const right = b[sort];
        // Unprojected and unplayed sort last whichever way the column points.
        if (left === null && right === null) return 0;
        if (left === null) return 1;
        if (right === null) return -1;
        return right - left;
      });
  }, [players, position, sort, search, maxPrice, availableOnly, playedOnly]);

  const selected = useMemo(
    () => compare.map((id) => players.find((player) => player.id === id)).filter(Boolean) as ScoutPlayer[],
    [compare, players],
  );

  function toggleCompare(id: number) {
    setCompare((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= MAX_COMPARE
          ? current
          : [...current, id],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setLimit(PAGE);
          }}
          placeholder="Search players"
          aria-label="Search players"
          className="h-10 w-full rounded-[6px] border border-border bg-surface-1 px-3 text-[15px] text-text-1 placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-400"
        />

        <FilterPills
          label="Position"
          value={position}
          onChange={(value) => {
            setPosition(value);
            setLimit(PAGE);
          }}
          options={positions.map((value) => ({ value, label: value === "ALL" ? "All" : value }))}
        />

        <FilterPills
          label="Sort by"
          value={sort}
          onChange={setSort}
          options={columns.map((column) => ({ value: column.key, label: column.label }))}
        />

        <div className="flex flex-wrap items-center gap-3 text-[12px] text-text-2">
          <label className="flex items-center gap-2">
            <span className="shrink-0">Max £{maxPrice.toFixed(1)}m</span>
            <input
              type="range"
              min={3.8}
              max={15}
              step={0.1}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="h-1 w-28 accent-[var(--accent-400)]"
              aria-label="Maximum price"
            />
          </label>
          <Toggle checked={availableOnly} onChange={setAvailableOnly} label="Hide unavailable" />
          <Toggle checked={playedOnly} onChange={setPlayedOnly} label="Played this season" />
        </div>
      </div>

      {selected.length > 0 && (
        <ComparePanel
          players={selected}
          horizon={horizon}
          onRemove={toggleCompare}
          onClear={() => setCompare([])}
        />
      )}

      <p className="text-[12px] text-text-3">
        {filtered.length} player{filtered.length === 1 ? "" : "s"}
        {compare.length > 0 && ` · ${compare.length}/${MAX_COMPARE} selected to compare`}
      </p>

      <div className="overflow-hidden rounded-[8px] border border-border bg-surface-1">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.06em] text-text-2">
                <th className="sticky left-0 z-10 bg-surface-1 px-2 py-2 text-left font-semibold">
                  Player
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-2 py-2 text-right font-semibold",
                      sort === column.key && "text-accent-400",
                    )}
                  >
                    <button type="button" onClick={() => setSort(column.key)}>
                      {column.label}
                      {sort === column.key && <span aria-hidden> ▾</span>}
                    </button>
                  </th>
                ))}
                {leagueSize > 0 && <th className="px-2 py-2 text-right font-semibold">Lg</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((player) => (
                <Row
                  key={player.id}
                  player={player}
                  sort={sort}
                  leagueSize={leagueSize}
                  selected={compare.includes(player.id)}
                  onToggle={() => toggleCompare(player.id)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > limit && (
          <button
            type="button"
            onClick={() => setLimit((value) => value + PAGE)}
            className="w-full border-t border-border px-4 py-3 text-[13px] font-medium text-accent-400 active:bg-surface-2"
          >
            Show {Math.min(PAGE, filtered.length - limit)} more
          </button>
        )}
      </div>
    </div>
  );
}

function Row({
  player,
  sort,
  leagueSize,
  selected,
  onToggle,
}: {
  player: ScoutPlayer;
  sort: SortKey;
  leagueSize: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className={cn("border-b border-border last:border-b-0", selected && "bg-accent-glow")}>
      <th
        scope="row"
        className={cn(
          "sticky left-0 z-10 px-2 py-1.5 text-left font-normal",
          selected ? "bg-[var(--surface-2)]" : "bg-surface-1",
        )}
      >
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Compare ${player.name}`}
            className="size-3.5 shrink-0 accent-[var(--accent-600)]"
          />
          <PlayerTrigger elementId={player.id} name={player.name} className="min-w-0">
            <span className="block truncate font-medium text-text-1">
              {player.name}
              {player.availability !== "available" && (
                <span
                  className={cn(
                    "ml-1 text-[10px] font-bold",
                    player.availability === "out" ? "text-bad" : "text-warn",
                  )}
                >
                  {player.availability === "out" ? "OUT" : "?"}
                </span>
              )}
            </span>
            <span className="block truncate text-[11px] text-text-3">
              {player.teamShort} · {player.position} · £{player.price.toFixed(1)}m
            </span>
          </PlayerTrigger>
        </span>
      </th>

      {columns.map((column) => {
        const value = player[column.key];
        return (
          <td
            key={column.key}
            className={cn(
              "px-2 py-1.5 text-right tabular-nums",
              sort === column.key ? "font-semibold text-text-1" : "text-text-2",
            )}
          >
            {value === null
              ? "–"
              : column.key === "fixtureSwing"
                ? formatSigned(value, 1)
                : value.toFixed(column.digits)}
          </td>
        );
      })}

      {leagueSize > 0 && (
        <td
          className={cn(
            "px-2 py-1.5 text-right tabular-nums",
            player.ownedByMe ? "font-semibold text-accent-400" : "text-text-2",
          )}
        >
          {player.leagueOwned}/{leagueSize}
        </td>
      )}
    </tr>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-[var(--accent-600)]"
      />
      {label}
    </label>
  );
}
