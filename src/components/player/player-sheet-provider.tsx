"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { loadPlayerDetail } from "@/app/actions";
import type { PlayerDetail } from "@/lib/model/detail";
import { PlayerSheet } from "./player-sheet";

interface SheetContext {
  open: (elementId: number) => void;
}

const context = createContext<SheetContext | null>(null);

export function usePlayerSheet(): SheetContext {
  const value = useContext(context);
  if (value === null) {
    throw new Error("usePlayerSheet must be used inside <PlayerSheetProvider>");
  }
  return value;
}

/**
 * One sheet for the whole app, mounted in the shell.
 *
 * Any row, chip or table cell anywhere can open it with an element id — no page
 * has to hold sheet state, pass callbacks down, or serialise player payloads it
 * doesn't otherwise need.
 */
export function PlayerSheetProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<PlayerDetail | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [isLoading, startLoading] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback((elementId: number) => {
    setOpenId(elementId);
    setDetail(null);
    startLoading(async () => {
      setDetail(await loadPlayerDetail(elementId));
    });
  }, []);

  const close = useCallback(() => {
    setOpenId(null);
    setDetail(null);
  }, []);

  // Driving the native dialog, not deriving state — `showModal` is what gives
  // us focus trapping, Escape, and inert background content for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (openId !== null && !dialog.open) dialog.showModal();
    if (openId === null && dialog.open) dialog.close();
  }, [openId]);

  return (
    <context.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        className="sheet w-full sm:w-[min(32rem,calc(100vw-2rem))]"
        onClose={close}
        onClick={(event) => {
          // Clicking the backdrop closes; clicking the panel does not.
          if (event.target === dialogRef.current) close();
        }}
      >
        <PlayerSheet detail={detail} isLoading={isLoading || detail === null} onClose={close} />
      </dialog>
    </context.Provider>
  );
}
