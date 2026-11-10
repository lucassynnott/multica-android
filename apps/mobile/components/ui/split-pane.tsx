/**
 * List-and-detail split for wide windows.
 *
 * `split` on: `list` sits in a fixed column with a right hairline and
 * `detail` fills the rest. `split` off (a phone-width window, or a view that
 * wants the whole canvas such as the kanban): `list` takes the full width and
 * `detail` is hidden.
 *
 * Both children stay mounted in the same position either way. A fold is
 * therefore a relayout: the list keeps its scroll offset and the detail keeps
 * its draft, and unfolding shows the pane exactly as it was left.
 */
import type { ReactNode } from "react";
import { View } from "react-native";
import { splitPaneListWidth, useResponsiveLayout } from "@/lib/responsive";
import { cn } from "@/lib/utils";

interface Props {
  split: boolean;
  list: ReactNode;
  detail: ReactNode;
}

export function SplitPane({ split, list, detail }: Props) {
  const layout = useResponsiveLayout();
  return (
    <View className="flex-1 flex-row">
      <View
        className={cn(split ? "border-r border-border" : "flex-1")}
        style={split ? { width: splitPaneListWidth(layout) } : undefined}
      >
        {list}
      </View>
      <View className={cn("min-w-0 flex-1", !split && "hidden")}>{detail}</View>
    </View>
  );
}
