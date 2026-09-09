import { Pitch } from "@/components/team/pitch";
import { SquadList } from "@/components/team/squad-list";
import { SquadView } from "@/components/team/squad-view";
import { Card, CardBody } from "@/components/ui/card";
import { ErrorState, WarningBanner } from "@/components/ui/states";
import { buildRagScorer } from "@/lib/model/rag";
import { chipLabel, formationLabel, getSquad } from "@/lib/model/squad";

/**
 * My Team (product spec §2) — the squad, RAG-rated, on a pitch.
 *
 * The picks shown are the last gameweek FPL makes public; changes made for the
 * upcoming deadline are not readable without logging in. See `model/squad.ts`.
 */
export default async function MyTeamPage() {
  let squad;
  try {
    squad = await getSquad();
  } catch (error) {
    return (
      <ErrorState
        message="Could not load your squad"
        hint={error instanceof Error ? error.message : undefined}
      />
    );
  }

  if (squad === null) {
    return (
      <Card>
        <CardBody>
          <p className="text-[14px] text-text-2">
            No confirmed squad yet. FPL only publishes a team once its gameweek has kicked off.
          </p>
        </CardBody>
      </Card>
    );
  }

  const scorer = buildRagScorer(squad.pool);
  const chip = chipLabel(squad.activeChip);

  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <Header squad={squad} chip={chip} />

      {!squad.pool.projectionsAvailable && (
        <WarningBanner
          message="Expected points feed unavailable"
          detail="Points and prices are live. xP columns stay blank until the provider returns — there is no fallback source."
        />
      )}

      <SquadView
        pitch={<Pitch starters={squad.starters} bench={squad.bench} scorer={scorer} />}
        list={<SquadList starters={squad.starters} bench={squad.bench} scorer={scorer} />}
      />
    </div>
  );
}

function Header({
  squad,
  chip,
}: {
  squad: NonNullable<Awaited<ReturnType<typeof getSquad>>>;
  chip: string | null;
}) {
  return (
    <Card>
      <CardBody className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold text-text-1">{squad.teamName}</h2>
          <p className="mt-0.5 text-[12px] text-text-2">
            Squad as at GW{squad.gameweek} · {formationLabel(squad.starters)}
            {chip && <span className="text-accent-400"> · {chip}</span>}
          </p>
        </div>

        <div className="flex shrink-0 gap-6">
          <Stat label="Total points" value={squad.totalPoints.toLocaleString("en-GB")} />
          <Stat
            label="Overall rank"
            value={squad.overallRank === null ? "—" : squad.overallRank.toLocaleString("en-GB")}
          />
          <Stat
            label="Rated over"
            value={
              squad.pool.gameweeks.length === 0
                ? "—"
                : `GW${squad.pool.gameweeks[0]}–${squad.pool.gameweeks[squad.pool.gameweeks.length - 1]}`
            }
          />
        </div>
      </CardBody>

      {squad.planningGameweek !== null && squad.planningGameweek !== squad.gameweek && (
        <p className="border-t border-border px-4 py-2 text-[12px] text-text-3">
          Planning for GW{squad.planningGameweek}. FPL keeps the upcoming squad private until the
          deadline passes, so any transfers you have already made are not shown here — the ratings
          are the case for making them.
        </p>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
        {label}
      </span>
      <span className="text-[16px] font-semibold text-text-1">{value}</span>
    </div>
  );
}
