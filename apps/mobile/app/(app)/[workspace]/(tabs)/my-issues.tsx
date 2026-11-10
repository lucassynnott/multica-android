/**
 * "My Issues" tab. Three scopes — assigned / created / agents — mirroring
 * web's `packages/views/my-issues/components/my-issues-page.tsx:48-65`. The
 * `agents` scope label is "Agents and Squads" because the backend predicate
 * (`involves_user_id`, MUL-2397) surfaces both the user's owned agents and
 * squads they're involved in (member / leader / has an owned agent inside).
 *
 * Issues are grouped by concrete status key; empty sections are omitted.
 * Category controls lifecycle behavior and ordering, not section identity.
 *
 * Status + Priority filters mirror web's MyIssuesHeader filter sub-menus.
 * Filter state lives in `useMyIssuesViewStore` and is cleared on workspace
 * change via the shared `useClearFiltersOnWorkspaceChange` hook.
 *
 * Wide windows: a tap opens the issue in a detail pane beside the list
 * (`SplitPane` + `IssueDetailPane`) instead of pushing the issue screen.
 */
import { useMemo } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router, useIsFocused } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type {
  IssuePriority,
  IssueStatus,
} from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header";
import { TideTexture } from "@/components/ui/tide-texture";
import { HeaderActions } from "@/components/ui/app-header-actions";
import { SplitPane } from "@/components/ui/split-pane";
import { IssueDetailPane } from "@/components/issue/issue-detail-pane";
import { StatusIcon } from "@/components/ui/status-icon";
import { IssueRow } from "@/components/issue/issue-row";
import { IssuesLoading } from "@/components/issue/issues-loading";
import {
  buildMyIssuesFilter,
  myIssueListOptions,
} from "@/data/queries/my-issues";
import type { MyIssuesScope } from "@/data/queries/issue-keys";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useMyIssuesViewStore } from "@/data/stores/my-issues-view-store";
import { useClearFiltersOnWorkspaceChange } from "@/lib/use-clear-filters-on-workspace-change";
import { PRIORITY_LABEL } from "@/lib/issue-status";
import { useT } from "@/lib/i18n";
import { useIssuePane } from "@/lib/use-issue-pane";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { groupIssuesByStatus } from "@/lib/group-issues-by-status";
import { filterIssues } from "@/lib/filter-issues";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Mobile pill row has tight width on SE3 (375pt). Three pills + Filter icon
// must fit in 343pt usable space, so the agents scope renders "Agents" — the
// full "Agents and Squads" label (~135pt) blows past safe limits and breaks
// under Dynamic Type. Semantics unchanged: same backend predicate
// (`involves_user_id`, MUL-2397) covers owned agents + related squads; the
// empty state copy still says "agents or squads".
const SCOPES: MyIssuesScope[] = ["assigned", "created", "agents"];

export default function MyIssues() {
  const isFocused = useIsFocused();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("issues");

  const scope = useMyIssuesViewStore((s) => s.scope);
  const setScope = useMyIssuesViewStore((s) => s.setScope);
  const statusFilters = useMyIssuesViewStore((s) => s.statusFilters);
  const priorityFilters = useMyIssuesViewStore((s) => s.priorityFilters);

  const openFilter = () => {
    if (!wsSlug) return;
    router.push({
      pathname: "/[workspace]/issues-filter",
      params: { workspace: wsSlug, scope: "my" },
    });
  };

  useClearFiltersOnWorkspaceChange(
    useMyIssuesViewStore.getState().clearFilters,
    wsId,
  );

  const filter = useMemo(
    () => (userId ? buildMyIssuesFilter(scope, userId) : { assignee_id: "" }),
    [scope, userId],
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    ...myIssueListOptions(wsId, scope, filter),
    enabled: !!wsId && !!userId,
  });

  // Catalog labels and ordering enhance exact-key sections without blocking rows.
  const catalog = useIssueStatuses();

  // Apply client-side status + priority filter. Mirrors the predicate at
  // packages/views/issues/utils/filter.ts:30-34 via filterIssues().
  const filtered = useMemo(
    () => filterIssues(data ?? [], statusFilters, priorityFilters),
    [data, statusFilters, priorityFilters],
  );

  const sections = useMemo(() => groupIssuesByStatus(filtered, catalog.statuses), [filtered, catalog.statuses]);

  const hasActiveFilters =
    statusFilters.length > 0 || priorityFilters.length > 0;
  const scopeItems = SCOPES.map((value) => ({
    value,
    label: t(`tabs.${value}`),
  }));

  const loadFailed = !!error && !data;
  const pane = useIssuePane("mine");

  return (
    <View className="flex-1 bg-background">
      <TideTexture height={420} />
      <SplitPane
        split={pane.split}
        detail={<IssueDetailPane surface="mine" />}
        list={
          <>
            <Header
              title={t("navigation:tabs.my_issues")}
              count={data ? String(filtered.length) : undefined}
              right={<HeaderActions />}
            />
            <ScopeToolbar
              scopes={scopeItems}
              scope={scope}
              onChange={(v) => setScope(v)}
              onOpenFilter={openFilter}
              hasActiveFilters={hasActiveFilters}
              dense={pane.split}
            />
            {hasActiveFilters ? (
              <ActiveFilterChips
                statusFilters={statusFilters}
                priorityFilters={priorityFilters}
                statusLabelOf={catalog.labelOf}
                onClearStatus={(s) =>
                  useMyIssuesViewStore.getState().toggleStatusFilter(s)
                }
                onClearPriority={(p) =>
                  useMyIssuesViewStore.getState().togglePriorityFilter(p)
                }
              />
            ) : null}
            {isLoading ? (
              <IssuesLoading />
            ) : (
              // One list for rows, the empty state and the load error, so each of
              // them can be pulled to refresh. The error only shows with no data.
              <SectionList
                sections={loadFailed ? [] : sections}
                keyExtractor={(item) => item.id}
                extraData={pane.selectedId}
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section }) => (
                  <SectionHeader
                    status={section.status}
                    count={section.data.length}
                  />
                )}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <IssueRow
                    issue={item}
                    stacked={pane.split}
                    selected={item.id === pane.selectedId}
                    onPress={() => {
                      if (pane.select({ issueId: item.id })) return;
                      if (wsSlug) router.push(`/${wsSlug}/issue/${item.id}`);
                    }}
                  />
                )}
                ListEmptyComponent={
                  loadFailed ? (
                    <ListMessage
                      message={t("errors.load_failed", {
                        message: error instanceof Error ? error.message : "unknown",
                      })}
                      onRetry={() => refetch()}
                    />
                  ) : (
                    <ListMessage
                      message={
                        hasActiveFilters ? t("empty.filtered") : t(`empty.${scope}`)
                      }
                    />
                  )
                }
                refreshing={isFocused && isRefetching}
                onRefresh={refetch}
              />
            )}
          </>
        }
      />
    </View>
  );
}

/**
 * Toolbar under the header: the scope picker (DESIGN.md "Segmented picker" —
 * a `bg-secondary` track, 3dp padding, 38dp segments, the selected one a step
 * lighter with foreground ink) and the filter trigger on the same row,
 * because both control the list directly below. The picker is intrinsic
 * width so the trigger keeps its place on a narrow cover screen.
 */
function ScopeToolbar<S extends string>({
  scopes,
  scope,
  onChange,
  onOpenFilter,
  hasActiveFilters,
  dense,
}: {
  scopes: { value: S; label: string }[];
  scope: S;
  onChange: (value: S) => void;
  onOpenFilter: () => void;
  hasActiveFilters: boolean;
  /** Tighter segments for the ~300dp list column of a list + detail split. */
  dense: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-2 pb-2 pl-5 pr-2 pt-1">
      <View
        className="min-w-0 shrink flex-row rounded-lg bg-secondary p-[3px]"
        accessibilityRole="tablist"
      >
        {scopes.map((s) => {
          const active = scope === s.value;
          return (
            <Pressable
              key={s.value}
              onPress={() => onChange(s.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              hitSlop={{ top: 3, bottom: 3 }}
              className={cn(
                "h-[38px] min-w-11 shrink items-center justify-center rounded-lg",
                dense ? "px-2" : "px-3",
                active && "bg-background dark:bg-surface-2",
              )}
            >
              <Text
                numberOfLines={1}
                className={cn(
                  "text-[13px]",
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FilterButton
        onPress={onOpenFilter}
        hasActiveFilters={hasActiveFilters}
      />
    </View>
  );
}

/** 48dp icon button; a vermilion dot marks that filters are narrowing the list. */
function FilterButton({
  onPress,
  hasActiveFilters,
}: {
  onPress: () => void;
  hasActiveFilters: boolean;
}) {
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("header_filter")}
      className="size-12 items-center justify-center rounded-lg active:bg-secondary"
    >
      <Ionicons
        name="options-outline"
        size={20}
        color={THEME[colorScheme].foreground}
      />
      {hasActiveFilters ? (
        <View
          pointerEvents="none"
          className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary"
        />
      ) : null}
    </Pressable>
  );
}

function ActiveFilterChips({
  statusFilters,
  priorityFilters,
  statusLabelOf,
  onClearStatus,
  onClearPriority,
}: {
  statusFilters: IssueStatus[];
  priorityFilters: IssuePriority[];
  /** Resolves a status KEY — which can be a custom one — to its label. */
  statusLabelOf: (statusKey: string) => string;
  onClearStatus: (s: IssueStatus) => void;
  onClearPriority: (p: IssuePriority) => void;
}) {
  const { t } = useT("issues");
  return (
    <View className="flex-row flex-wrap items-center gap-2 px-5 pb-2">
      {statusFilters.map((s) => (
        <Chip
          key={`s-${s}`}
          label={statusLabelOf(s)}
          onClear={() => onClearStatus(s)}
        />
      ))}
      {priorityFilters.map((p) => (
        <Chip
          key={`p-${p}`}
          label={t(PRIORITY_LABEL[p])}
          onClear={() => onClearPriority(p)}
        />
      ))}
    </View>
  );
}

/** Dismissible filter chip: a hairline outline, no fill; tap to clear. */
function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  const { colorScheme } = useColorScheme();
  return (
    <Pressable
      onPress={onClear}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-7 flex-row items-center gap-1.5 rounded-lg border border-border pl-2.5 pr-2 active:bg-secondary"
    >
      <Text className="text-[13px] text-foreground">{label}</Text>
      <Ionicons
        name="close"
        size={14}
        color={THEME[colorScheme].mutedForeground}
      />
    </Pressable>
  );
}

// DESIGN.md "Group header": a 44dp row with a top hairline — the concrete
// (built-in or custom) status name at 13/600, then its count in mono.
function SectionHeader({
  status,
  count,
}: {
  status: IssueStatus;
  count: number;
}) {
  const catalog = useIssueStatuses();
  return (
    <View className="h-11 flex-row items-center gap-2.5 border-t border-border px-5">
      {/* Category keys resolve to their canonical lifecycle glyph. */}
      <StatusIcon
        status={status}
        category={catalog.categoryOf(status)}
        icon={catalog.iconOf(status)}
        color={catalog.colorOf(status)}
        size={14}
      />
      <Text className="text-[13px] font-semibold text-foreground">
        {catalog.labelOf(status)}
      </Text>
      <Text className="font-mono text-xs text-muted-foreground">{count}</Text>
    </View>
  );
}

function ListMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { t } = useT("issues");
  return (
    <View className="gap-3 px-5 pt-6">
      <Text className="text-[15px] leading-[21px] text-muted-foreground">
        {message}
      </Text>
      {onRetry ? (
        <Button
          variant="outline"
          className="min-h-11 self-start"
          onPress={onRetry}
        >
          <Text>{t("common:actions.retry")}</Text>
        </Button>
      ) : null}
    </View>
  );
}
