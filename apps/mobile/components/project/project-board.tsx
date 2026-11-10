/**
 * The board inside a project: the workspace board, scoped to this project's
 * issues.
 *
 * Deliberately not a second board implementation. Same columns, same ordering,
 * same move mutation, same list/kanban switch (one preference for both
 * boards) — only the issue set differs. The switch sits in a slim row above
 * the board because the project screen, not this component, owns the header. That means a card moved
 * here writes the same `before_id`/`after_id` anchors as one moved from the
 * workspace board, and both caches reconcile through the existing issue query
 * invalidation.
 *
 * Data comes from `projectIssuesOptions`, which lives under the issues cache
 * prefix, so a realtime `issue:*` event refreshes this list too.
 */
import { useMemo } from "react";
import { ActivityIndicator, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { BoardList } from "@/components/board/board-list";
import { BoardViewPicker } from "@/components/board/board-view-picker";
import { useBoardView } from "@/data/stores/board-view-store";
import { BoardCanvas } from "@/components/board/board-canvas";
import { useBoardActions } from "@/components/board/use-board-actions";
import { projectIssuesOptions } from "@/data/queries/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { buildBoardColumns } from "@/lib/board";
import { useT } from "@/lib/i18n";

interface Props {
  projectId: string;
}

export function ProjectBoard({ projectId }: Props) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const catalog = useIssueStatuses();
  const { t } = useT("projects");
  const { t: tIssues } = useT("issues");
  const [view, setView] = useBoardView();

  const issues = useQuery(projectIssuesOptions(wsId, projectId));

  const columns = useMemo(
    () =>
      buildBoardColumns({
        issues: issues.data ?? [],
        entries: catalog.activeStatuses,
        labelOf: catalog.labelOf,
        colorOf: catalog.colorOf,
        iconOf: catalog.iconOf,
        categoryOf: catalog.categoryOf,
      }),
    [issues.data, catalog],
  );

  const { openIssue, onLongPressIssue, onAddIssue } = useBoardActions({
    columns,
    wsSlug,
  });

  const total = columns.reduce((sum, column) => sum + column.issues.length, 0);

  if (issues.isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  // Only for a failed first load; a failed background refetch keeps the
  // cached board on screen.
  if (issues.isError && issues.data === undefined) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center text-[13px] text-muted-foreground">
          {tIssues("errors.load_failed", {
            message:
              issues.error instanceof Error
                ? issues.error.message
                : String(issues.error),
          })}
        </Text>
        <Button
          variant="outline"
          disabled={issues.isFetching}
          onPress={() => issues.refetch()}
        >
          <Text>{tIssues("common:actions.retry")}</Text>
        </Button>
      </View>
    );
  }

  if (total === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-[13px] text-muted-foreground text-center">
          {t("board.empty")}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between border-b border-border pb-2 pl-5 pr-4">
        <Text className="font-mono text-xs text-muted-foreground">{total}</Text>
        <BoardViewPicker value={view} onChange={setView} />
      </View>
      {view === "list" ? (
        <BoardList
          columns={columns}
          onPressIssue={openIssue}
          onLongPressIssue={onLongPressIssue}
          onAddIssue={onAddIssue}
        />
      ) : (
        <BoardCanvas
          columns={columns}
          catalog={catalog}
          onPressIssue={openIssue}
          onLongPressIssue={onLongPressIssue}
          onAddIssue={onAddIssue}
        />
      )}
    </View>
  );
}
