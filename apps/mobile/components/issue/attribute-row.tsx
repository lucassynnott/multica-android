/**
 * Issue-detail properties.
 *
 * Two exports, one data source — both read the same issue and the same
 * workspace catalog, and both are display-only: editing happens in the
 * properties card rows, each of which pushes a formSheet picker route. The
 * route reads the issue from the TanStack Query detail cache and fires its own
 * mutation — no onChange callback round-trip back here.
 *
 *   AttributeBadgeRow — the single badge line under the title: status, plus
 *                       priority and project when they are set. A glance
 *                       surface; nothing here is tappable.
 *   AttributeRow      — the properties card: 12 px muted keys in a fixed
 *                       column, 13 px values, a hairline between rows. Every
 *                       row is the tap target for its picker.
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
import type { Issue, IssuePriority } from "@multica/core/types";
import { formatDateOnly } from "@multica/core/issues/date";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";
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

// Placeholder for an unset priority. The badge row omits the badge entirely;
// the properties row names the field and shows an em dash.
const PRIORITY_CHIP_LABEL: Record<IssuePriority, string> = {
  ...PRIORITY_FULL_LABEL,
  none: "issues:filters.priority",
};

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

/**
 * The badge line under the title. Status always renders through
 * `<StatusBadge>`; priority and project are quiet outline badges that only
 * appear once they carry a value — an unset field is the properties card's
 * job to surface, not the headline's.
 */
export function AttributeBadgeRow({ issue }: { issue: Issue }) {
  const { t } = useT("issues");
  const { categoryOf, colorOf, labelOf } = useIssueStatuses();
  const project = useIssueProject(issue);

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      <StatusBadge
        label={labelOf(issue.status)}
        status={issue.status}
        category={categoryOf(issue.status)}
        color={colorOf(issue.status)}
      />

      {issue.priority !== "none" ? (
        <Badge variant="outline" className="gap-1.5">
          <PriorityIcon priority={issue.priority} size={12} />
          <Badge.Text>{t(PRIORITY_CHIP_LABEL[issue.priority])}</Badge.Text>
        </Badge>
      ) : null}

      {project ? (
        <Badge variant="outline" className="max-w-[180px] gap-1.5">
          <ProjectIcon icon={project.icon} size="sm" />
          <Badge.Text className="shrink">{project.title}</Badge.Text>
        </Badge>
      ) : null}
    </View>
  );
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
    <View className="overflow-hidden rounded-xl border border-border bg-card">
      <PropertyRow
        label={t("common:fields.status")}
        value={labelOf(issue.status)}
        left={
          <StatusIcon
            status={issue.status}
            category={categoryOf(issue.status)}
            icon={iconOf(issue.status)}
            color={colorOf(issue.status)}
            size={14}
          />
        }
        onPress={() => openPicker("status")}
        mutedFg={mutedFg}
      />
      <Separator />
      <PropertyRow
        label={t("common:fields.priority")}
        value={
          issue.priority === "none"
            ? null
            : t(PRIORITY_FULL_LABEL[issue.priority])
        }
        left={<PriorityIcon priority={issue.priority} size={14} />}
        onPress={() => openPicker("priority")}
        mutedFg={mutedFg}
      />
      <Separator />
      <PropertyRow
        label={t("common:fields.assignee")}
        value={assigneeName}
        left={
          assigneeValue ? (
            <ActorAvatar
              type={assigneeValue.type}
              id={assigneeValue.id}
              size={18}
              showPresence
            />
          ) : null
        }
        onPress={() => openPicker("assignee")}
        mutedFg={mutedFg}
      />
      <Separator />
      <PropertyRow
        label={t("common:fields.label")}
        value={labels.length > 0 ? labels.map((l) => l.name).join(", ") : null}
        left={
          labels.length > 0 ? (
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: labels[0].color }}
            />
          ) : null
        }
        onPress={() => openPicker("label")}
        mutedFg={mutedFg}
      />
      <Separator />
      <PropertyRow
        label={t("common:fields.project")}
        value={project?.title ?? null}
        left={project ? <ProjectIcon icon={project.icon} size="sm" /> : null}
        onPress={() => openPicker("project")}
        mutedFg={mutedFg}
      />
      <Separator />
      <PropertyRow
        label={t("common:fields.due_date")}
        value={dueLabel}
        left={
          <Ionicons name="calendar-outline" size={14} color={mutedFg} />
        }
        onPress={() => openPicker("due-date")}
        mutedFg={mutedFg}
      />
    </View>
  );
}

function PropertyRow({
  label,
  value,
  left,
  onPress,
  mutedFg,
}: {
  label: string;
  value: string | null;
  left: React.ReactNode;
  onPress: () => void;
  mutedFg: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-2.5 active:bg-secondary/60"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="w-20 text-xs text-muted-foreground">{label}</Text>
      <View className="flex-1 flex-row items-center gap-1.5">
        {left}
        <Text
          className={cn(
            "flex-1 text-[13px]",
            value ? "text-foreground" : "text-muted-foreground/70",
          )}
          numberOfLines={1}
        >
          {value ?? "—"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={mutedFg} />
    </Pressable>
  );
}

function Separator() {
  return <View className="h-px ml-4 bg-border" />;
}
