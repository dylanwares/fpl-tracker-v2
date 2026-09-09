"use client";

import { useState, type ReactNode } from "react";
import { FilterPills } from "@/components/ui/pills";

/**
 * Players / Template. Both render on the server and are swapped with `hidden`,
 * so the table keeps its filters, sort and comparison selection while you look
 * at the template and come back.
 */
export function ScoutTabs({ players, template }: { players: ReactNode; template: ReactNode }) {
  const [tab, setTab] = useState<"players" | "template">("players");

  return (
    <div className="flex flex-col gap-3">
      <FilterPills
        label="Scout view"
        value={tab}
        onChange={setTab}
        options={[
          { value: "players", label: "Players" },
          { value: "template", label: "Template squad" },
        ]}
      />
      <div hidden={tab !== "players"}>{players}</div>
      <div hidden={tab !== "template"}>{template}</div>
    </div>
  );
}
