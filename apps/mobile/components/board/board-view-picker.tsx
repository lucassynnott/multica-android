/**
 * List / kanban switch for a board (DESIGN.md, "Segmented picker").
 *
 * The two glyphs are drawn from bars instead of an icon font because the
 * kanban mark (three columns of different lengths) is the same mark the Board
 * tab uses and no bundled icon set has it. Bars take token classes, so both
 * themes work without reading colours in JS.
 */
import { Pressable, View } from "react-native";
import type { BoardView } from "@/data/stores/board-view-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface Props {
  value: BoardView;
  onChange: (view: BoardView) => void;
}

const KANBAN_BARS = ["h-[14px]", "h-[9px]", "h-[12px]"];

export function BoardViewPicker({ value, onChange }: Props) {
  const { t } = useT("issues");
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t("board.view")}
      className="flex-row rounded-lg bg-secondary p-[3px]"
    >
      <Segment
        label={t("board.view_list")}
        selected={value === "list"}
        onPress={() => onChange("list")}
      >
        {(ink) => (
          <View className="gap-[3px]">
            {[0, 1, 2].map((bar) => (
              <View key={bar} className={cn("h-[2px] w-[14px] rounded-full", ink)} />
            ))}
          </View>
        )}
      </Segment>
      <Segment
        label={t("board.view_kanban")}
        selected={value === "kanban"}
        onPress={() => onChange("kanban")}
      >
        {(ink) => (
          <View className="h-[14px] flex-row items-start gap-[4px]">
            {KANBAN_BARS.map((height) => (
              <View key={height} className={cn("w-[2px] rounded-full", height, ink)} />
            ))}
          </View>
        )}
      </Segment>
    </View>
  );
}

function Segment({
  label,
  selected,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: (ink: string) => React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      // 38dp segment + the track's 3dp padding on each side is the 44dp target.
      hitSlop={{ top: 3, bottom: 3 }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        "h-[38px] w-11 items-center justify-center rounded-lg",
        selected && "bg-surface-2",
      )}
    >
      {children(selected ? "bg-foreground" : "bg-muted-foreground")}
    </Pressable>
  );
}
