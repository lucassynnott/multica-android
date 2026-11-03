/**
 * Board tab — the kanban view of the workspace, sized for foldables.
 *
 * Data: one `issueListOptions(wsId)` read (the same cache the list screens
 * use), projected into columns by `lib/board.ts`. No new endpoint and no
 * parallel cache, so a card moved here is reflected in Inbox, My Issues and
 * every other surface through the existing query invalidation.
 *
 * Geometry lives in `BoardCanvas` and card interactions in `useBoardActions`.
 * Both are shared with the board inside a project, so the two boards cannot
 * drift apart.
 *
 * Moving a card: long-press opens the move sheet (reliable with a trackpad, a
 * keyboard, TalkBack and a finger). The sheet lists the workspace's own
 * statuses, not a hardcoded set, so custom statuses work.
 */
import { useMemo } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { BoardCanvas } from "@/components/board/board-canvas";
import { useBoardActions } from "@/components/board/use-board-actions";
import { issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { buildBoardColumns } from "@/lib/board";
import { useResponsiveLayout } from "@/lib/responsive";
import { filterIssues } from "@/lib/filter-issues";
import { useIssuesViewStore } from "@/data/stores/issues-view-store";
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

  const { openIssue, onLongPressIssue, onAddIssue } = useBoardActions({
    columns,
    wsSlug,
  });

  const total = columns.reduce((sum, column) => sum + column.issues.length, 0);

  return (
    <View className="flex-1 bg-background">
      <Header
        title={tNav("tabs.board")}
        subtitle={total > 0 ? t("board.count", { count: total }) : undefined}
        right={
          <View className="flex-row items-center gap-1">
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t("board.filter")}
              className="w-10 h-10 items-center justify-center rounded-md active:bg-secondary"
              onPress={() => router.push(`/${wsSlug}/issues-filter?scope=all`)}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={theme.mutedForeground}
              />
            </Pressable>
            {/* Compact: the header is a title, a count and two controls at
                467 dp, and a filled "New issue" pill overflows the row's
                right padding and clips its label to "New". A 40 dp `+`
                matches the Projects header and Chat header, so a create
                action looks the same everywhere. Wider than compact there
                is room for the words.

                The label inside the wide variant must be a <Text>, never a
                bare string: a raw string child is dropped by the Android
                renderer, which leaves an empty pill (a white square in dark
                mode, where `primary` is near-white). */}
            {layout.isCompact ? (
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("board.new_issue")}
                className="w-10 h-10 items-center justify-center rounded-md active:bg-secondary"
                onPress={() => router.push(`/${wsSlug}/new-issue`)}
              >
                <Ionicons name="add" size={22} color={theme.foreground} />
              </Pressable>
            ) : (
              <Button
                size="sm"
                onPress={() => router.push(`/${wsSlug}/new-issue`)}
                accessibilityLabel={t("board.new_issue")}
              >
                <Text>{t("board.new_issue")}</Text>
              </Button>
            )}
          </View>
        }
      />

      {issues.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : total === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[13px] text-muted-foreground text-center">
            {t("empty")}
          </Text>
        </View>
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
