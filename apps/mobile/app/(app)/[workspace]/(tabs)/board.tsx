/**
 * Board tab — the workspace's issues by status, as a dense list or a kanban.
 *
 * Data: one `issueListOptions(wsId)` read (the same cache the list screens
 * use), projected into columns by `lib/board.ts`. No new endpoint and no
 * parallel cache, so a card moved here is reflected in Inbox, My Issues and
 * every other surface through the existing query invalidation.
 *
 * The two views are two renderings of the same columns: `BoardList` (groups
 * of rows) and `BoardCanvas` (columns of cards). Which one shows is a display
 * preference (`board-view-store`), defaulting to the list on a phone-width
 * window and the kanban where several columns fit. Interactions live in
 * `useBoardActions`. All of it is shared with the board inside a project, so
 * the two boards cannot drift apart.
 *
 * Moving an issue: long-press opens the move sheet (reliable with a trackpad,
 * a keyboard, TalkBack and a finger). The sheet lists the workspace's own
 * statuses, not a hardcoded set, so custom statuses work.
 *
 * Wide windows: in the list view a tap opens the issue in a detail pane
 * beside the list (`SplitPane` + `IssueDetailPane`) instead of pushing the
 * issue screen. The kanban needs the whole canvas for its columns, so it
 * keeps pushing.
 */
import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { TideTexture } from "@/components/ui/tide-texture";
import { SplitPane } from "@/components/ui/split-pane";
import { IssueDetailPane } from "@/components/issue/issue-detail-pane";
import { BoardCanvas } from "@/components/board/board-canvas";
import { BoardList } from "@/components/board/board-list";
import { BoardViewPicker } from "@/components/board/board-view-picker";
import { useBoardActions } from "@/components/board/use-board-actions";
import { issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { buildBoardColumns } from "@/lib/board";
import { useResponsiveLayout } from "@/lib/responsive";
import { useIssuePane } from "@/lib/use-issue-pane";
import { filterIssues } from "@/lib/filter-issues";
import { useIssuesViewStore } from "@/data/stores/issues-view-store";
import { useBoardView } from "@/data/stores/board-view-store";
import { useT } from "@/lib/i18n";

export default function BoardScreen() {
  const { t } = useT("issues");
  const { t: tNav } = useT("navigation");
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const catalog = useIssueStatuses();
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme];
  const layout = useResponsiveLayout();
  const [view, setView] = useBoardView();

  // The board belongs to the workspace-wide issue surface, so it shares that
  // surface's filter store (status/priority) instead of inventing its own.
  const statusFilters = useIssuesViewStore((s) => s.statusFilters);
  const priorityFilters = useIssuesViewStore((s) => s.priorityFilters);

  // Realtime for this cache is already mounted by the workspace layout's
  // RealtimeSubscriptions — a second subscription here would patch twice.
  const issues = useQuery(issueListOptions(wsId));

  const columns = useMemo(() => {
    const list = filterIssues(
      issues.data ?? [],
      statusFilters,
      priorityFilters,
    );
    return buildBoardColumns({
      issues: list,
      entries: catalog.activeStatuses,
      labelOf: catalog.labelOf,
      colorOf: catalog.colorOf,
      iconOf: catalog.iconOf,
      categoryOf: catalog.categoryOf,
    });
  }, [issues.data, catalog, statusFilters, priorityFilters]);

  const pane = useIssuePane("board", view === "list");
  const selectIssue = pane.select;
  const selectInPane = useCallback(
    (issue: { id: string }) => selectIssue({ issueId: issue.id }),
    [selectIssue],
  );
  const { openIssue, onLongPressIssue, onAddIssue } = useBoardActions({
    columns,
    wsSlug,
    selectInPane,
  });

  const total = columns.reduce((sum, column) => sum + column.issues.length, 0);
  const filtered = statusFilters.length > 0 || priorityFilters.length > 0;

  return (
    <View className="flex-1 bg-background">
      <TideTexture height={420} />
      <SplitPane
        split={pane.split}
        detail={<IssueDetailPane surface="board" />}
        list={
          <>
            <Header
              title={tNav("tabs.board")}
              count={total > 0 ? String(total) : undefined}
              right={
                <View className="flex-row items-center">
                  <BoardViewPicker value={view} onChange={setView} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("board.filter")}
                    className="ml-1 h-12 w-12 items-center justify-center rounded-lg active:bg-secondary"
                    onPress={() => router.push(`/${wsSlug}/issues-filter?scope=all`)}
                  >
                    <Ionicons
                      name="options-outline"
                      size={20}
                      color={theme.mutedForeground}
                    />
                  </Pressable>
                  {/* The screen's one primary action: a 36dp vermilion tile inside a
                      48dp target. Compact only: from medium up the navigation rail
                      carries "New issue", and two of them would be two primaries. */}
                  {layout.isCompact ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("board.new_issue")}
                      className="h-12 w-12 items-center justify-center active:opacity-70"
                      onPress={() => router.push(`/${wsSlug}/new-issue`)}
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary">
                        <Ionicons
                          name="add"
                          size={22}
                          color={theme.primaryForeground}
                        />
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              }
            />

            {issues.isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator />
              </View>
            ) : issues.isError && issues.data === undefined ? (
              // Only for a failed first load. A failed background refetch keeps the
              // cached board on screen instead of replacing it with an error.
              <View className="flex-1 items-center justify-center gap-4 px-8">
                <Text className="text-center text-[13px] text-muted-foreground">
                  {t("errors.load_failed", {
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
                  <Text>{t("common:actions.retry")}</Text>
                </Button>
              </View>
            ) : total === 0 ? (
              <View className="flex-1 items-center justify-center px-8">
                <Text className="text-[13px] text-muted-foreground text-center">
                  {filtered ? t("empty.filtered") : t("empty.all")}
                </Text>
              </View>
            ) : view === "list" ? (
              <BoardList
                columns={columns}
                onPressIssue={openIssue}
                onLongPressIssue={onLongPressIssue}
                onAddIssue={onAddIssue}
                selectedId={pane.selectedId}
                stacked={pane.split}
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
          </>
        }
      />
    </View>
  );
}
