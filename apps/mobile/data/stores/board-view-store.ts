/**
 * Which view the Board shows: the dense list or the kanban. A display
 * preference, so it lives in a client store and is persisted the same way as
 * the background-texture and theme preferences.
 *
 * `view` stays null until the user picks, so the default can follow the
 * window: kanban where more than one column fits, list on a phone-width
 * screen. Fold and unfold therefore switch the default, but never override an
 * explicit choice.
 */
import { useEffect } from "react";
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { useResponsiveLayout } from "@/lib/responsive";

const STORAGE_KEY = "board-view";

export type BoardView = "list" | "kanban";

interface BoardViewState {
  view: BoardView | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setView: (view: BoardView) => void;
}

export const useBoardViewStore = create<BoardViewState>((set, get) => ({
  view: null,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    set({ hydrated: true });
    const saved = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
    // A pick made while the read was in flight wins over the saved value.
    if ((saved === "list" || saved === "kanban") && get().view === null) {
      set({ view: saved });
    }
  },
  setView: (view) => {
    set({ view });
    void SecureStore.setItemAsync(STORAGE_KEY, view).catch(() => {});
  },
}));

/** The view to show now, and the setter that records an explicit choice. */
export function useBoardView(): [BoardView, (view: BoardView) => void] {
  const saved = useBoardViewStore((s) => s.view);
  const setView = useBoardViewStore((s) => s.setView);
  const { isCompact } = useResponsiveLayout();
  useEffect(() => {
    void useBoardViewStore.getState().hydrate();
  }, []);
  return [saved ?? (isCompact ? "list" : "kanban"), setView];
}
