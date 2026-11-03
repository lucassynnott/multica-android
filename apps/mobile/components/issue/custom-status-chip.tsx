/**
 * Names a custom status on a compact issue row, including ungrouped lists.
 * Built-ins stay silent to keep the default row compact.
 *
 * Renders through `<StatusBadge>` — the app's single status rendering — so a
 * custom status reads identically here, on a board card and in the issue
 * header, and there is no second chip implementation to keep in sync. The
 * workspace colour still rides along as the badge's leading dot.
 *
 * Divergence from web: the catalog arrives as a PROP rather than from a hook
 * inside. Every mobile caller is a virtualized list row that already resolved
 * the catalog for its status icon's colour, and subscribing twice per row is
 * free on the network (React Query dedupes) but not on re-renders.
 */
import type { IssueStatus } from "@multica/core/types";
import { StatusBadge } from "./status-badge";
import { isCustomStatus, type IssueStatusCatalog } from "@/lib/issue-status";

export function CustomStatusChip({
  status,
  catalog,
}: {
  status: IssueStatus;
  catalog: IssueStatusCatalog;
}) {
  const entry = catalog.entryOf(status);
  if (!isCustomStatus(catalog, status) || !entry) return null;

  return (
    <StatusBadge
      label={entry.name}
      status={status}
      category={catalog.categoryOf(status)}
      color={entry.color ?? null}
      className="max-w-[140px]"
    />
  );
}
