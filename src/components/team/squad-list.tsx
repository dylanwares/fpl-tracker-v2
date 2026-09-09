import Image from "next/image";
import { PlayerTrigger } from "@/components/player/player-trigger";
import { RagPill } from "@/components/ui/rag";
import { badgeUrl } from "@/lib/model/assets";
import type { RagScorer } from "@/lib/model/rag";
import type { SquadPick } from "@/lib/model/squad";
import { formatXp } from "./player-chip";

/**
 * The list view (design spec §6.4): one row per player with three RAG pills.
 *
 * Tapping a row opens the universal player sheet rather than expanding inline —
 * one interaction for players everywhere in the app, and the sheet has room for
 * the fixtures and underlying numbers a 64px row does not.
 */
export function SquadList({
  starters,
  bench,
  scorer,
}: {
  starters: SquadPick[];
  bench: SquadPick[];
  scorer: RagScorer;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Group title="Starting XI" picks={starters} scorer={scorer} />
      <Group title="Bench" picks={bench} scorer={scorer} />
    </div>
  );
}

function Group({
  title,
  picks,
  scorer,
}: {
  title: string;
  picks: SquadPick[];
  scorer: RagScorer;
}) {
  return (
    <section className="overflow-hidden rounded-[8px] border border-border bg-surface-1">
      <h3 className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
        {title}
      </h3>
      <ul>
        {picks.map((pick) => (
          <PlayerRow key={pick.entry.player.id} pick={pick} scorer={scorer} />
        ))}
      </ul>
    </section>
  );
}

function PlayerRow({ pick, scorer }: { pick: SquadPick; scorer: RagScorer }) {
  const { player, team } = pick.entry;
  const rating = scorer.rate(pick.entry);

  return (
    <li className="border-b border-border last:border-b-0">
      <PlayerTrigger
        elementId={player.id}
        name={player.name}
        className="flex h-16 w-full items-center gap-3 px-4 active:bg-surface-2"
      >
        {team ? (
          <Image
            src={badgeUrl(team.code)}
            alt=""
            width={70}
            height={70}
            unoptimized
            className="size-7 shrink-0"
          />
        ) : (
          <span className="size-7 shrink-0 rounded-full bg-surface-3" />
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium text-text-1">{player.name}</span>
            {pick.isCaptain && <Badge>{pick.multiplier === 3 ? "TC" : "C"}</Badge>}
            {pick.isViceCaptain && <Badge>V</Badge>}
            {player.availability !== "available" && (
              <Badge tone={player.availability === "out" ? "bad" : "warn"}>
                {player.availability === "out" ? "OUT" : "?"}
              </Badge>
            )}
            {!pick.entry.isProjected && <Badge tone="warn">NO xP</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-text-2">
            {player.position} · {team?.shortName ?? "—"} · £{player.price.toFixed(1)}m
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1">
          <RagPill rag={rating.points.rag} title="Points vs position" />
          <RagPill rag={rating.value.rag} title="Points per £m" />
          <RagPill rag={rating.expected.rag} title="Expected points" />
        </span>

        <span className="w-12 shrink-0 text-right">
          <span className="block text-[16px] font-semibold leading-tight text-text-1">
            {formatXp(pick.entry.xpNext)}
          </span>
          <span className="block text-[11px] leading-tight text-text-3">xP next</span>
        </span>
      </PlayerTrigger>
    </li>
  );
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "bad";
}) {
  const tones = {
    neutral: "bg-surface-3 text-text-2",
    warn: "bg-warn/15 text-warn",
    bad: "bg-bad/15 text-bad",
  };
  return (
    <span
      className={`shrink-0 rounded-[4px] px-1 py-px text-[10px] font-bold leading-tight ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
