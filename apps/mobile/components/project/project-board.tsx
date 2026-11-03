/**
 * The board inside a project: the workspace kanban, scoped to this project's
 * issues.
 *
 * Deliberately not a second board implementation. Same columns, same ordering,
 * same move mutation — only the issue set differs. That means a card moved
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
    <BoardCanvas
      columns={columns}
      catalog={catalog}
      onPressIssue={openIssue}
      onLongPressIssue={onLongPressIssue}
      onAddIssue={onAddIssue}
    />
  );
}
