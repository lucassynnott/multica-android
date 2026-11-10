/**
 * Project properties section. Tappable rows for Status / Priority / Lead.
 * Each row opens a picker sheet via the corresponding `onPress*` callback.
 *
 * DESIGN.md "Property list": label 13 muted in a 104dp column, value 15, one
 * hairline above the block and one below. No chevrons and no panel; an unset
 * lead reads as an action in the accent rather than as a dash.
 *
 * Lead supports both member and agent (Project.lead_type), resolved via
 * useActorLookup so it shares the same lookup with my-issues + issue detail.
 */
import { Pressable, View } from "react-native";
import type { Project } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { ProjectStatusIcon } from "@/components/ui/project-status-icon";
import { ProjectPriorityIcon } from "@/components/ui/project-priority-icon";
import {
  projectPriorityLabel,
  projectStatusLabel,
} from "@/lib/project-status";
import { useActorLookup } from "@/data/use-actor-name";
import { useT } from "@/lib/i18n";

interface Props {
  project: Project;
  onPressStatus: () => void;
  onPressPriority: () => void;
  onPressLead: () => void;
}

export function ProjectPropertiesSection({
  project,
  onPressStatus,
  onPressPriority,
  onPressLead,
}: Props) {
  const { getName } = useActorLookup();
  const { t } = useT("projects");
  const leadName =
    project.lead_type && project.lead_id
      ? getName(project.lead_type, project.lead_id)
      : null;

  return (
    <View
      className="border-y border-border py-1"
      accessibilityLabel={t("detail.properties")}
    >
      <Row
        label={t("properties.status")}
        onPress={onPressStatus}
        left={<ProjectStatusIcon status={project.status} size={16} />}
        value={projectStatusLabel(project.status)}
      />
      <Row
        label={t("properties.priority")}
        onPress={onPressPriority}
        left={<ProjectPriorityIcon priority={project.priority} size={16} />}
        value={projectPriorityLabel(project.priority)}
      />
      <Row
        label={t("properties.lead")}
        onPress={onPressLead}
        left={
          leadName ? (
            <ActorAvatar
              type={project.lead_type}
              id={project.lead_id}
              size={22}
              showPresence
            />
          ) : null
        }
        value={leadName ?? t("properties.assign")}
        action={!leadName}
      />
    </View>
  );
}

function Row({
  label,
  onPress,
  left,
  value,
  action = false,
}: {
  label: string;
  onPress: () => void;
  left: React.ReactNode;
  value: string;
  /** The field is empty: the value is a call to set it, in the accent. */
  action?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      className="min-h-11 flex-row items-center px-5 active:bg-secondary"
    >
      <Text className="w-[104px] shrink-0 text-[13px] text-muted-foreground">
        {label}
      </Text>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {left}
        <Text
          className={
            action
              ? "shrink text-[15px] text-primary"
              : "shrink text-[15px] text-foreground"
          }
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </Pressable>
  );
}
