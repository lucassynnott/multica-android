/**
 * Pure picker body for issue priority — single-select over the 5 priority
 * enum values. See status-picker-body.tsx for the split rationale.
 *
 * Graphite: shared `PickerRow` geometry with an 18px leading icon; the
 * selected row carries one trailing check in the accent.
 */
import { ScrollView, View } from "react-native";
import type { IssuePriority } from "@multica/core/types";
import { PickerRow, PickerTitle } from "@/components/ui/picker-row";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { PRIORITY_LABEL } from "@/lib/issue-status";
import { useT } from "@/lib/i18n";

// Display order: severity descending (urgent → none).
const PRIORITY_OPTIONS: IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

interface Props {
  value: IssuePriority;
  onChange: (next: IssuePriority) => void;
}

export function PriorityPickerBody({ value, onChange }: Props) {
  const { t } = useT("issues");

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <PickerTitle>{t("filters.priority")}</PickerTitle>
      <View className="pb-3">
        {PRIORITY_OPTIONS.map((v) => (
          <PickerRow
            key={v}
            onPress={() => onChange(v)}
            selected={v === value}
            label={t(PRIORITY_LABEL[v])}
            leading={<PriorityIcon priority={v} size={18} />}
          />
        ))}
      </View>
    </ScrollView>
  );
}
