/**
 * Resolve an issue's human identifier (`FOLD-6`) from caches the app already
 * holds, for surfaces whose payload only carries the issue id (inbox rows).
 *
 * Reads the workspace issue list (`issueListOptions`, the board's query, kept
 * fresh by realtime) through `select`, so every row shares that one query and
 * only re-renders when its own identifier changes. Falls back to the per-issue
 * detail cache as a pure cache subscription (`enabled: false`), which never
 * issues a request of its own. Returns undefined when neither has the issue.
 */
import { useQuery } from "@tanstack/react-query";
import { issueDetailOptions, issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";

export function useIssueIdentifier(
  issueId: string | null | undefined,
): string | undefined {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: fromList } = useQuery({
    ...issueListOptions(wsId),
    enabled: !!wsId && !!issueId,
    select: (issues) => issues.find((i) => i.id === issueId)?.identifier,
  });
  const { data: fromDetail } = useQuery({
    ...issueDetailOptions(wsId, issueId ?? ""),
    enabled: false,
    select: (issue) => issue.identifier,
  });
  return fromList || fromDetail || undefined;
}
