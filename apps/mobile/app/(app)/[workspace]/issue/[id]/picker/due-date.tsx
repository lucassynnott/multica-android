/**
 * Due-date picker route for an existing issue.
 *
 * Diverges from the other single-select pickers because the native
 * UIDatePicker needs a confirmation step — the user spins to a date but
 * doesn't auto-commit on every onChange. Done / Clear buttons live in a
 * mini header row inside the route body (the parent Stack hides its own
 * header per the formSheet config), and on submit we fire the mutation +
 * router.back().
 */
import { useRef } from "react";
import { Pressable, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import {
  DueDatePickerBody,
  type DueDatePickerBodyHandle,
} from "@/components/issue/pickers/due-date-picker-body";
import { issueDetailOptions } from "@/data/queries/issues";
import { useUpdateIssue } from "@/data/mutations/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function IssueDueDatePickerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: issue } = useQuery(issueDetailOptions(wsId, id));
  const updateIssue = useUpdateIssue(id);
  const ref = useRef<DueDatePickerBodyHandle>(null);

  const value = issue?.due_date ?? null;

  return (
    <View className="flex-1">
      <DueDateHeader
        hasValue={!!value}
        onDone={() => {
          const iso = ref.current?.getIso();
          if (iso) updateIssue.mutate({ due_date: iso });
          router.back();
        }}
        onClear={() => {
          updateIssue.mutate({ due_date: null });
          router.back();
        }}
      />
      <DueDatePickerBody ref={ref} value={value} />
    </View>
  );
}

function DueDateHeader({
  hasValue,
  onDone,
  onClear,
}: {
  hasValue: boolean;
  onDone: () => void;
  onClear: () => void;
}) {
  const { t } = useT("issues");
  return (
    <View className="flex-row items-center justify-between pb-2 pl-5 pr-3 pt-3">
      <Text className="text-xl font-semibold text-foreground">
        {t("common:fields.due_date")}
      </Text>
      <View className="flex-row items-center gap-1">
        {hasValue ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            className="h-11 justify-center rounded-lg px-3 active:bg-secondary"
          >
            <Text className="text-[15px] text-destructive">
              {t("picker.clear")}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          className="h-10 justify-center rounded-lg bg-primary px-4 active:opacity-80"
        >
          <Text className="text-[15px] font-semibold text-primary-foreground">
            {t("common:actions.done")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
