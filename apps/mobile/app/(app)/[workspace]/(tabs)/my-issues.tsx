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
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/ui/header";
import { HeaderActions } from "@/components/ui/app-header-actions";
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
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { groupIssuesByStatus } from "@/lib/group-issues-by-status";
import { filterIssues } from "@/lib/filter-issues";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

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

  const showEmptyState =
    !isLoading && !error && filtered.length === 0;

  return (
    <View className="flex-1 bg-background">
      <Header title={t("navigation:tabs.my_issues")} right={<HeaderActions />} />
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
          statusColorOf={catalog.colorOf}
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
      ) : error ? (
        <View className="px-4 gap-3 pt-4">
          <Text className="text-sm text-destructive">
            {t("errors.load_failed", {
              message: error instanceof Error ? error.message : "unknown",
            })}
          </Text>
          <Button variant="outline" onPress={() => refetch()}>
            <Text>{t("common:actions.retry")}</Text>
          </Button>
        </View>
      ) : showEmptyState ? (
        <EmptyState
          message={
            hasActiveFilters
              ? t("empty.filtered")
              : t(`empty.${scope}`)
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-border ml-4" />
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader
              status={section.status}
              count={section.data.length}
            />
          )}
          contentContainerClassName="pb-6"
          renderItem={({ item }) => (
            <IssueRow
              issue={item}
              onPress={() => {
                if (wsSlug) router.push(`/${wsSlug}/issue/${item.id}`);
              }}
            />
          )}
          refreshing={isFocused && isRefetching}
          onRefresh={refetch}
        />
      )}

    </View>
  );
}

/**
 * Outline icon button matching the scope switch height so the toolbar row
 * reads as one visual group. Mirrors web `IssuesHeader` / `MyIssuesHeader`
 * filter trigger (`packages/views/my-issues/components/my-issues-header.tsx:174`),
 * which is also `variant="outline"` + icon-sized — NOT the ghost-style we'd
 * get from <IconButton>. Square (`w-9`) with `px-0` to suppress the sm
 * default `px-3`.
 */
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
    <View style={{ position: "relative" }} className="ml-1">
      <Button
        variant="outline"
        size="sm"
        onPress={onPress}
        hitSlop={4}
        accessibilityLabel={t("header_filter")}
        className="w-9 px-0"
      >
        <Ionicons
          name="options-outline"
          size={16}
          color={THEME[colorScheme].mutedForeground}
        />
      </Button>
      {hasActiveFilters ? (
        <View
          pointerEvents="none"
          className="absolute top-1 right-1 size-1.5 rounded-full bg-brand"
        />
      ) : null}
    </View>
  );
}

/**
 * Toolbar row mirroring web `MyIssuesHeader` / `IssuesHeader`
 * (`packages/views/my-issues/components/my-issues-header.tsx:138-163`):
 * left-aligned scope switch + right-side Filter icon (brand dot when filters
 * are active). Replaces the previous full-width segmented tabs +
 * Filter-in-title-bar split — keeps scope and the filter affordance in the
 * same row, because they both control the list directly below.
 *
 * The switch wears the same quiet chrome as `SegmentedControl` (secondary
 * track, page-background segment with a hairline) so the scope picker reads
 * identically to the inbox's section switch on the next tab. It is intrinsic
 * width rather than full-width because the filter trigger shares the row.
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
    <View className="flex-row items-center justify-between gap-2 px-4 pt-4 pb-2">
      <View
        className="flex-row items-center gap-1 shrink min-w-0 rounded-lg bg-secondary p-1"
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
              className={`h-8 flex-row items-center justify-center rounded-md px-3 ${
                active ? "bg-background border border-border" : ""
              }`}
            >
              <Text
                numberOfLines={1}
                className={`text-[13px] ${
                  active ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
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

function ActiveFilterChips({
  statusFilters,
  priorityFilters,
  statusLabelOf,
  statusColorOf,
  onClearStatus,
  onClearPriority,
}: {
  statusFilters: IssueStatus[];
  priorityFilters: IssuePriority[];
  /** Resolves a status KEY — which can be a custom one — to its label. */
  statusLabelOf: (statusKey: string) => string;
  /** Catalog colour for a custom status; null keeps the badge toneless. */
  statusColorOf: (statusKey: string) => string | null;
  onClearStatus: (s: IssueStatus) => void;
  onClearPriority: (p: IssuePriority) => void;
}) {
  const { t } = useT("issues");
  return (
    <View className="flex-row flex-wrap items-center gap-1.5 px-4 pb-2">
      {statusFilters.map((s) => (
        <Chip
          key={`s-${s}`}
          label={statusLabelOf(s)}
          dotColor={statusColorOf(s)}
          onClear={() => onClearStatus(s)}
        />
      ))}
      {priorityFilters.map((p) => (
        <Chip
          key={`p-${p}`}
          label={t(PRIORITY_LABEL[p])}
          dotColor={null}
          onClear={() => onClearPriority(p)}
        />
      ))}
    </View>
  );
}

/** Dismissible filter chip on the shared Badge surface — one height, one radius. */
function Chip({
  label,
  dotColor,
  onClear,
}: {
  label: string;
  dotColor: string | null;
  onClear: () => void;
}) {
  const { colorScheme } = useColorScheme();
  return (
    <Pressable
      onPress={onClear}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Badge variant="secondary" className="gap-1.5 pr-1.5">
        {dotColor ? (
          <View
            className="size-1.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        ) : null}
        <Badge.Text>{label}</Badge.Text>
        <Ionicons
          name="close"
          size={12}
          color={THEME[colorScheme].mutedForeground}
        />
      </Badge>
    </Pressable>
  );
}

// The section header names its concrete built-in or custom status. Sentence
// case, 11px muted, count as quiet tabular metadata — never a pill.
function SectionHeader({
  status,
  count,
}: {
  status: IssueStatus;
  count: number;
}) {
  const catalog = useIssueStatuses();
  return (
    <View className="flex-row items-center gap-2 px-4 pt-4 pb-1.5">
      {/* Category keys resolve to their canonical lifecycle glyph. */}
      <StatusIcon status={status} category={catalog.categoryOf(status)} icon={catalog.iconOf(status)} color={catalog.colorOf(status)} size={12} />
      <Text className="text-[11px] font-medium text-muted-foreground">
        {catalog.labelOf(status)}
      </Text>
      <Text className="text-[11px] tabular-nums text-muted-foreground/60">{count}</Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-sm text-muted-foreground text-center leading-[19px]">
        {message}
      </Text>
    </View>
  );
}
