"use client";

import { useState, type ReactNode } from "react";
import { FilterPills } from "@/components/ui/pills";

/**
 * Threats, differentials and swing are three readings of the same table, so
 * they are tabs rather than three stacked lists. All three render on the
 * server; switching is free.
 */
export function InsightTabs({
  swing,
  threats,
  differentials,
  candidates,
}: {
  swing: ReactNode;
  threats: ReactNode;
  differentials: ReactNode;
  candidates: ReactNode;
}) {
  const [tab, setTab] = useState<"swing" | "threats" | "differentials" | "candidates">("swing");

  return (
    <div className="flex flex-col gap-3">
      <FilterPills
        label="Insight"
        value={tab}
        onChange={setTab}
        options={[
          { value: "swing", label: "Swing" },
          { value: "threats", label: "Threats" },
          { value: "differentials", label: "My differentials" },
          { value: "candidates", label: "Nobody owns" },
        ]}
      />
      <div hidden={tab !== "swing"}>{swing}</div>
      <div hidden={tab !== "threats"}>{threats}</div>
      <div hidden={tab !== "differentials"}>{differentials}</div>
      <div hidden={tab !== "candidates"}>{candidates}</div>
    </div>
  );
}
