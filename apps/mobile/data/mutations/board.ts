/**
 * Board mutations.
 *
 * A board drag is one write to `POST /api/issues/:id/move` with the two
 * neighbour anchors. That endpoint (server/internal/handler/issue_move.go)
 * derives the position server-side — both anchors → midpoint, only one →
 * neighbour ± 1 — which is why `position` must not be sent: the handler
 * rejects unknown fields with 400, and anchor-based moves avoid the float-gap
 * and stale-anchor races a client-computed position would have.
 *
 * Optimistic by design: the card must already sit in its new column when the
 * finger lifts, otherwise the board snaps back for a network round trip. The
 * local patch is a faithful prediction of what the server will compute (see
 * `computeOptimisticPosition`), the failure is rare, and rollback is a
 * restore of the previous list — the conditions the repo's optimistic-update
 * policy asks for.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Issue } from "@multica/core/types";
import { api } from "@/data/api";
import { issueKeys } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { statusCategoryOfKey } from "@/lib/issue-status";

export interface MoveIssueVars {
  issueId: string;
  /** Omit for a reorder inside the same column. */
  status?: Issue["status"];
  beforeId: string | null;
  afterId: string | null;
  /** Predicted position, for the optimistic cache patch only. */
  optimisticPosition: number;
}

export function useMoveIssue() {
  const qc = useQueryClient();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);

  return useMutation({
    mutationKey: ["moveIssue"] as const,
    mutationFn: (vars: MoveIssueVars) =>
      api.moveIssue(vars.issueId, {
        ...(vars.status ? { status: vars.status } : {}),
        before_id: vars.beforeId,
        after_id: vars.afterId,
      }),
    onMutate: async (vars) => {
      // The workspace list and the per-project lists the project board
      // renders both live under this prefix. Patching only the exact
      // workspace key left a card moved on
      // a project board sitting in its old column for the whole round trip.
      const prefix = issueKeys.list(wsId);
      await qc.cancelQueries({ queryKey: prefix });
      const snapshots = qc.getQueriesData<Issue[]>({ queryKey: prefix });
      qc.setQueriesData<Issue[]>({ queryKey: prefix }, (old) =>
        Array.isArray(old)
          ? old.map((issue) =>
              issue.id === vars.issueId
                ? {
                    ...issue,
                    ...(vars.status ? { status: vars.status } : {}),
                    position: vars.optimisticPosition,
                    ...(vars.status
                      ? {
                          status_category: statusCategoryOfKey(
                            vars.status,
                          ) as Issue["status_category"],
                        }
                      : {}),
                  }
                : issue,
            )
          : old,
      );
      return { snapshots };
    },
    onError: (_error, _vars, ctx) => {
      for (const [key, data] of ctx?.snapshots ?? []) {
        qc.setQueryData(key, data);
      }
    },
    onSettled: (server, _error, vars) => {
      if (server) {
        qc.setQueryData<Issue | undefined>(
          issueKeys.detail(wsId, vars.issueId),
          (current) => (current ? { ...current, ...server } : current),
        );
      }
      void qc.invalidateQueries({ queryKey: issueKeys.list(wsId) });
      void qc.invalidateQueries({ queryKey: issueKeys.myAll(wsId) });
    },
  });
}

/**
 * Position the server will compute for a card dropped between two anchors,
 * mirrored from `server/internal/handler/issue_move.go:194-220`.
 */
export function computeOptimisticPosition(
  before: Issue | null,
  after: Issue | null,
  fallback: number,
): number {
  if (before && after) return (before.position + after.position) / 2;
  if (before) return before.position + 1;
  if (after) return after.position - 1;
  return fallback;
}
