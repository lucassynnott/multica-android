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
 * Nova layer: each row renders the shared `StatusBadge`, so a status looks the
 * same here as on a board card or in the issue header; the selected row is
 * marked with `bg-secondary` and a single trailing check.
 */
import { ScrollView, View } from "react-native";
import type { IssueStatus } from "@multica/core/types";
import { StatusBadge } from "@/components/issue/status-badge";
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
              labelNode={
                <StatusBadge
                  label={catalog.labelOf(option.key)}
                  status={option.key}
                  category={option.category}
                  color={option.color}
                />
              }
            />
          );
        })}
      </View>
    </ScrollView>
  );
}
