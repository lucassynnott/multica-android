/**
 * The one trailing fact a board row or card shows about an issue, in order of
 * what a reader needs first: an urgent priority, else the due date, else the
 * priority. Only urgent is drawn in the accent (DESIGN.md, "One accent").
 */
import type { Issue } from "@multica/core/types";
import { formatDateOnly } from "@multica/core/issues/date";
import { i18n, useT } from "@/lib/i18n";

export interface IssueMeta {
  text: string;
  urgent: boolean;
}

export function useIssueMeta(issue: Issue): IssueMeta | null {
  const { t } = useT("issues");
  if (issue.priority === "urgent") {
    return { text: t("priority.urgent"), urgent: true };
  }
  if (issue.due_date) {
    return {
      text: formatDateOnly(
        issue.due_date,
        { month: "short", day: "numeric" },
        i18n.resolvedLanguage ?? i18n.language,
      ),
      urgent: false,
    };
  }
  if (issue.priority !== "none") {
    return { text: t(`priority.${issue.priority}`), urgent: false };
  }
  return null;
}
