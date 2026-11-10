/**
 * Shared keyboard-bar toolbar for any markdown body input (issue
 * description, comment, agent prompt). Linear-mobile range of buttons:
 *
 *   @  ·  list  ·  checkbox  ·  code  ·  quote  ·  image  ·  file
 *
 * All buttons map to **literal-character insertion** — no WYSIWYG. After
 * a button fires, the user sees the raw markdown they just inserted; the
 * read-only renderer (mobile hybrid markdown) shows the final visual.
 *
 * No bold / italic / heading: those are "style" tools that require live
 * styled-text rendering inside `<TextInput>`, which RN can't do without
 * swapping to `react-native-enriched`. See plan / research doc.
 *
 * Image / file props are optional so step 3 can ship the literal buttons
 * before step 4 wires the picker + upload pipeline.
 */
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { cn } from "@/lib/utils";

export interface MarkdownToolbarProps {
  /** Toolbar `@` button → hook.handlers.onAtButtonPress. */
  onAt: () => void;
  /** Insert `- ` at the start of the current line. */
  onList: () => void;
  /** Insert `- [ ] ` at the start of the current line. */
  onCheckbox: () => void;
  /** Insert a fenced code block; caret lands in the empty middle line. */
  onCode: () => void;
  /** Insert `> ` at the start of the current line. */
  onQuote: () => void;
  /** Open image picker → upload → insert `![](url)`. Hidden when omitted. */
  onImage?: () => void;
  /** Open document picker → upload → insert `[📎 name](url)`. Hidden when omitted. */
  onFile?: () => void;
  /** Disable all buttons (during submit / upload-in-flight). */
  disabled?: boolean;
}

export function MarkdownToolbar({
  onAt,
  onList,
  onCheckbox,
  onCode,
  onQuote,
  onImage,
  onFile,
  disabled,
}: MarkdownToolbarProps) {
  const { t } = useT("editor");
  const { colorScheme } = useColorScheme();
  const ICON_COLOR = THEME[colorScheme].mutedForeground;
  return (
    <View className="flex-row items-center border-t border-border bg-background px-2 py-1">
      <ToolbarButton
        accessibilityLabel={t("a11y.mention_someone")}
        onPress={onAt}
        disabled={disabled}
      >
        <Text className="text-base text-muted-foreground leading-none">@</Text>
      </ToolbarButton>
      <ToolbarButton
        accessibilityLabel={t("a11y.bullet_list")}
        onPress={onList}
        disabled={disabled}
      >
        <Ionicons name="list-outline" size={18} color={ICON_COLOR} />
      </ToolbarButton>
      <ToolbarButton
        accessibilityLabel={t("a11y.checklist")}
        onPress={onCheckbox}
        disabled={disabled}
      >
        <Ionicons name="checkbox-outline" size={18} color={ICON_COLOR} />
      </ToolbarButton>
      <ToolbarButton
        accessibilityLabel={t("a11y.code_block")}
        onPress={onCode}
        disabled={disabled}
      >
        <Ionicons name="code-slash-outline" size={18} color={ICON_COLOR} />
      </ToolbarButton>
      <ToolbarButton
        accessibilityLabel={t("a11y.quote")}
        onPress={onQuote}
        disabled={disabled}
      >
        {/* Ionicons has no good quote glyph — use the literal " character at
         *   a slightly larger size for visual parity with adjacent icons. */}
        <Text className="text-xl text-muted-foreground leading-none -mt-1">
          &quot;
        </Text>
      </ToolbarButton>
      {onImage ? (
        <ToolbarButton
          accessibilityLabel={t("a11y.attach_image")}
          onPress={onImage}
          disabled={disabled}
        >
          <Ionicons name="image-outline" size={18} color={ICON_COLOR} />
        </ToolbarButton>
      ) : null}
      {onFile ? (
        <ToolbarButton
          accessibilityLabel={t("a11y.attach_file")}
          onPress={onFile}
          disabled={disabled}
        >
          <Ionicons name="attach-outline" size={18} color={ICON_COLOR} />
        </ToolbarButton>
      ) : null}
    </View>
  );
}

function ToolbarButton({
  onPress,
  disabled,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "h-11 w-11 items-center justify-center rounded-lg active:bg-secondary",
        disabled && "opacity-40",
      )}
    >
      {children}
    </Pressable>
  );
}
