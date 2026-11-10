/**
 * Shared board interactions. Both boards (the workspace tab and the board
 * inside a project) need the same three behaviours: open a card, long-press
 * for the move sheet, and "+" to create an issue straight into a column.
 *
 * Extracted rather than duplicated because the two boards must not drift:
 * a card moved from a project board writes the same anchors through the same
 * mutation as one moved from the workspace board, so both caches reconcile
 * identically.
 */
import { useCallback } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import type { Issue } from "@multica/core/types";
import { ApiError } from "@/data/api";
import {
  computeOptimisticPosition,
  useMoveIssue,
} from "@/data/mutations/board";
import { useNewIssueDraftStore } from "@/data/stores/new-issue-draft-store";
import type { BoardColumnModel } from "@/lib/board";
import { sortColumnIssues } from "@/lib/board";
import { ActionSheet } from "@/lib/action-sheet";
import { useT } from "@/lib/i18n";

interface Options {
  columns: BoardColumnModel[];
  wsSlug: string | null;
  /**
   * Opens the issue in a detail pane beside the board and returns true, or
   * returns false when there is no pane (then the issue screen is pushed).
   * Only the workspace board's list view on a wide window passes it.
   */
  selectInPane?: (issue: Issue) => boolean;
}

export function useBoardActions({ columns, wsSlug, selectInPane }: Options) {
  const { t } = useT("issues");
  const moveIssue = useMoveIssue();

  const openIssue = useCallback(
    (issue: Issue) => {
      if (!wsSlug) return;
      if (selectInPane?.(issue)) return;
      router.push(`/${wsSlug}/issue/${issue.id}`);
    },
    [wsSlug, selectInPane],
  );

  const moveTo = useCallback(
    (issue: Issue, column: BoardColumnModel, index: number) => {
      // Destination rows without the moved card, in board order. The two rows
      // around `index` become the anchors the server turns into a position,
      // so the client never has to guess at float gaps.
      const rows = sortColumnIssues(
        column.issues.filter((row) => row.id !== issue.id),
      );
      const before = rows[index - 1] ?? null;
      const after = rows[index] ?? null;
      const sameColumn = issue.status === column.status;
      moveIssue.mutate(
        {
          issueId: issue.id,
          // A same-column reorder omits status; the move endpoint treats a
          // status-less move as a pure reorder.
          status: sameColumn ? undefined : column.status,
          beforeId: before?.id ?? null,
          afterId: after?.id ?? null,
          optimisticPosition: computeOptimisticPosition(
            before,
            after,
            issue.position ?? 0,
          ),
        },
        {
          // A project can restrict its issues to a subset of the workspace's
          // statuses (MUL-7420): the server answers 400 status_not_in_workflow
          // with the workflow name and the statuses it does accept. Say that
          // plainly instead of failing silently, the optimistic patch has
          // already been rolled back by the time this runs.
          onError: (error) => {
            if (
              error instanceof ApiError &&
              error.status === 400 &&
              isWorkflowRejection(error.body)
            ) {
              Alert.alert(
                t("board.workflow_blocked_title"),
                t("board.workflow_blocked_body", {
                  status: column.title,
                  workflow: error.body.workflow_name,
                  allowed: error.body.allowed_statuses
                    .map(
                      (key) =>
                        columns.find((c) => c.status === key)?.title ??
                        key.replace(/_/g, " "),
                    )
                    .join(", "),
                }),
              );
              return;
            }
            Alert.alert(
              t("board.move_failed_title"),
              t("board.move_failed_body", {
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          },
        },
      );
    },
    [columns, moveIssue, t],
  );

  /**
   * Long-press menu. "Move to …" is a nested sheet: the first lists the
   * card's actions, the second the destination columns. Two levels keep each
   * sheet short enough to read on the cover screen.
   */
  const onLongPressIssue = useCallback(
    (issue: Issue) => {
      const actions = [
        t("board.move_to"),
        t("board.move_top"),
        t("board.open"),
        t("board.cancel"),
      ];
      ActionSheet.showActionSheetWithOptions(
        {
          title: issue.identifier,
          message: issue.title,
          options: actions,
          cancelButtonIndex: 3,
        },
        (index) => {
          if (index === 2) {
            openIssue(issue);
            return;
          }
          if (index === 1) {
            // Pure reorder inside the current column: no status is sent, so
            // the move endpoint only rewrites position. Safe to use against a
            // live workspace, nothing is reassigned.
            const column = columns.find((c) => c.status === issue.status);
            if (column) moveTo(issue, column, 0);
            return;
          }
          if (index !== 0) return;
          const destinations = columns.filter(
            (column) => column.status !== issue.status,
          );
          const labels = destinations.map((column) => column.title);
          ActionSheet.showActionSheetWithOptions(
            {
              title: t("board.move_to"),
              options: [...labels, t("board.cancel")],
              cancelButtonIndex: labels.length,
            },
            (picked) => {
              const column = destinations[picked];
              if (!column) return;
              moveTo(issue, column, column.issues.length);
            },
          );
        },
      );
    },
    [columns, moveTo, openIssue, t],
  );

  const onAddIssue = useCallback(
    (status: string) => {
      if (!wsSlug) return;
      // The new-issue screen reads its defaults from the draft store; setting
      // the status before pushing makes "+" on a column create straight into
      // that column.
      useNewIssueDraftStore.getState().presetStatus(status);
      router.push(`/${wsSlug}/new-issue`);
    },
    [wsSlug],
  );

  return { openIssue, onLongPressIssue, onAddIssue };
}

interface WorkflowRejection {
  code: "status_not_in_workflow";
  workflow_name: string;
  allowed_statuses: string[];
}

/** Narrow the 400 body the server sends for a workflow-restricted status. */
export function isWorkflowRejection(
  body: unknown,
): body is WorkflowRejection {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Partial<WorkflowRejection>;
  return (
    candidate.code === "status_not_in_workflow" &&
    typeof candidate.workflow_name === "string" &&
    Array.isArray(candidate.allowed_statuses)
  );
}
