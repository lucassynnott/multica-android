/**
 * Two-or-three-way switch for a screen that has more than one view of the same
 * record (a project's Overview and its Board, the inbox's two sections).
 *
 * Graphite segmented picker (DESIGN.md): a `bg-secondary` track with 3dp
 * padding, 38dp segments (so the control is 44dp tall), the selected segment
 * one surface step away from the track with foreground ink at 600, the others
 * muted. No accent fill and no elevation; counts are mono.
 */
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional count shown after the label (inbox unread, project issue count). */
  badge?: number;
}

interface Props<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessibility label for the group — announce what is being switched. */
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View
      className="flex-row rounded-lg bg-secondary p-[3px]"
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`flex-1 h-[38px] min-w-11 flex-row items-center justify-center gap-1.5 rounded-lg ${
              selected ? "bg-background dark:bg-surface-2" : ""
            }`}
          >
            <Text
              className={`text-[13px] ${
                selected
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              {option.label}
            </Text>
            {option.badge && option.badge > 0 ? (
              <Text
                className="font-mono text-xs text-muted-foreground"
              >
                {option.badge}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
