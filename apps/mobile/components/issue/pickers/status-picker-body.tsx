/**
 * Pure picker body for issue status — single-select over the workspace's
 * status catalog. No shell, no modal — the caller (a formSheet route screen, or
 * any embedding surface) renders it inside whatever container it needs.
 *
 * Split from the old `status-picker-sheet.tsx` so the same row UI can serve
 * both the issue-detail route (`issue/[id]/picker/status.tsx`, which writes
 * via useUpdateIssue) and the new-issue draft route
 * (`new-issue-picker/status.tsx`, which writes via useNewIssueDraftStore).
 *
 * Options come from `statusOptions()` — the same list the status filter reads,
 * so a status offered in one and missing from the other can't happen (that is
 * how an issue becomes unfindable). Until the catalog lands, or against a
 * backend that predates it, that list is exactly the 7 built-ins this picker
 * always offered. (MUL-6243)
 *
 * Graphite: each row is the status icon plus its name — no colour fill — and
 * the selected row carries a single trailing check in the accent.
 */
import { ScrollView, View } from "react-native";
import type { IssueStatus } from "@multica/core/types";
import { StatusIcon } from "@/components/ui/status-icon";
import { PickerRow, PickerTitle } from "@/components/ui/picker-row";
import { statusOptions } from "@/lib/issue-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { useT } from "@/lib/i18n";

interface Props {
  value: IssueStatus;
  onChange: (next: IssueStatus) => void;
}

export function StatusPickerBody({ value, onChange }: Props) {
  const catalog = useIssueStatuses();
  const { t } = useT("issues");
  const options = statusOptions(catalog);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <PickerTitle>{t("filters.status")}</PickerTitle>
      <View className="pb-3">
        {options.map((option) => {
          const selected = option.key === value;
          return (
            <PickerRow
              key={option.key}
              onPress={() => onChange(option.key)}
              selected={selected}
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
          );
        })}
      </View>
    </ScrollView>
  );
}
