/**
 * Workspace-wide Issues page. Mirrors web `packages/views/issues/components/
 * issues-page.tsx:32-94`: fetch every issue in the workspace, expose
 * `all / members / agents` scope tabs, group by status, allow status +
 * priority filtering.
 *
 * Scope is a **client-side** filter on `assignee_type` — matches web
 * `issues-page.tsx:90-94`. This keeps `issueListOptions(wsId)` workspace-
 * scoped (no scope param on the wire), so `issueKeys.list(wsId)` and
 * `useIssuesRealtime` need no changes.
 *
 * Differences vs My Issues (`(tabs)/my-issues.tsx`):
 *   - Workspace-wide list (all issues), not user-scoped.
 *   - Three scopes are `all / members / agents` (assignee_type pre-filter),
 *     not `assigned / created / agents` (per-user predicates).
 *   - Independent filter store (`useIssuesViewStore`) so workspace-level
 *     filters don't bleed into the per-user view.
 *
 * Filters beyond status/priority (assignee / project / label / creator)
 * are deferred — power-user features with non-trivial picker cost; ship
 * after the parity-critical scope tabs land.
 */
import { useMemo } from "react";
import { Pressable, SectionList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type {
  IssuePriority,
  IssueStatus,
} from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
// Header chrome (back + "Issues" title) comes from the parent Stack
// (`apps/mobile/app/(app)/[workspace]/_layout.tsx:269`). The Filter
// affordance now lives in <ScopeToolbar> below, matching web's
// IssuesHeader pattern (scope + filter share a row).
import { StatusIcon } from "@/components/ui/status-icon";
import { IssueRow } from "@/components/issue/issue-row";
import { IssuesLoading } from "@/components/issue/issues-loading";
import { issueListOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import {
  useIssuesViewStore,
  type IssuesScope,
} from "@/data/stores/issues-view-store";
import { useClearFiltersOnWorkspaceChange } from "@/lib/use-clear-filters-on-workspace-change";
import { PRIORITY_LABEL } from "@/lib/issue-status";
import { useT } from "@/lib/i18n";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { groupIssuesByStatus } from "@/lib/group-issues-by-status";
import { filterIssues } from "@/lib/filter-issues";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Scope tab definitions. Mirrors web `issuesScopeStore`. Counts are NOT
// rendered on the pill labels — web's `IssuesHeader` doesn't show them
// either, and on SE3 (375pt) "(123)" appended to each label pushes the
// row past the safe width when filter icon shares the row. Per-status
// counts still appear on the SectionList headers below.
const SCOPES: IssuesScope[] = ["all", "members", "agents"];

export default function IssuesPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("issues");

  const scope = useIssuesViewStore((s) => s.scope);
  const setScope = useIssuesViewStore((s) => s.setScope);
  const statusFilters = useIssuesViewStore((s) => s.statusFilters);
  const priorityFilters = useIssuesViewStore((s) => s.priorityFilters);

  const openFilter = () => {
    if (!wsSlug) return;
    router.push({
      pathname: "/[workspace]/issues-filter",
      params: { workspace: wsSlug, scope: "all" },
    });
  };

  useClearFiltersOnWorkspaceChange(
    useIssuesViewStore.getState().clearFilters,
    wsId,
  );

  const { data, isLoading, error, refetch, isRefetching } = useQuery(
    issueListOptions(wsId),
  );

  // Only the active-filter chips need the catalog — sections group on the
  // category the server already resolved onto each issue. (MUL-6243)
  const catalog = useIssueStatuses();

  // Scope pre-filter — mirrors web `issues-page.tsx:90-94`. Applied before
  // status/priority filtering so chip filters operate on the visible slice.
  const scopedIssues = useMemo(() => {
    const allIssues = data ?? [];
    if (scope === "members") {
      return allIssues.filter((i) => i.assignee_type === "member");
    }
    if (scope === "agents") {
      return allIssues.filter(
        (i) => i.assignee_type === "agent" || i.assignee_type === "squad",
      );
    }
    return allIssues;
  }, [data, scope]);

  const filtered = useMemo(
    () => filterIssues(scopedIssues, statusFilters, priorityFilters),
    [scopedIssues, statusFilters, priorityFilters],
  );

  const sections = useMemo(() => groupIssuesByStatus(filtered, catalog.statuses), [filtered, catalog.statuses]);

  const hasActiveFilters =
    statusFilters.length > 0 || priorityFilters.length > 0;
  const scopeItems = SCOPES.map((value) => ({
    value,
    label: t(`tabs.${value}`),
  }));

  const loadFailed = !!error && !data;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-xl font-semibold text-foreground">
                {t("navigation:routes.issues")}
              </Text>
              {data ? (
                <Text className="font-mono text-[13px] text-muted-foreground">
                  {filtered.length}
                </Text>
              ) : null}
            </View>
          ),
        }}
      />
      <ScopeToolbar
        scopes={scopeItems}
        scope={scope}
        onChange={(v) => setScope(v)}
        onOpenFilter={openFilter}
        hasActiveFilters={hasActiveFilters}
      />
      {hasActiveFilters ? (
        <ActiveFilterChips
          statusFilters={statusFilters}
          priorityFilters={priorityFilters}
          statusLabelOf={catalog.labelOf}
          onClearStatus={(s) =>
            useIssuesViewStore.getState().toggleStatusFilter(s)
          }
          onClearPriority={(p) =>
            useIssuesViewStore.getState().togglePriorityFilter(p)
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
              onPress={() => {
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
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
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
}: {
  scopes: { value: S; label: string }[];
  scope: S;
  onChange: (value: S) => void;
  onOpenFilter: () => void;
  hasActiveFilters: boolean;
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
                "h-[38px] min-w-11 shrink items-center justify-center rounded-lg px-3",
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
      accessibilityLabel={t("filters.title")}
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
