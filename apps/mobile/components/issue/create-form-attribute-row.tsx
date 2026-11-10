/**
 * Bottom chip row for the new-issue form. Mirrors `attribute-row.tsx`'s
 * visual pattern but operates on the `useNewIssueDraftStore` instead of an
 * `issue` object + mutation. Tapping a chip pushes a formSheet picker
 * route under `new-issue-picker/<field>` — the route reads/writes the same
 * draft store, so the chip rehydrates automatically when the sheet
 * dismisses.
 *
 * Why a draft store: the picker routes are siblings of new-issue.tsx in
 * the Stack — they can't reach into the new-issue screen's local state.
 * The draft store is the cross-screen channel.
 */
import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AttributeChip } from "@/components/issue/attribute-chip";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { ProjectIcon } from "@/components/ui/project-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { formatDateOnly } from "@multica/core/issues/date";
import { useActorLookup } from "@/data/use-actor-name";
import { useNewIssueDraftStore } from "@/data/stores/new-issue-draft-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { PRIORITY_LABEL } from "@/lib/issue-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { useT } from "@/lib/i18n";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

/**
 * Picker fields the new-issue draft form can open. Bound to a typed map
 * of Expo Router pathnames so typos become compile errors (previously
 * the call site used `as never` on a template string).
 */
type NewIssuePickerField =
  | "status"
  | "priority"
  | "assignee"
  | "project"
  | "due-date";

const NEW_ISSUE_PICKER_PATHNAMES = {
  status: "/[workspace]/new-issue-picker/status",
  priority: "/[workspace]/new-issue-picker/priority",
  assignee: "/[workspace]/new-issue-picker/assignee",
  project: "/[workspace]/new-issue-picker/project",
  "due-date": "/[workspace]/new-issue-picker/due-date",
} as const satisfies Record<NewIssuePickerField, string>;

export function CreateFormAttributeRow() {
  const { t } = useT("issues");
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const status = useNewIssueDraftStore((s) => s.status);
  const priority = useNewIssueDraftStore((s) => s.priority);
  const assignee = useNewIssueDraftStore((s) => s.assignee);
  const dueDate = useNewIssueDraftStore((s) => s.dueDate);
  const project = useNewIssueDraftStore((s) => s.project);

  const { getName } = useActorLookup();
  const { colorScheme } = useColorScheme();
  const fg = THEME[colorScheme].foreground;
  // The draft can hold a custom status the user picked in the sheet. (MUL-6243)
  const { categoryOf, colorOf, labelOf, iconOf } = useIssueStatuses();
  const assigneeLabel = assignee
    ? getName(assignee.type, assignee.id)
    : t("filters.assignee");
  const priorityLabel: string =
    priority === "none" ? t("filters.priority") : t(PRIORITY_LABEL[priority]);

  const open = (field: NewIssuePickerField) => {
    if (!wsSlug) return;
    router.push({
      pathname: NEW_ISSUE_PICKER_PATHNAMES[field],
      params: { workspace: wsSlug },
    });
  };

  return (
    <View className="mt-2 border-t border-border pt-4">
      <View className="flex-row flex-wrap gap-2">
        <AttributeChip
          icon={
            <StatusIcon
              status={status}
              category={categoryOf(status)}
              icon={iconOf(status)} color={colorOf(status)}
              size={16}
            />
          }
          label={String(labelOf(status))}
          variant="filled"
          onPress={() => open("status")}
        />
        <AttributeChip
          icon={
            priority === "none" ? null : (
              <PriorityIcon priority={priority} size={16} />
            )
          }
          label={priorityLabel}
          variant={priority === "none" ? "dimmed" : "filled"}
          onPress={() => open("priority")}
        />
        <AttributeChip
          icon={
            assignee ? (
              <ActorAvatar
                type={assignee.type}
                id={assignee.id}
                size={22}
                showPresence
              />
            ) : null
          }
          label={assigneeLabel}
          variant={assignee ? "filled" : "dimmed"}
          onPress={() => open("assignee")}
        />
        <AttributeChip
          icon={
            dueDate ? (
              <Ionicons name="calendar-outline" size={16} color={fg} />
            ) : null
          }
          label={
            dueDate
              ? formatDueDate(dueDate) || t("common:fields.due_date")
              : t("common:fields.due_date")
          }
          variant={dueDate ? "filled" : "dimmed"}
          onPress={() => open("due-date")}
        />
        <AttributeChip
          icon={
            project ? (
              <ProjectIcon icon={project.icon} size="sm" />
            ) : null
          }
          label={project?.title ?? t("common:fields.project")}
          variant={project ? "filled" : "dimmed"}
          onPress={() => open("project")}
        />
      </View>
    </View>
  );
}

// due_date is a calendar day — format timezone-safely (no offset day shift).
// An unparseable value falls back to the caller's localized chip label.
function formatDueDate(iso: string): string {
  return formatDateOnly(iso, { month: "short", day: "numeric" });
}
