/**
 * Due-date picker route for the in-progress new-issue draft. See ./status.tsx.
 *
 * Same Done / Clear pattern as the issue-detail variant
 * (`issue/[id]/picker/due-date.tsx`) — UIDatePicker doesn't auto-commit, so
 * the route renders a tiny header with action buttons.
 */
import { useRef } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import {
  DueDatePickerBody,
  type DueDatePickerBodyHandle,
} from "@/components/issue/pickers/due-date-picker-body";
import { useNewIssueDraftStore } from "@/data/stores/new-issue-draft-store";
import { useT } from "@/lib/i18n";

export default function NewIssueDueDatePickerRoute() {
  const dueDate = useNewIssueDraftStore((s) => s.dueDate);
  const setDueDate = useNewIssueDraftStore((s) => s.setDueDate);
  const { t } = useT("issues");
  const ref = useRef<DueDatePickerBodyHandle>(null);

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between pb-2 pl-5 pr-3 pt-3">
        <Text className="text-xl font-semibold text-foreground">
          {t("common:fields.due_date")}
        </Text>
        <View className="flex-row items-center gap-1">
          {dueDate ? (
            <Pressable
              onPress={() => {
                setDueDate(null);
                router.back();
              }}
              accessibilityRole="button"
              className="h-11 justify-center rounded-lg px-3 active:bg-secondary"
            >
              <Text className="text-[15px] text-destructive">
                {t("picker.clear")}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => {
              const iso = ref.current?.getIso();
              if (iso) setDueDate(iso);
              router.back();
            }}
            accessibilityRole="button"
            className="h-10 justify-center rounded-lg bg-primary px-4 active:opacity-80"
          >
            <Text className="text-[15px] font-semibold text-primary-foreground">
              {t("common:actions.done")}
            </Text>
          </Pressable>
        </View>
      </View>
      <DueDatePickerBody ref={ref} value={dueDate} />
    </View>
  );
}
