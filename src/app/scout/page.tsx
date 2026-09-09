import { ScoutTable } from "@/components/scout/scout-table";
import { ScoutTabs } from "@/components/scout/scout-tabs";
import { TemplateSquad } from "@/components/scout/template";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState, WarningBanner } from "@/components/ui/states";
import { getScoutData } from "@/lib/model/scout-data";

/** Scout (product spec §5) — the whole pool, comparable. */
export default async function ScoutPage() {
  let data;
  try {
    data = await getScoutData();
  } catch (error) {
    return (
      <ErrorState
        message="Could not load the player pool"
        hint={error instanceof Error ? error.message : undefined}
      />
    );
  }

  const unprojected = data.players.filter((player) => !player.isProjected).length;

  return (
    <div className="flex flex-col gap-4">
      {unprojected === data.players.length && (
        <WarningBanner
          message="Expected points feed unavailable"
          detail="Points, prices and fixtures still work. Every xP column is blank until the provider returns."
        />
      )}

      <ScoutTabs
        players={
          <ScoutTable
            players={data.players}
            leagueSize={data.leagueSize}
            horizon={data.horizon}
          />
        }
        template={
          <Card>
            <CardHeader title="Template squad" />
            <CardBody>
              <TemplateSquad
                players={data.players}
                mySquad={data.mySquad}
                leagueSize={data.leagueSize}
              />
            </CardBody>
          </Card>
        }
      />
    </div>
  );
}
