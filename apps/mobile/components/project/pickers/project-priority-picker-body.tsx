/**
 * Pure picker body for project priority — single-select over the 5
 * ProjectPriority enum values. See issue/pickers/status-picker-body.tsx for
 * the "extract body, route owns shell" rationale.
 *
 * Nova layer: `PickerRow` geometry — 12pt padding, 18px leading icon, selected
 * row on `bg-secondary` with one trailing check.
 */
import { ScrollView, View } from "react-native";
import type { ProjectPriority } from "@multica/core/types";
import { PickerRow, PickerTitle } from "@/components/ui/picker-row";
import { ProjectPriorityIcon } from "@/components/ui/project-priority-icon";
import { PROJECT_PRIORITIES, projectPriorityLabel } from "@/lib/project-status";
import { useT } from "@/lib/i18n";

interface Props {
  value: ProjectPriority | string;
  onChange: (next: ProjectPriority) => void;
}

export function ProjectPriorityPickerBody({ value, onChange }: Props) {
  const { t } = useT();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <PickerTitle>{t("fields.priority")}</PickerTitle>
      <View className="pb-3">
        {PROJECT_PRIORITIES.map((priority) => (
          <PickerRow
            key={priority}
            onPress={() => onChange(priority)}
            selected={priority === value}
            label={projectPriorityLabel(priority)}
            leading={<ProjectPriorityIcon priority={priority} size={18} />}
          />
        ))}
      </View>
    </ScrollView>
  );
}
