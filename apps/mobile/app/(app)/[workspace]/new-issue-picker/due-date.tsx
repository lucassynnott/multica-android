/**
 * Due-date picker route for the in-progress new-issue draft. See ./status.tsx.
 *
 * Same Done / Clear pattern as the issue-detail variant
 * (`issue/[id]/picker/due-date.tsx`) — UIDatePicker doesn't auto-commit, so
 * the route renders a tiny header with action buttons.
 */
import { useRef } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/ui/button";
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
      <View className="flex-row items-center justify-between px-4 pb-2 pt-4">
        <Text className="text-base font-semibold text-foreground">
          {t("common:fields.due_date")}
        </Text>
        <View className="flex-row items-center gap-2">
          {dueDate ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setDueDate(null);
                router.back();
              }}
            >
              <Text className="text-destructive">{t("picker.clear")}</Text>
            </Button>
          ) : null}
          <Button
            size="sm"
            onPress={() => {
              const iso = ref.current?.getIso();
              if (iso) setDueDate(iso);
              router.back();
            }}
          >
            <Text>{t("common:actions.done")}</Text>
          </Button>
        </View>
      </View>
      <DueDatePickerBody ref={ref} value={dueDate} />
    </View>
  );
}
