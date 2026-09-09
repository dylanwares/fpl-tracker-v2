"use client";

import { useMemo, useState } from "react";
import { PlayerTrigger } from "@/components/player/player-trigger";
import { FilterPills } from "@/components/ui/pills";
import {
  diffTemplate,
  templateSquad,
  type ScoutPlayer,
  type TemplateSource,
} from "@/lib/model/scout";
import { cn } from "@/lib/utils";

/**
 * The template squad (§5.2) — a risk measure, not a shopping list. Missing a
 * heavily-owned player is your downside if he hauls; holding one nobody else
 * has is where your season diverges from everyone else's.
 */
export function TemplateSquad({
  players,
  mySquad,
  leagueSize,
}: {
  players: ScoutPlayer[];
  mySquad: number[];
  leagueSize: number;
}) {
  const [source, setSource] = useState<TemplateSource>(leagueSize > 0 ? "league" : "global");

  const diff = useMemo(
    () => diffTemplate(templateSquad(players, source), mySquad, players),
    [players, mySquad, source],
  );

  const owned = (player: ScoutPlayer) =>
    source === "global"
      ? `${player.selectedBy.toFixed(0)}% owned`
      : `${player.leagueOwned}/${leagueSize} in league`;

  return (
    <div className="flex flex-col gap-3">
      <FilterPills
        label="Template source"
        value={source}
        onChange={setSource}
        options={[
          { value: "league", label: `My league${leagueSize > 0 ? ` (${leagueSize})` : ""}` },
          { value: "global", label: "Global" },
        ]}
      />

      {mySquad.length === 0 ? (
        <p className="text-[13px] text-text-3">
          No confirmed squad of yours to diff against yet.
        </p>
      ) : (
        <p className="text-[13px] text-text-2">
          You hold{" "}
          <span className="font-semibold text-text-1">
            {Math.round(diff.overlap * 100)}%
          </span>{" "}
          of the {source === "global" ? "global" : "league"} template.
          {diff.overlap > 0.75
            ? " Close to the field — you will move with it, not past it."
            : diff.overlap < 0.4
              ? " A long way off it — high variance in both directions."
              : ""}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Group
          title="Template players I don't have"
          hint="Downside exposure if they haul"
          players={diff.missing}
          tone="bad"
          describe={owned}
          empty="You hold the entire template."
        />
        <Group
          title="Mine, off template"
          hint="Where my season differs"
          players={diff.offTemplate}
          tone="good"
          describe={owned}
          empty="Your squad is the template."
        />
      </div>
    </div>
  );
}

function Group({
  title,
  hint,
  players,
  tone,
  describe,
  empty,
}: {
  title: string;
  hint: string;
  players: ScoutPlayer[];
  tone: "good" | "bad";
  describe: (player: ScoutPlayer) => string;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-[8px] border border-border bg-surface-1">
      <header className="border-b border-border px-3 py-2">
        <h3 className="text-[13px] font-semibold text-text-1">{title}</h3>
        <p className="text-[11px] text-text-3">{hint}</p>
      </header>
      {players.length === 0 ? (
        <p className="px-3 py-5 text-center text-[13px] text-text-3">{empty}</p>
      ) : (
        <ul>
          {players.map((player) => (
            <li key={player.id} className="border-b border-border last:border-b-0">
              <PlayerTrigger
                elementId={player.id}
                name={player.name}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 active:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-text-1">
                    {player.name}
                  </span>
                  <span className="block truncate text-[11px] text-text-3">
                    {player.teamShort} · {player.position} · £{player.price.toFixed(1)}m ·{" "}
                    {describe(player)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={cn(
                      "block text-[15px] font-semibold",
                      // Written out rather than interpolated — Tailwind only
                      // generates classes it can find as literal strings.
                      tone === "good" ? "text-good" : "text-bad",
                    )}
                  >
                    {player.xpHorizon === null ? "–" : player.xpHorizon.toFixed(1)}
                  </span>
                  <span className="block text-[11px] text-text-3">xP</span>
                </span>
              </PlayerTrigger>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
