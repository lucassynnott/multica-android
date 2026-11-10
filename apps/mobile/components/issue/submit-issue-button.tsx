/**
 * Primary action rendered in the Stack header (headerRight slot) of the
 * new-issue and edit-issue modals: a vermilion `rounded-lg` button with dark
 * text, the one accent on the screen. Shows a spinner instead of the label
 * while the mutation is in-flight, so the user can't double-tap.
 */
import { ActivityIndicator, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface Props {
  disabled: boolean;
  onPress: () => void;
  loading?: boolean;
  /** Visible label. Defaults to "Create". */
  label?: string;
  /** Spoken label. Defaults to "Create issue". */
  accessibilityLabel?: string;
}

export function SubmitIssueButton({
  disabled,
  onPress,
  loading,
  label,
  accessibilityLabel,
}: Props) {
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  const interactive = !disabled && !loading;
  return (
    <Pressable
      onPress={interactive ? onPress : undefined}
      hitSlop={{ top: 4, bottom: 4, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? t("new.create")}
      accessibilityState={{ disabled: !interactive, busy: loading }}
      className={cn(
        "h-10 min-w-[72px] items-center justify-center rounded-lg bg-primary px-4",
        interactive ? "active:opacity-80" : "opacity-40",
      )}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={THEME[colorScheme].primaryForeground}
        />
      ) : (
        <Text className="text-[15px] font-semibold text-primary-foreground">
          {label ?? t("common:actions.create")}
        </Text>
      )}
    </Pressable>
  );
}
