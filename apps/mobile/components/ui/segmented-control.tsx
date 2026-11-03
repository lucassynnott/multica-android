/**
 * Two-or-three-way switch for a screen that has more than one view of the same
 * record (a project's Overview and its Board, the inbox's two sections).
 *
 * Quiet chrome: the track is one surface step, the active segment is the page
 * background with a hairline. No fill colour, no shadow — the position of the
 * hairline is the only signal. Heights are on the 4px grid so the control lines
 * up with the header above it, and the whole control lands on a 44pt tap
 * target (36pt segment + 4pt track padding on each side).
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
      className="flex-row rounded-lg bg-secondary p-1 gap-1"
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
            className={`flex-1 h-9 flex-row items-center justify-center gap-1.5 rounded-md ${
              selected ? "bg-background border border-border" : ""
            }`}
          >
            <Text
              className={`text-[13px] ${
                selected
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {option.label}
            </Text>
            {option.badge && option.badge > 0 ? (
              <Text
                className={`text-[13px] tabular-nums ${
                  selected ? "text-brand" : "text-muted-foreground"
                }`}
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
