import type { ReactNode } from "react";
import { planningGameweek, resolveGameweekState } from "@/lib/fpl";
import { getGameData } from "@/lib/model/game";
import { PlayerSheetProvider } from "@/components/player/player-sheet-provider";
import { AppBar } from "./app-bar";
import { BottomNav } from "./bottom-nav";
import { ScrollMemory } from "./scroll-memory";
import { Sidebar } from "./sidebar";

/**
 * The chrome every page sits inside. Reads only the gameweek header data, and
 * from the cached model rather than the API — an uncached fetch in the root
 * layout would block every route from prerendering, which is the opposite of
 * the instant navigation design spec §8.3 asks for.
 *
 * A failure here degrades to a bar without a gameweek rather than a blank app.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  let gameweek: number | null = null;
  let deadline: string | null = null;

  try {
    const game = await getGameData();
    const state = resolveGameweekState(game.events);
    gameweek = planningGameweek(state);
    deadline = state.next?.deadline_time ?? null;
  } catch {
    // The app bar handles nulls; individual pages report their own errors.
  }

  return (
    <PlayerSheetProvider>
      <div className="min-h-dvh bg-bg">
      <ScrollMemory />
      <Sidebar />
      <div className="lg:pl-60">
        <AppBar gameweek={gameweek} deadline={deadline} />
        <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-4 lg:px-8 lg:pb-12 lg:pt-6">
          {children}
        </main>
      </div>
      <BottomNav />
      </div>
    </PlayerSheetProvider>
  );
}
