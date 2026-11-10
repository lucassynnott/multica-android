/**
 * Board (kanban) model for mobile.
 *
 * Web's board lives in `packages/views/issues/components/board-view.tsx` and
 * carries grouping, pagination and workflow hand-off machinery that mobile
 * does not have: mobile already fetches the whole workspace issue list in one
 * request (`data/queries/issues.ts` → `issueListOptions`), so the board is a
 * pure client-side projection of that list. What is NOT simplified is the
 * ordering and move semantics — those must agree with web, or dragging a card
 * here would reorder the same column differently there.
 *
 * Ordering rules, mirrored from `packages/views/issues/utils/drag-utils.ts`
 * and `apps/mobile/lib/group-issues-by-status.ts`:
 *   - columns follow the four lifecycle categories, then the workspace status
 *     catalog's own `position` for statuses inside one category, then the
 *     built-in order as the final tiebreak;
 *   - cards follow `issue.position` ascending, then identifier;
 *   - a dropped card takes the midpoint of its new neighbours' positions
 *     (first → neighbour - 1, last → neighbour + 1).
 */
import type { Issue, IssueStatusEntry } from "@multica/core/types";
import {
  BUILT_IN_STATUS_ORDER,
  STATUS_CATEGORIES,
  statusCategoryOfKey,
} from "./issue-status";

export interface BoardColumnModel {
  /** The concrete status key — column identity, not the category. */
  status: string;
  title: string;
  issues: Issue[];
  color: string | null;
  icon: string | null;
}

interface BuildArgs {
  issues: Issue[];
  /** Active status entries from the workspace catalog (may be empty). */
  entries: IssueStatusEntry[];
  labelOf: (status: string) => string;
  colorOf: (status: string) => string | null;
  iconOf: (status: string) => string | null;
  categoryOf: (status: string) => string;
  /** Hide the cancelled/closed column. Default true, like web's default. */
  hideClosed?: boolean;
}

export function buildBoardColumns({
  issues,
  entries,
  labelOf,
  colorOf,
  iconOf,
  categoryOf,
  hideClosed = true,
}: BuildArgs): BoardColumnModel[] {
  const byStatus = new Map<string, Issue[]>();
  for (const issue of issues) {
    const bucket = byStatus.get(issue.status);
    if (bucket) bucket.push(issue);
    else byStatus.set(issue.status, [issue]);
  }

  const entryByKey = new Map(entries.map((entry) => [entry.key, entry]));

  // Every active catalog status gets a column, even when empty: an empty
  // column is where a card is about to be dragged.
  const keys = new Set<string>();
  for (const entry of entries) if (!entry.archived_at) keys.add(entry.key);
  for (const key of byStatus.keys()) keys.add(key);

  const categoryRank = (key: string) => {
    const category =
      (entryByKey.get(key)?.category as string | undefined) ??
      statusCategoryOfKey(key);
    const index = STATUS_CATEGORIES.indexOf(category as never);
    return index === -1 ? STATUS_CATEGORIES.length : index;
  };
  const entryPosition = (key: string) => entryByKey.get(key)?.position ?? 0;
  const builtInRank = (key: string) => {
    const index = BUILT_IN_STATUS_ORDER.indexOf(key as never);
    return index === -1 ? BUILT_IN_STATUS_ORDER.length : index;
  };

  return [...keys]
    .filter((key) => !(hideClosed && categoryOf(key) === "closed"))
    .sort((a, b) => {
      const byCategory = categoryRank(a) - categoryRank(b);
      if (byCategory) return byCategory;
      const byPosition = entryPosition(a) - entryPosition(b);
      if (byPosition) return byPosition;
      const byBuiltIn = builtInRank(a) - builtInRank(b);
      if (byBuiltIn) return byBuiltIn;
      return a.localeCompare(b);
    })
    .map((status) => ({
      status,
      title: labelOf(status),
      issues: sortColumnIssues(byStatus.get(status) ?? []),
      color: colorOf(status),
      icon: iconOf(status),
    }));
}

export function sortColumnIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const byPosition = (a.position ?? 0) - (b.position ?? 0);
    if (byPosition) return byPosition;
    return a.identifier.localeCompare(b.identifier);
  });
}

/**
 * Position for a card dropped at `index` in `columnIssues` (the destination
 * column's rows AFTER removing the dragged card). Same arithmetic as web's
 * `computePosition`, so both clients place the card between the same two
 * neighbours.
 */
export function positionForDrop(
  columnIssues: Issue[],
  index: number,
): number {
  if (columnIssues.length === 0) return 0;
  if (index <= 0) return (columnIssues[0]?.position ?? 0) - 1;
  if (index >= columnIssues.length) {
    return (columnIssues[columnIssues.length - 1]?.position ?? 0) + 1;
  }
  const before = columnIssues[index - 1]?.position ?? 0;
  const after = columnIssues[index]?.position ?? before + 2;
  return (before + after) / 2;
}

const TRACE_LEFT = [0, 0x40, 0x44, 0x46, 0x47] as const;
const TRACE_RIGHT = [0, 0x80, 0xa0, 0xb0, 0xb8] as const;
const DAY_MS = 86_400_000;

/**
 * How many of `issues` were last updated on each of the last `days` local
 * calendar days, oldest first; the final entry is the day `now` falls in.
 * Rows with an unparseable or future `updated_at` are skipped, never guessed.
 */
export function activityByDay(
  issues: Pick<Issue, "updated_at">[],
  now: Date,
  days = 12,
): number[] {
  const counts = new Array<number>(days).fill(0);
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  ).getTime();
  for (const issue of issues) {
    const at = Date.parse(issue.updated_at);
    if (Number.isNaN(at) || at >= endOfToday) continue;
    const daysAgo = Math.floor((endOfToday - 1 - at) / DAY_MS);
    if (daysAgo < days) counts[days - 1 - daysAgo]! += 1;
  }
  return counts;
}

/**
 * A Braille bar trace of per-day counts: two days per glyph, each day a
 * column of 0–4 dots growing from the bottom. Heights are relative to the
 * busiest day in the series, and any day with at least one update shows at
 * least one dot. Returns "" when nothing happened, so callers render nothing
 * instead of a row of blanks.
 */
export function brailleTrace(counts: number[]): string {
  const max = Math.max(0, ...counts);
  if (max === 0) return "";
  const level = (count: number | undefined) =>
    count ? Math.max(1, Math.round((count / max) * 4)) : 0;
  let out = "";
  for (let i = 0; i < counts.length; i += 2) {
    out += String.fromCharCode(
      0x2800 + TRACE_LEFT[level(counts[i])]! + TRACE_RIGHT[level(counts[i + 1])]!,
    );
  }
  return out;
}
