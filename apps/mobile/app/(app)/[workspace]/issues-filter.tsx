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
 */
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { IssuePriority, IssueStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { useIssuesViewStore } from "@/data/stores/issues-view-store";
import { useMyIssuesViewStore } from "@/data/stores/my-issues-view-store";
import { statusOptions } from "@/lib/issue-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Text className="text-base font-semibold text-foreground">
          {t("filters.title")}
        </Text>
        {hasActive ? (
          <Pressable
            onPress={onClearFilters}
            hitSlop={8}
            className="px-2 py-1 active:opacity-60"
          >
            <Text className="text-sm text-primary font-medium">
              {t("filters.clear")}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>{t("filters.status")}</SectionLabel>
        <View className="flex-row flex-wrap gap-2 px-4">
          {statusChoices.map((option) => {
            const checked = statusFilters.includes(option.key);
            return (
              <FilterChip
                key={option.key}
                active={checked}
                onPress={() => onToggleStatus(option.key)}
                label={catalog.labelOf(option.key)}
                icon={
                  <StatusIcon
                    status={option.key}
                    category={option.category}
                    icon={option.icon}
                    color={option.color}
                    size={12}
                  />
                }
              />
            );
          })}
        </View>

        <SectionLabel>{t("filters.priority")}</SectionLabel>
        <View className="flex-row flex-wrap gap-2 px-4">
          {PRIORITY_ORDER.map((priority) => {
            const checked = priorityFilters.includes(priority);
            return (
              <FilterChip
                key={priority}
                active={checked}
                onPress={() => onTogglePriority(priority)}
                label={t(PRIORITY_LABEL[priority])}
                icon={<PriorityIcon priority={priority} size={12} />}
              />
            );
          })}
        </View>
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

function SectionLabel({ children }: { children: string }) {
  return (
    <View className="px-4 pb-2 pt-4">
      <Text className="text-[11px] font-medium text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}

/** Nova filter chip — h-7 pill, border only at rest, brand fill when on. */
function FilterChip({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon?: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "h-7 flex-row items-center gap-1.5 rounded-full border px-3",
        active
          ? "border-primary bg-primary"
          : "border-border bg-transparent active:bg-secondary",
      )}
    >
      {icon}
      <Text
        className={cn(
          "text-xs font-medium",
          active ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
