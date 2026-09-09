"use client";

import { useState, type ReactNode } from "react";
import { FilterPills } from "@/components/ui/pills";

/**
 * Pitch / list toggle. Both views are rendered on the server and swapped with
 * `hidden`, so switching costs nothing — no refetch, no layout jump, and the
 * open rows in the list survive a trip to the pitch and back.
 */
export function SquadView({ pitch, list }: { pitch: ReactNode; list: ReactNode }) {
  const [view, setView] = useState<"pitch" | "list">("pitch");

  return (
    <div className="flex flex-col gap-3">
      <FilterPills
        label="Squad view"
        value={view}
        onChange={setView}
        options={[
          { value: "pitch", label: "Pitch" },
          { value: "list", label: "List" },
        ]}
      />
      <div hidden={view !== "pitch"}>{pitch}</div>
      <div hidden={view !== "list"}>{list}</div>
    </div>
  );
}
