import Image from "next/image";
import { shirtUrl } from "@/lib/model/assets";
import type { PlayerRating } from "@/lib/model/rag";
import type { SquadPick } from "@/lib/model/squad";
import { cn } from "@/lib/utils";

/**
 * One player on the pitch: shirt, name plate, number. Modelled on the FPL app's
 * pitch view, with two additions it doesn't have — the RAG bar down the left of
 * the name plate, and an availability dot.
 */
export function PlayerChip({
  pick,
  rating,
  metric,
}: {
  pick: SquadPick;
  rating: PlayerRating;
  metric: "xpNext" | "xpHorizon" | "points";
}) {
  const { player, team } = pick.entry;
  const isKeeper = player.position === "GKP";

  const value =
    metric === "points"
      ? player.totalPoints.toFixed(0)
      : metric === "xpNext"
        ? formatXp(pick.entry.xpNext)
        : formatXp(pick.entry.xpHorizon);

  return (
    <div className="flex w-[68px] flex-col items-center gap-1 sm:w-[84px]">
      <div className="relative">
        {team ? (
          <Image
            src={shirtUrl(team.code, isKeeper)}
            alt=""
            width={110}
            height={140}
            unoptimized
            className="h-11 w-auto sm:h-14"
          />
        ) : (
          <div className="h-11 w-9 rounded-[4px] bg-surface-3 sm:h-14 sm:w-11" />
        )}

        {(pick.isCaptain || pick.isViceCaptain) && (
          <span
            className={cn(
              "absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full border text-[10px] font-bold",
              pick.isCaptain
                ? "border-white/20 bg-white text-black"
                : "border-white/20 bg-surface-3 text-text-1",
            )}
          >
            {pick.multiplier === 3 ? "T" : pick.isCaptain ? "C" : "V"}
            <span className="sr-only">
              {pick.multiplier === 3
                ? "Triple captain"
                : pick.isCaptain
                  ? "Captain"
                  : "Vice captain"}
            </span>
          </span>
        )}

        {player.availability !== "available" && (
          <span
            title={player.news || "Doubtful"}
            className={cn(
              "absolute -left-1 -top-1 size-[10px] rounded-full border border-black/40",
              player.availability === "out" ? "bg-bad" : "bg-warn",
            )}
          >
            <span className="sr-only">
              {player.availability === "out" ? "Unavailable" : "Doubtful"}
            </span>
          </span>
        )}
      </div>

      <div className="w-full overflow-hidden rounded-[4px] border border-white/10 bg-surface-1/95">
        <div className="flex items-stretch">
          <span
            aria-hidden
            className={cn("w-[3px] shrink-0", {
              "bg-good": rating.overall === "green",
              "bg-warn": rating.overall === "amber",
              "bg-bad": rating.overall === "red",
              "bg-neutral": rating.overall === "none",
            })}
          />
          <span className="min-w-0 flex-1 truncate px-1 py-[3px] text-center text-[11px] font-medium leading-tight text-text-1">
            {player.name}
          </span>
        </div>
        <div className="border-t border-white/10 bg-surface-2/90 px-1 py-[2px] text-center text-[11px] font-semibold leading-tight text-text-1">
          {value}
        </div>
      </div>
    </div>
  );
}

/** Unprojected players show an en-dash, never a zero (product spec §7.2). */
export function formatXp(value: number | null): string {
  return value === null ? "–" : value.toFixed(1);
}
