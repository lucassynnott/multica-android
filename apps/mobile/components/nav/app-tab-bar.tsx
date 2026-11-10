/**
 * The app's own tab bar, replacing React Navigation's.
 *
 * Why hand-rolled: at the cover screen's 467dp the material bar mislays its
 * content, and the bundled bar can't show a rail and a bottom bar from one
 * stable component (swapping `tabBarVariant` rebuilt the tree and reset the
 * selected tab on every fold). One component that lays itself out either way
 * fixes both: the navigator tree never changes, only the flex direction.
 *
 * Graphite (DESIGN.md, mockups AppMore / AppUnfolded): five destinations,
 * each an icon over a 12dp label. The selected one is foreground ink at 600,
 * the others muted — no pill, no fill, no accent. The bar has a top hairline;
 * the rail has a right hairline and is 72dp wide.
 *
 * The rail also carries the app's primary action: a 40dp vermilion "New
 * issue" tile above the destinations. The bottom bar has no such tile — on
 * compact widths the same action is the header's tile
 * (`components/ui/app-header-actions.tsx`).
 *
 * The geometry constants are exported so anything that has to line up with
 * the bar (anchored popovers, content insets) reads the same numbers.
 */
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ColorValue } from "react-native";
import { Text } from "@/components/ui/text";

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface TabItem {
  /** Route name; must match a `Tabs.Screen`. */
  name: string;
  label: string;
  ion: [off: IoniconName, on: IoniconName];
  sf: [off: string, on: string];
  /**
   * Drawn glyph that replaces the Ionicon. `board` is the three uneven
   * columns from the mockups, which no icon font carries.
   */
  glyph?: "board";
  badge?: number;
}

interface Props {
  items: TabItem[];
  activeIndex: number;
  compact: boolean;
  onPress: (index: number) => void;
  background: string;
  border: string;
  foreground: string;
  muted: ColorValue;
  /** Accent fill: unread badges and the rail's New issue tile. */
  brand: string;
  /** Ink on the accent fill. */
  brandForeground: string;
  /** Press feedback colour (one surface step above the bar). */
  ripple: string;
  /** Rail only: the primary action above the destinations. */
  onNewIssue?: () => void;
  newIssueLabel?: string;
}

export const RAIL_WIDTH = 72;
export const RAIL_ITEM_HEIGHT = 60;
export const RAIL_ITEM_GAP = 4;
/**
 * Above the New issue tile, below the status bar. 8dp puts the tile's centre
 * on the centre line of the 64dp screen header beside it.
 */
export const RAIL_PADDING_TOP = 8;
/** Touch box of the rail's New issue tile, and the gap under it. */
export const RAIL_ACTION_SIZE = 48;
export const RAIL_ACTION_GAP = 14;
/** Content height of the bottom bar, excluding the system inset below it. */
export const BAR_HEIGHT = 64;

const ICON_SIZE = 22;
const ICON_BOX_WIDTH = 32;

/**
 * The strip the bottom bar keeps clear for the system gesture pill.
 *
 * Never trust a negative or zero inset: `wm size` overrides, multi-window and
 * some OEM skins report a bottom inset of 0 (or below) while still drawing
 * the pill, which then lands on the labels. 12dp is the pill's own height
 * plus its gap; devices that report a real inset already exceed it.
 */
export function tabBarBottomInset(reported: number): number {
  return Math.max(reported, 12);
}

export function AppTabBar({
  items,
  activeIndex,
  compact,
  onPress,
  background,
  border,
  foreground,
  muted,
  brand,
  brandForeground,
  ripple,
  onNewIssue,
  newIssueLabel,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomInset = tabBarBottomInset(insets.bottom);

  const container = compact
    ? {
        flexDirection: "row" as const,
        height: BAR_HEIGHT + bottomInset,
        paddingBottom: bottomInset,
        borderTopWidth: 1,
        borderTopColor: border,
        backgroundColor: background,
      }
    : {
        width: RAIL_WIDTH,
        // The rail is flush to the top of the window, so it owns the
        // status-bar strip itself.
        paddingTop: RAIL_PADDING_TOP + Math.max(insets.top, 0),
        alignItems: "center" as const,
        gap: RAIL_ITEM_GAP,
        borderRightWidth: 1,
        borderRightColor: border,
        backgroundColor: background,
      };

  return (
    <View style={container} accessibilityRole="tablist">
      {/* Rail only. It is a sibling of the destinations inside this one
          component, so showing or hiding it on a fold is still a relayout of
          the bar and never touches the navigator. */}
      {!compact && onNewIssue ? (
        <Pressable
          key="new-issue"
          onPress={onNewIssue}
          accessibilityRole="button"
          accessibilityLabel={newIssueLabel}
          style={({ pressed }) => ({
            width: RAIL_ACTION_SIZE,
            height: RAIL_ACTION_SIZE,
            marginBottom: RAIL_ACTION_GAP - RAIL_ITEM_GAP,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            className="rounded-lg"
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: brand,
            }}
          >
            <Ionicons name="add" size={22} color={brandForeground} />
          </View>
        </Pressable>
      ) : null}

      {items.map((item, index) => {
        const focused = index === activeIndex;
        const color = focused ? foreground : muted;
        const badge = item.badge
          ? item.badge > 99
            ? "99+"
            : String(item.badge)
          : null;
        return (
          <Pressable
            key={item.name}
            onPress={() => onPress(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              badge ? `${item.label}, ${badge}` : item.label
            }
            android_ripple={{ color: ripple, borderless: true, radius: 36 }}
            style={
              compact
                ? {
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                  }
                : {
                    width: RAIL_WIDTH,
                    height: RAIL_ITEM_HEIGHT,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                  }
            }
          >
            <View
              style={{
                width: ICON_BOX_WIDTH,
                height: ICON_SIZE,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.glyph === "board" ? (
                <BoardGlyph color={color} />
              ) : (
                <Ionicons
                  name={focused ? item.ion[1] : item.ion[0]}
                  size={ICON_SIZE}
                  color={color as string}
                />
              )}
              {badge ? (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -4,
                    left: ICON_BOX_WIDTH / 2 + 4,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: badge.length > 1 ? 4 : 0,
                    borderRadius: 8,
                    backgroundColor: brand,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    numberOfLines={1}
                    className="font-mono font-medium"
                    style={{
                      color: brandForeground,
                      fontSize: 10,
                      lineHeight: 14,
                      includeFontPadding: false,
                      textAlign: "center",
                    }}
                  >
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              // Labels are navigation chrome sized to a fixed bar: letting the
              // system font scale grow them clips the row instead of helping.
              maxFontSizeMultiplier={1.2}
              // Weight goes through the class, not `fontWeight`: the class is
              // what selects the real 600 font file.
              className={focused ? "text-xs font-semibold" : "text-xs"}
              style={{
                includeFontPadding: false,
                paddingHorizontal: 2,
                color,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Three columns of uneven length hanging from one top edge — a kanban board
 * at a glance. Drawn with views because it is three strokes and no icon font
 * has it; stroke weight matches the outline icons beside it.
 */
function BoardGlyph({ color }: { color: ColorValue }) {
  const stroke = 1.75;
  return (
    <View
      style={{
        width: ICON_SIZE,
        height: ICON_SIZE,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 4,
        paddingVertical: 3,
      }}
    >
      {[16, 10, 13].map((height, i) => (
        <View
          key={i}
          style={{
            width: stroke,
            height,
            borderRadius: stroke / 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}
