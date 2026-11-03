/**
 * StatusBadge — the single status rendering for the whole app.
 *
 * Replaces the per-screen status chips (`custom-status-chip.tsx`, the ad-hoc
 * `bg-secondary px-*` pills in board cards and inbox rows) with the shadcn
 * Badge. One height, one radius, one type size, so a status reads identically
 * on a kanban card, an inbox row and an issue header.
 *
 * Colour comes from the lifecycle CATEGORY, not the concrete status key: a
 * workspace can rename or add statuses inside `started`, and "Code Review" and
 * "Blocked" would otherwise each need their own colour. The concrete label is
 * what differs. Built-in keys that carry a stronger meaning than their category
 * (`blocked`, `done`) are special-cased.
 */
import { View } from "react-native";
import { Badge } from "@/components/ui/badge";
import type { IssueStatus, IssueStatusCategory } from "@multica/core/types";
import { cn } from "@/lib/utils";

type BadgeVariant = "outline" | "secondary" | "info" | "success" | "warning" | "destructive";

const BUILT_IN_VARIANT: Record<string, BadgeVariant> = {
  backlog: "outline",
  todo: "outline",
  in_progress: "info",
  in_review: "secondary",
  blocked: "destructive",
  done: "success",
  cancelled: "outline",
};

const CATEGORY_VARIANT: Record<IssueStatusCategory, BadgeVariant> = {
  unstarted: "outline",
  started: "info",
  done: "success",
  closed: "outline",
};

export function statusBadgeVariant(
  status: IssueStatus,
  category: IssueStatusCategory | undefined,
): BadgeVariant {
  return (
    BUILT_IN_VARIANT[status] ??
    (category ? CATEGORY_VARIANT[category] : "outline")
  );
}

interface Props {
  /** Localized label — the caller owns i18n, like every other list surface. */
  label: string;
  status: IssueStatus;
  category?: IssueStatusCategory;
  /** Optional status colour from the workspace catalog, drawn as a leading dot. */
  color?: string | null;
  className?: string;
}

export function StatusBadge({ label, status, category, color, className }: Props) {
  const variant = statusBadgeVariant(status, category);
  return (
    <Badge variant={variant} className={cn("gap-1.5", className)}>
      {color ? (
        <View
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      <Badge.Text>{label}</Badge.Text>
    </Badge>
  );
}
