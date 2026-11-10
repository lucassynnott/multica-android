/**
 * The list side of a list + detail split: tells a list surface whether its
 * window is split, which issue is open beside it, and how to open one.
 *
 * `select` returns false when the window is not split (a phone-width window,
 * or `enabled` is off, e.g. the board's kanban view). The caller then pushes
 * the full-screen issue route exactly as before, so compact behaviour is
 * untouched. Folding with an issue open navigates nowhere: the pane is just
 * hidden and the slot is kept for the next unfold.
 */
import { useCallback } from "react";
import {
  useIssuePaneStore,
  type IssuePaneSelection,
  type IssuePaneSurface,
} from "@/data/stores/issue-pane-store";
import { useResponsiveLayout } from "@/lib/responsive";

export function useIssuePane(surface: IssuePaneSurface, enabled = true) {
  const layout = useResponsiveLayout();
  const split = enabled && layout.isSplitPane;
  const selection = useIssuePaneStore((s) => s.selections[surface]);

  const select = useCallback(
    (next: IssuePaneSelection) => {
      if (!split) return false;
      useIssuePaneStore.getState().select(surface, next);
      return true;
    },
    [split, surface],
  );

  return {
    split,
    /** The row to highlight; null while the pane is hidden. */
    selectedId: split ? (selection?.issueId ?? null) : null,
    select,
  };
}
