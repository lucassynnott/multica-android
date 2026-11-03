/**
 * Project properties section. Tappable rows for Status / Priority / Lead.
 * Each row opens a picker sheet via the corresponding `onPress*` callback.
 *
 * One card, one 11 px sentence-case label above it. Rows are label-left,
 * value-right with a disclosure chevron, and the separator between rows is
 * inset to the label edge so the card's left border is never doubled by a
 * full-width line.
 *
 * Lead supports both member and agent (Project.lead_type), resolved via
 * useActorLookup so it shares the same lookup with my-issues + issue detail.
 */
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
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
    <View className="gap-2">
      <Text className="px-1 text-[11px] font-medium text-muted-foreground">
        {t("detail.properties")}
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-card">
        <Row
          label={t("properties.status")}
          onPress={onPressStatus}
          left={<ProjectStatusIcon status={project.status} size={16} />}
          right={
            <Text className="text-[13px] text-foreground">
              {projectStatusLabel(project.status)}
            </Text>
          }
        />
        <Separator />
        <Row
          label={t("properties.priority")}
          onPress={onPressPriority}
          left={<ProjectPriorityIcon priority={project.priority} size={16} />}
          right={
            <Text className="text-[13px] text-foreground">
              {projectPriorityLabel(project.priority)}
            </Text>
          }
        />
        <Separator />
        <Row
          label={t("properties.lead")}
          onPress={onPressLead}
          left={
            leadName ? (
              <ActorAvatar
                type={project.lead_type}
                id={project.lead_id}
                size={20}
                showPresence
              />
            ) : (
              <PlaceholderAvatar />
            )
          }
          right={
            <Text
              className={
                leadName
                  ? "text-[13px] text-foreground"
                  : "text-[13px] text-muted-foreground"
              }
            >
              {leadName ?? t("properties.unassigned")}
            </Text>
          }
        />
      </View>
    </View>
  );
}

function Row({
  label,
  onPress,
  left,
  right,
}: {
  label: string;
  onPress: () => void;
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-12 flex-row items-center gap-3 px-4 active:bg-secondary"
    >
      <Text className="w-20 text-[13px] text-muted-foreground">{label}</Text>
      <View className="flex-1 flex-row items-center gap-2">
        {left}
        {right}
      </View>
      <Chevron />
    </Pressable>
  );
}

function Separator() {
  return <View className="ml-4 h-px bg-border" />;
}

function Chevron() {
  const { colorScheme } = useColorScheme();
  return (
    <Ionicons
      name="chevron-forward"
      size={14}
      color={THEME[colorScheme].mutedForeground}
    />
  );
}

function PlaceholderAvatar() {
  return (
    <View
      style={{ width: 20, height: 20, borderRadius: 10 }}
      className="border border-dashed border-muted-foreground/40"
    />
  );
}
