/**
 * The shared body and header controls of the new-project and edit-project
 * forms, so the two cannot drift.
 *
 * Graphite form: the title is borderless and large (it is the record's name,
 * not a field among fields); the icon and description are bordered `bg-card`
 * inputs under 13/600 labels. The header's primary action is the one
 * vermilion fill on the screen, with dark ink.
 */
import { Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import { AutosizeTextArea } from "@/components/ui/autosize-textarea";
import { MIN_BODY_INPUT_HEIGHT_PX } from "@/components/ui/input-tokens";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FieldsProps {
  icon: string;
  onChangeIcon: (value: string) => void;
  title: string;
  onChangeTitle: (value: string) => void;
  description: string;
  onChangeDescription: (value: string) => void;
  autoFocusTitle?: boolean;
}

export function ProjectFormFields({
  icon,
  onChangeIcon,
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  autoFocusTitle,
}: FieldsProps) {
  const { t } = useT("projects");
  const { colorScheme } = useColorScheme();
  const placeholder = THEME[colorScheme].mutedForeground;

  return (
    <>
      <View className="flex-row items-start gap-3">
        {/* Capped at four UTF-16 units: one emoji, never a sentence. */}
        <TextInput
          value={icon}
          onChangeText={(v) => onChangeIcon(v.slice(0, 4))}
          placeholder="📦"
          placeholderTextColor={placeholder}
          accessibilityLabel={t("form.icon_emoji")}
          maxLength={4}
          style={{ fontSize: 20, includeFontPadding: false }}
          className="size-11 rounded-lg border border-border bg-card p-0 text-center font-sans text-foreground"
        />
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder={t("form.title_placeholder")}
          placeholderTextColor={placeholder}
          accessibilityLabel={t("form.title")}
          autoFocus={autoFocusTitle}
          multiline
          submitBehavior="blurAndSubmit"
          returnKeyType="next"
          style={{ fontSize: 22, includeFontPadding: false }}
          className="min-h-11 flex-1 p-0 py-1.5 font-sans font-semibold text-foreground"
        />
      </View>

      <FormField label={t("form.description")}>
        <View className="rounded-lg border border-border bg-card px-3 py-2.5">
          <AutosizeTextArea
            value={description}
            onChangeText={onChangeDescription}
            placeholder={t("form.description_placeholder")}
            placeholderTextColor={placeholder}
            accessibilityLabel={t("form.description")}
            minHeight={MIN_BODY_INPUT_HEIGHT_PX}
            maxHeight={280}
            style={{ fontSize: 15 }}
            className="font-sans"
          />
        </View>
      </FormField>
    </>
  );
}

/** A 13/600 muted, sentence-case label over its control. */
export function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-semibold text-muted-foreground">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Header "Cancel": plain foreground text on a 44dp target. */
export function FormHeaderCancel({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-11 min-w-11 justify-center pr-3"
    >
      <Text className="text-[15px] text-foreground">{label}</Text>
    </Pressable>
  );
}

/** Header primary action: a 36dp vermilion tile with dark ink, 44dp target. */
export function FormHeaderAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={{ top: 4, bottom: 4 }}
      className={cn(
        "h-9 min-w-11 items-center justify-center rounded-lg bg-primary px-3.5 active:opacity-80",
        disabled && "opacity-40",
      )}
    >
      <Text className="text-[15px] font-semibold text-primary-foreground">
        {label}
      </Text>
    </Pressable>
  );
}
