/**
 * Pure picker body for due-date. Wraps the native UIDatePicker. The caller
 * (a formSheet route) renders the Done / Clear actions in its own header
 * area — this body only handles the picker spinner + the local draft state.
 *
 * due_date is a calendar day (date-only "YYYY-MM-DD", no time/timezone — see
 * @multica/core/issues/date and GH #3618). Mirrors web's
 * packages/views/issues/components/pickers/due-date-picker.tsx: read the stored
 * day into a local-midnight Date for the spinner, write back the picked local
 * day as a date-only string.
 */
import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useRef,
} from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { toDateOnly, dateOnlyToLocalDate } from "@multica/core/issues/date";
import { i18n } from "@/lib/i18n";

interface Props {
  value: string | null;
}

export interface DueDatePickerBodyHandle {
  /** Returns the currently-displayed day as a date-only "YYYY-MM-DD" string. */
  getIso: () => string;
}

function toLocalDay(value: string | null): Date {
  return dateOnlyToLocalDate(value) ?? new Date();
}

export const DueDatePickerBody = forwardRef<DueDatePickerBodyHandle, Props>(
  function DueDatePickerBody({ value }, ref) {
    const [draft, setDraft] = useState<Date>(() => toLocalDay(value));

    useEffect(() => {
      setDraft(toLocalDay(value));
    }, [value]);

    useImperativeHandle(ref, () => ({
      getIso: () => toDateOnly(draft),
    }));

    // Android has no inline calendar: the picker is a system dialog. Mounting
    // `<DateTimePicker>` there opens that dialog from an effect and leaves
    // nothing in the sheet once it closes — no sign of the chosen day and no
    // way back to the calendar. So the sheet shows the draft day as a row
    // that opens the dialog imperatively, and opens it once on arrival.
    const { colorScheme } = useColorScheme();
    const openDialog = useCallback((current: Date) => {
      DateTimePickerAndroid.open({
        value: current,
        mode: "date",
        onValueChange: (_event, selected) => setDraft(selected),
      });
    }, []);
    const openedRef = useRef(false);
    useEffect(() => {
      if (Platform.OS !== "android" || openedRef.current) return;
      openedRef.current = true;
      openDialog(toLocalDay(value));
    }, [openDialog, value]);

    if (Platform.OS === "android") {
      const label = draft.toLocaleDateString(
        i18n.resolvedLanguage ?? i18n.language,
        { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      );
      return (
        <View className="flex-1 px-5 pt-2">
          <Pressable
            onPress={() => openDialog(draft)}
            accessibilityRole="button"
            accessibilityLabel={label}
            className="min-h-[52px] flex-row items-center gap-3 rounded-lg border border-border bg-card px-3.5 active:bg-secondary"
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={THEME[colorScheme].mutedForeground}
            />
            <Text className="flex-1 text-[15px] leading-[21px] text-foreground">
              {label}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={THEME[colorScheme].mutedForeground}
            />
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center pt-2">
        <DateTimePicker
          value={draft}
          mode="date"
          display="inline"
          locale={i18n.resolvedLanguage ?? i18n.language}
          onValueChange={(_event, selected) => setDraft(selected)}
        />
      </View>
    );
  },
);
