/**
 * Status + Priority filter sheet — presented as a formSheet by the parent
 * Stack. Shared by My Issues and the workspace-wide Issues page; which
 * view-store to read/write is selected by the `scope` URL param.
 *
 * Routes that open this sheet:
 *   - /[workspace]/issues-filter?scope=my   →  useMyIssuesViewStore
 *   - /[workspace]/issues-filter?scope=all  →  useIssuesViewStore
 *
 * Self-contained: reads/writes the store directly, no callback passing.
 *
 * Multi-select in the shared picker row language: every option is a row, an
 * active filter carries the accent check.
 */
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { IssuePriority, IssueStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { PickerRow, PickerSectionLabel } from "@/components/ui/picker-row";
import { useIssuesViewStore } from "@/data/stores/issues-view-store";
import { useMyIssuesViewStore } from "@/data/stores/my-issues-view-store";
import { statusOptions } from "@/lib/issue-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { useT } from "@/lib/i18n";

// Mirrors PRIORITY_ORDER in packages/core/issues/config/priority.ts.
const PRIORITY_ORDER: IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  urgent: "issues:priority.urgent",
  high: "issues:priority.high",
  medium: "issues:priority.medium",
  low: "issues:priority.low",
  none: "issues:priority.none",
};

type Scope = "my" | "all";

export default function IssuesFilterRoute() {
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const { t } = useT("issues");
  const resolvedScope: Scope = scope === "all" ? "all" : "my";

  const statusFilters = useScopedFilters(resolvedScope, "status");
  const priorityFilters = useScopedFilters(resolvedScope, "priority");
  // Same option list the status picker offers, so every status a user can set
  // is also a status they can filter by. (MUL-6243)
  const catalog = useIssueStatuses();
  const statusChoices = statusOptions(catalog);

  const onToggleStatus = (s: IssueStatus) => {
    if (resolvedScope === "all") {
      useIssuesViewStore.getState().toggleStatusFilter(s);
    } else {
      useMyIssuesViewStore.getState().toggleStatusFilter(s);
    }
  };
  const onTogglePriority = (p: IssuePriority) => {
    if (resolvedScope === "all") {
      useIssuesViewStore.getState().togglePriorityFilter(p);
    } else {
      useMyIssuesViewStore.getState().togglePriorityFilter(p);
    }
  };
  const onClearFilters = () => {
    if (resolvedScope === "all") {
      useIssuesViewStore.getState().clearFilters();
    } else {
      useMyIssuesViewStore.getState().clearFilters();
    }
  };

  const hasActive = statusFilters.length > 0 || priorityFilters.length > 0;

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between pb-2 pl-5 pr-3 pt-3">
        <Text className="text-xl font-semibold text-foreground">
          {t("filters.title")}
        </Text>
        {hasActive ? (
          <Pressable
            onPress={onClearFilters}
            accessibilityRole="button"
            className="h-11 justify-center rounded-lg px-3 active:bg-secondary"
          >
            <Text className="text-[15px] text-primary">
              {t("filters.clear")}
            </Text>
          </Pressable>
        ) : (
          <View className="h-11" />
        )}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <PickerSectionLabel>{t("filters.status")}</PickerSectionLabel>
        {statusChoices.map((option) => (
          <PickerRow
            key={option.key}
            selected={statusFilters.includes(option.key)}
            onPress={() => onToggleStatus(option.key)}
            label={catalog.labelOf(option.key)}
            leading={
              <StatusIcon
                status={option.key}
                category={option.category}
                icon={option.icon}
                color={option.color}
                size={18}
              />
            }
          />
        ))}

        <View className="mt-2 border-t border-border" />
        <PickerSectionLabel>{t("filters.priority")}</PickerSectionLabel>
        {PRIORITY_ORDER.map((priority) => (
          <PickerRow
            key={priority}
            selected={priorityFilters.includes(priority)}
            onPress={() => onTogglePriority(priority)}
            label={t(PRIORITY_LABEL[priority])}
            leading={<PriorityIcon priority={priority} size={18} />}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function useScopedFilters(
  scope: Scope,
  kind: "status",
): IssueStatus[];
function useScopedFilters(
  scope: Scope,
  kind: "priority",
): IssuePriority[];
function useScopedFilters(
  scope: Scope,
  kind: "status" | "priority",
): IssueStatus[] | IssuePriority[] {
  const allStatus = useIssuesViewStore((s) => s.statusFilters);
  const allPriority = useIssuesViewStore((s) => s.priorityFilters);
  const myStatus = useMyIssuesViewStore((s) => s.statusFilters);
  const myPriority = useMyIssuesViewStore((s) => s.priorityFilters);
  if (scope === "all") {
    return kind === "status" ? allStatus : allPriority;
  }
  return kind === "status" ? myStatus : myPriority;
}
