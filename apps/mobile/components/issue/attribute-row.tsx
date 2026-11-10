/**
 * Issue-detail properties: the Graphite property list.
 *
 * A tight key/value list with one hairline above and below the block: a 13 px
 * muted label in a fixed 104 dp column, a 15 px value, 44 dp rows. Each row is
 * the tap target for its picker, which is a formSheet route that reads the
 * issue from the TanStack Query detail cache and fires its own mutation, so
 * there is no onChange round-trip back here.
 *
 * An empty editable field reads as its action in the accent ("Assign",
 * "Set date") rather than as a dash.
 *
 * Picker route map (every entry is registered in `_layout.tsx` with shared
 * SHEET_OPTIONS — formSheet + iOS native grabber + explicit numeric detents):
 *   status    →  issue/[id]/picker/status
 *   priority  →  issue/[id]/picker/priority
 *   assignee  →  issue/[id]/picker/assignee
 *   labels    →  issue/[id]/picker/label   (multi-select, stays open)
 *   project   →  issue/[id]/picker/project
 *   due_date  →  issue/[id]/picker/due-date
 */
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Issue } from "@multica/core/types";
import { formatDateOnly } from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { StatusIcon } from "@/components/ui/status-icon";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { ProjectIcon } from "@/components/ui/project-icon";
import { cn } from "@/lib/utils";
import { useActorLookup } from "@/data/use-actor-name";
import { findProject, projectListOptions } from "@/data/queries/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { PRIORITY_LABEL as PRIORITY_FULL_LABEL } from "@/lib/issue-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { i18n, useT } from "@/lib/i18n";

/**
 * The picker fields the issue-detail properties can open. Bound to a
 * map of typed Expo Router pathnames so typos become compile errors
 * (previously the call site used `as never` on a template string, which
 * silently accepted anything).
 */
type IssuePickerField =
  | "status"
  | "priority"
  | "assignee"
  | "label"
  | "project"
  | "due-date";

const ISSUE_PICKER_PATHNAMES = {
  status: "/[workspace]/issue/[id]/picker/status",
  priority: "/[workspace]/issue/[id]/picker/priority",
  assignee: "/[workspace]/issue/[id]/picker/assignee",
  label: "/[workspace]/issue/[id]/picker/label",
  project: "/[workspace]/issue/[id]/picker/project",
  "due-date": "/[workspace]/issue/[id]/picker/due-date",
} as const satisfies Record<IssuePickerField, string>;

// due_date is a calendar day — format timezone-safely so the day never shifts
// with the viewer's offset. Mirrors web's formatDate in list-row/board-card.
function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  return (
    formatDateOnly(
      iso,
      { month: "short", day: "numeric" },
      i18n.resolvedLanguage ?? i18n.language,
    ) || null
  );
}

function useIssueProject(issue: Issue) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: projects = [] } = useQuery(projectListOptions(wsId));
  return useMemo(
    () => findProject(projects, issue.project_id),
    [projects, issue.project_id],
  );
}

function useOpenPicker(issue: Issue) {
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  return (field: IssuePickerField) => {
    if (!wsSlug) return;
    router.push({
      pathname: ISSUE_PICKER_PATHNAMES[field],
      params: { workspace: wsSlug, id: issue.id },
    });
  };
}

export function AttributeRow({ issue }: { issue: Issue }) {
  const { getName } = useActorLookup();
  const { t } = useT("issues");
  const { categoryOf, colorOf, labelOf, iconOf } = useIssueStatuses();
  const openPicker = useOpenPicker(issue);
  const project = useIssueProject(issue);
  const { colorScheme } = useColorScheme();
  const mutedFg = THEME[colorScheme].mutedForeground;

  const labels = issue.labels ?? [];
  const assigneeValue =
    issue.assignee_type && issue.assignee_id
      ? { type: issue.assignee_type, id: issue.assignee_id }
      : null;
  const assigneeName = assigneeValue
    ? getName(assigneeValue.type, assigneeValue.id)
    : null;
  const dueLabel = formatDueDate(issue.due_date);

  return (
    <View className="border-y border-border py-1">
      <PropertyRow
        label={t("common:fields.status")}
        value={labelOf(issue.status)}
        emptyAction=""
        left={
          <StatusIcon
            status={issue.status}
            category={categoryOf(issue.status)}
            icon={iconOf(issue.status)}
            color={colorOf(issue.status)}
            size={16}
          />
        }
        onPress={() => openPicker("status")}
      />
      <PropertyRow
        label={t("common:fields.priority")}
        value={
          issue.priority === "none"
            ? null
            : t(PRIORITY_FULL_LABEL[issue.priority])
        }
        emptyAction={t("detail.empty_priority")}
        left={
          issue.priority === "none" ? null : (
            <PriorityIcon priority={issue.priority} size={16} />
          )
        }
        onPress={() => openPicker("priority")}
      />
      <PropertyRow
        label={t("common:fields.assignee")}
        value={assigneeName}
        emptyAction={t("detail.empty_assignee")}
        left={
          assigneeValue ? (
            <ActorAvatar
              type={assigneeValue.type}
              id={assigneeValue.id}
              size={22}
              showPresence
            />
          ) : null
        }
        onPress={() => openPicker("assignee")}
      />
      <PropertyRow
        label={t("common:fields.label")}
        value={labels.length > 0 ? labels.map((l) => l.name).join(", ") : null}
        emptyAction={t("detail.empty_label")}
        left={
          labels.length > 0 ? (
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: labels[0].color }}
            />
          ) : null
        }
        onPress={() => openPicker("label")}
      />
      <PropertyRow
        label={t("common:fields.project")}
        value={project?.title ?? null}
        emptyAction={t("detail.empty_project")}
        left={project ? <ProjectIcon icon={project.icon} size="sm" /> : null}
        onPress={() => openPicker("project")}
      />
      <PropertyRow
        label={t("common:fields.due_date")}
        value={dueLabel}
        emptyAction={t("detail.empty_due_date")}
        left={
          dueLabel ? (
            <Ionicons name="calendar-outline" size={16} color={mutedFg} />
          ) : null
        }
        onPress={() => openPicker("due-date")}
      />
    </View>
  );
}

function PropertyRow({
  label,
  value,
  emptyAction,
  left,
  onPress,
}: {
  label: string;
  value: string | null;
  /** What tapping an empty row does, shown in the accent in place of a value. */
  emptyAction: string;
  left: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-11 flex-row items-center px-5 active:bg-secondary"
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value ?? emptyAction}`}
    >
      <Text className="w-[104px] text-[13px] text-muted-foreground">
        {label}
      </Text>
      <View className="flex-1 flex-row items-center gap-2">
        {left}
        <Text
          className={cn(
            "flex-1 text-[15px] leading-[21px]",
            value ? "text-foreground" : "text-primary",
          )}
          numberOfLines={1}
        >
          {value ?? emptyAction}
        </Text>
      </View>
    </Pressable>
  );
}
