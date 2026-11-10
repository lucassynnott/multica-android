/**
 * Left-swipe-to-reveal-Archive wrapper for inbox rows.
 *
 * iOS pattern reference: Mail.app / Linear iOS / Things — an Archive action
 * revealed by a leftward drag. It is a quiet `bg-secondary` tile, not a red
 * one: archiving is reversible, and vermilion is kept for unread and urgent. **Reveal-only, no
 * auto-fire**: the previous version archived on full swipe past threshold,
 * which felt aggressive (no peek, easy to trigger by accident on a fast
 * vertical scroll). Mail.app / Linear require an explicit tap on the
 * revealed action; we now match that. A medium haptic fires once when the
 * row crosses the action width during the drag so the gesture still feels
 * confirmed.
 *
 * Why ReanimatedSwipeable (not the legacy Swipeable): RNGH 2.20+ ships the
 * Reanimated-driven implementation that integrates cleanly with the
 * existing reanimated@4 install and runs the swipe on the UI thread (the
 * legacy version uses Animated, which janks on heavy lists). The
 * gesture-handler root is already mounted in apps/mobile/app/_layout.tsx.
 *
 * Behaviour notes:
 *   - `friction=2` slightly slows the drag so the action doesn't open by
 *     accident on a fast vertical scroll that catches some horizontal motion.
 *   - `rightThreshold=80` is the open-detent — releasing past it keeps the
 *     Archive button revealed; releasing short of it snaps closed. No
 *     auto-archive on cross.
 *   - We `swipeable.close()` before invoking onArchive so the row's exit
 *     from the FlatList (driven by the optimistic mutation flipping
 *     `archived: true`, which the parent's `deduplicateInboxItems` filters
 *     out) doesn't race the spring close.
 */
import { useRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { InboxItem } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { InboxRow } from "./inbox-row";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const ACTION_WIDTH = 80;

interface Props {
  item: InboxItem;
  onPress: () => void;
  onArchive: () => void;
  /** The row's issue is open in the detail pane beside the list. */
  selected?: boolean;
}

export function SwipeableInboxRow({
  item,
  onPress,
  onArchive,
  selected,
}: Props) {
  const ref = useRef<SwipeableMethods>(null);

  const fireArchive = () => {
    // Close first so the swipe spring doesn't fight the row's removal from
    // FlatList on the next render tick.
    ref.current?.close();
    onArchive();
  };

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={ACTION_WIDTH}
      renderRightActions={(_progress, drag) => (
        <ArchiveAction onPress={fireArchive} drag={drag} />
      )}
    >
      <InboxRow item={item} onPress={onPress} selected={selected} />
    </ReanimatedSwipeable>
  );
}

function ArchiveAction({
  onPress,
  drag,
}: {
  onPress: () => void;
  drag: SharedValue<number>;
}) {
  const { t } = useT("inbox");
  const { colorScheme } = useColorScheme();
  // One-shot haptic when the drag crosses the action width threshold.
  // useAnimatedReaction runs on the UI thread; runOnJS bridges to the
  // Haptics.impactAsync call which has to live on JS.
  useAnimatedReaction(
    () => drag.value <= -ACTION_WIDTH,
    (crossed, prev) => {
      if (crossed && !prev) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [],
  );

  return (
    <Animated.View style={{ width: ACTION_WIDTH }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t("actions.archive")}
        className="flex-1 items-center justify-center border-b border-border bg-secondary"
      >
        <View className="items-center gap-1">
          <Ionicons
            name="archive-outline"
            size={20}
            color={THEME[colorScheme].foreground}
          />
          <Text className="text-xs text-foreground">
            {t("actions.archive")}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
