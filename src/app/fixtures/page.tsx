import { FormTable } from "@/components/fixtures/form-table";
import { Ticker } from "@/components/fixtures/ticker";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import { getTickerData } from "@/lib/model/detail";

/**
 * Fixtures (product spec §6): the ticker, five-game form split by attack and
 * defence, and the two combined.
 */
export default async function FixturesPage() {
  let data;
  try {
    data = await getTickerData();
  } catch (error) {
    return (
      <ErrorState
        message="Could not load fixtures"
        hint={error instanceof Error ? error.message : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Ticker
        rows={data.rows}
        gameweeks={data.gameweeks}
        difficultySource={data.difficultySource}
      />

      <Card>
        <CardHeader title="Form" />
        <CardBody>
          <FormTable rows={data.rows} />
        </CardBody>
      </Card>
    </div>
  );
}
