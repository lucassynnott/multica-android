/**
 * Description input block shared by `new-issue.tsx` and `issue/[id]/edit.tsx`.
 *
 * Borderless: on a form whose only job is title + body, the description is
 * the page, not a field on it. 15/23 body type, no panel, no focus tint.
 *
 * Pure UI shell. The mention pipeline lives in the caller's `useMentionInput`
 * instance, passed in as `description`. Callers also own the floating
 * `MentionSuggestionBar` (it has to sit above the keyboard, outside the
 * scroll view).
 */
import { AutosizeTextArea } from "@/components/ui/autosize-textarea";
import { MIN_BODY_INPUT_HEIGHT_PX } from "@/components/ui/input-tokens";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useT } from "@/lib/i18n";
import type { UseMentionInputReturn } from "@/lib/use-mention-input";

export function DescriptionField({
  description,
  disabled,
  placeholder,
}: {
  description: UseMentionInputReturn;
  disabled: boolean;
  placeholder?: string;
}) {
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  const resolvedPlaceholder = placeholder ?? t("new.description_placeholder");
  return (
    <AutosizeTextArea
      value={description.text}
      onChangeText={description.handlers.onChangeText}
      selection={description.selection}
      onSelectionChange={description.handlers.onSelectionChange}
      placeholder={resolvedPlaceholder}
      placeholderTextColor={THEME[colorScheme].mutedForeground}
      accessibilityLabel={t("common:fields.description")}
      className="p-0 font-sans text-[15px] leading-[23px]"
      minHeight={MIN_BODY_INPUT_HEIGHT_PX}
      editable={!disabled}
    />
  );
}
