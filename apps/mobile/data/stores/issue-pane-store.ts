/**
 * Which issue each list surface shows in its detail pane on a wide window
 * (see `components/ui/split-pane.tsx`). One slot per surface, so the Board,
 * My Issues and Inbox each remember their own open issue across tab switches.
 *
 * The selection is plain in-memory state, not navigation state: selecting an
 * issue never pushes a route, and folding the device only hides the pane.
 * The slot survives the fold, so unfolding shows the same issue again.
 *
 * Workspace lifecycle: an issue id belongs to one workspace. Reset is wired
 * in `app/(app)/[workspace]/_layout.tsx`, like the other cross-route stores.
 */
import { useEffect, useRef } from "react";
import { create } from "zustand";

export type IssuePaneSurface = "board" | "mine" | "inbox";

export interface IssuePaneSelection {
  issueId: string;
  /** Inbox only: the comment to scroll to and flash. */
  highlight?: string;
  /** Inbox only: per-tap nonce so tapping the same row flashes again. */
  nonce?: string;
}

interface IssuePaneState {
  selections: Record<IssuePaneSurface, IssuePaneSelection | null>;
  select: (surface: IssuePaneSurface, selection: IssuePaneSelection) => void;
  /** Drop an issue from every surface showing it (it was deleted). */
  clearIssue: (issueId: string) => void;
  reset: () => void;
}

const INITIAL: IssuePaneState["selections"] = {
  board: null,
  mine: null,
  inbox: null,
};

export const useIssuePaneStore = create<IssuePaneState>((set) => ({
  selections: INITIAL,
  select: (surface, selection) =>
    set((s) => ({ selections: { ...s.selections, [surface]: selection } })),
  clearIssue: (issueId) =>
    set((s) => {
      const next = { ...s.selections };
      let changed = false;
      for (const surface of Object.keys(next) as IssuePaneSurface[]) {
        if (next[surface]?.issueId === issueId) {
          next[surface] = null;
          changed = true;
        }
      }
      return changed ? { selections: next } : s;
    }),
  reset: () => set({ selections: INITIAL }),
}));

/**
 * Clears every pane selection when the active workspace id changes. The ref
 * gate makes the first mount a no-op (cold start resolving `null → uuid`).
 */
export function useIssuePaneResetOnWorkspaceChange(wsId: string | null) {
  const prevRef = useRef(wsId);
  useEffect(() => {
    if (prevRef.current !== wsId) {
      useIssuePaneStore.getState().reset();
      prevRef.current = wsId;
    }
  }, [wsId]);
}
