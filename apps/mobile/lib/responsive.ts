/**
 * Window-size classes for foldables and large screens.
 *
 * The app started as an iPhone/iPad client, so every screen assumed a
 * phone-shaped canvas. Foldables break that assumption twice per session:
 * the Galaxy Z Fold 8 is a 10:16 phone when closed and a 4:3 tablet when
 * open, and Android delivers that as a configuration change on the same
 * activity.
 *
 * Measured targets (px / (dpi / 160) = dp):
 *
 *   Galaxy Z Fold 8 cover      1248 x 1972 @428dpi  →  467 x 737 dp
 *   Galaxy Z Fold 8 main       1848 x 2448 @403dpi  →  734 x 972 dp
 *   Galaxy Z Fold 8 main land. 2448 x 1848 @403dpi  →  972 x 734 dp
 *   Galaxy Z Fold 8 Ultra main 2504 x 2256 @422dpi  →  949 x 855 dp
 *
 * So the Fold 8's unfolded canvas lands in `medium` and its landscape
 * posture lands in `expanded`. Breakpoints below are chosen against those
 * numbers rather than against Material's generic 600/840/1200:
 *
 *   compact   < 600dp    phone, folded cover screen, bottom tabs
 *   medium    600-899dp  Fold 8 unfolded: navigation rail, two or three
 *                        kanban columns side by side, list + detail panes
 *   expanded  >= 900dp   Fold 8 landscape, Fold 8 Ultra, tablets, DeX:
 *                        the same with a slightly wider list column
 *
 * The list + detail split has its own floor (`SPLIT_PANE_MIN_WIDTH`), a
 * little above `medium`, so a 600dp window does not squeeze the detail.
 */
import { useWindowDimensions } from "react-native";

export const WINDOW_BREAKPOINTS = {
  /** Bottom tabs → navigation rail. */
  medium: 600,
  /** Master-detail split panes. */
  expanded: 900,
} as const;

/**
 * Narrowest window that gets the list + detail split: the 72dp rail, a 300dp
 * list and at least 300dp of detail. Every unfolded Fold posture clears it;
 * a medium window narrower than this keeps the full-width list.
 */
export const SPLIT_PANE_MIN_WIDTH = 672;

export type WindowSizeClass = "compact" | "medium" | "expanded";

export interface ResponsiveLayout {
  width: number;
  height: number;
  sizeClass: WindowSizeClass;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isLandscape: boolean;
  /** True when a list + detail split pane fits without either side cramping. */
  isTwoPane: boolean;
  /** True when list surfaces open an issue beside the list, not over it. */
  isSplitPane: boolean;
}

export function windowSizeClass(width: number): WindowSizeClass {
  if (width >= WINDOW_BREAKPOINTS.expanded) return "expanded";
  if (width >= WINDOW_BREAKPOINTS.medium) return "medium";
  return "compact";
}

/**
 * Reads the live window size. `useWindowDimensions` re-renders on every
 * configuration change, which is what fold/unfold and Samsung DeX
 * resizes both are, so no extra listener is needed.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const sizeClass = windowSizeClass(width);
  return {
    width,
    height,
    sizeClass,
    isCompact: sizeClass === "compact",
    isMedium: sizeClass === "medium",
    isExpanded: sizeClass === "expanded",
    isLandscape: width > height,
    isTwoPane: width >= WINDOW_BREAKPOINTS.expanded,
    isSplitPane: sizeClass !== "compact" && width >= SPLIT_PANE_MIN_WIDTH,
  };
}

/** Width of the list column in a list + detail split. */
export function splitPaneListWidth(layout: ResponsiveLayout): number {
  return layout.isExpanded ? 320 : 300;
}

/**
 * Kanban geometry. Columns are wide enough to read a title and two chips,
 * and narrow enough that the Fold 8's unfolded width shows more than one.
 */
export function boardMetrics(layout: ResponsiveLayout) {
  const columnWidth = layout.isCompact ? 272 : layout.isMedium ? 296 : 312;
  const gap = layout.isCompact ? 10 : 12;
  const listPadding = layout.isCompact ? 12 : 16;
  return { columnWidth, gap, listPadding };
}
