/**
 * Pure picker body for project status — single-select over the 5
 * ProjectStatus enum values. See issue/pickers/status-picker-body.tsx for
 * the "extract body, route owns shell" rationale.
 *
 * Nova layer: `PickerRow` geometry — 12pt padding, 18px leading icon, selected
 * row on `bg-secondary` with one trailing check.
 */
import { ScrollView, View } from "react-native";
import type { ProjectStatus } from "@multica/core/types";
import { PickerRow, PickerTitle } from "@/components/ui/picker-row";
import { ProjectStatusIcon } from "@/components/ui/project-status-icon";
import { PROJECT_STATUSES, projectStatusLabel } from "@/lib/project-status";
import { useT } from "@/lib/i18n";

interface Props {
  value: ProjectStatus | string;
  onChange: (next: ProjectStatus) => void;
}

export function ProjectStatusPickerBody({ value, onChange }: Props) {
  const { t } = useT();

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <PickerTitle>{t("fields.status")}</PickerTitle>
      <View className="pb-3">
        {PROJECT_STATUSES.map((status) => (
          <PickerRow
            key={status}
            onPress={() => onChange(status)}
            selected={status === value}
            label={projectStatusLabel(status)}
            leading={<ProjectStatusIcon status={status} size={18} />}
          />
        ))}
      </View>
    </ScrollView>
  );
}
