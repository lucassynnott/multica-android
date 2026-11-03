/**
 * The app's own tab bar, replacing React Navigation's.
 *
 * Why hand-rolled: with six destinations at the cover screen's 467dp the
 * material bar mislays its content — labels disappear, and the icon row ends
 * up under the system gesture pill with the glyphs cropped to a strip. The
 * bundled bar also can't show a rail and a bottom bar from one stable
 * component (swapping `tabBarVariant` rebuilt the tree and reset the selected
 * tab on every fold). One component that lays itself out either way fixes
 * both: the tree never changes, only the flex direction.
 *
 * Geometry follows the rest of the app's spacing: 56dp of content plus the
 * real bottom inset, 22dp glyphs, 10px labels, 8dp between icon and label.
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
  brand: string;
  /** "More" never navigates — it opens the overflow menu. */
  actionIndex?: number;
  onAction?: () => void;
}

export const RAIL_WIDTH = 88;

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
  actionIndex,
  onAction,
}: Props) {
  // Under edge-to-edge the window extends behind the system gesture bar, so
  // the bar has to reserve that strip itself. The height below matches what
  // the navigator reserves (declared in the tabs layout) — if the two
  // disagree, the content is either clipped or pushed under the pill.
  const insets = useSafeAreaInsets();
  // `wm size` overrides and multi-window set-ups can make the reported bottom
  // inset negative (the virtual window is taller than the display it is
  // mapped onto). Feeding that into a height clips the icon row to nothing,
  // which is exactly how this bar broke during testing: labels survived, the
  // glyphs above them were cut away. Never trust a negative inset.
  //
  // A floor, not just a clamp: `wm size` geometry (and some OEM skins) report
  // a bottom inset of exactly 0 while still drawing the gesture pill. With no
  // reserved strip the pill then lands on the label baseline — verified on the
  // Fold 8 cover geometry, where the pill crossed "Board" and "Projects".
  // 12 dp is the pill's own height plus its gap; devices that report a real
  // inset are unaffected because the max() already exceeds it.
  const bottomInset = Math.max(insets.bottom, 12);
  const glyph = compact ? 22 : 24;
  // Badge anchors to the *item*, not to the icon row: Android clips children
  // to their parent's bounds (there is no overflow:visible), so a badge hung
  // off the 22-pt icon row lost its top half. The item is the tallest box the
  // badge can legally live in.
  const badgeTop = compact ? (56 + bottomInset) / 2 - 24 : 8;

  const container = compact
    ? {
        flexDirection: "row" as const,
        // Height only, no padding: an inset-driven `paddingBottom` shrinks the
        // content box and crops the glyphs (verified — icons came back as thin
        // slivers). With the real device inset reported, 56 + inset already
        // clears the gesture pill.
        height: 56 + bottomInset,
        borderTopWidth: 1,
        borderTopColor: border,
        backgroundColor: background,
      }
    : {
        width: RAIL_WIDTH,
        // The rail is flush to the top of the window, so it owns the status-bar
        // strip itself — without it the first item's badge lands on the clock.
        paddingTop: 16 + Math.max(insets.top, 0),
        gap: 4,
        borderRightWidth: 1,
        borderRightColor: border,
        backgroundColor: background,
      };

  const rendered = items.map((item, index) => {
        const focused = index === activeIndex;
        const color = focused ? foreground : muted;
        const isAction = index === actionIndex;
        return (
          <Pressable
            key={item.name}
            onPress={() => (isAction ? onAction?.() : onPress(index))}
            accessibilityRole="tab"
            accessibilityState={isAction ? undefined : { selected: focused }}
            accessibilityLabel={item.label}
            style={
              compact
                ? // Icon-only: no label row, so the glyph is centred in the
                  // item and the system strip below stays empty.
                  { flex: 1, alignItems: "center", justifyContent: "center" }
                : {
                    height: 64,
                    paddingVertical: 6,
                    marginHorizontal: 8,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    backgroundColor: focused ? background : "transparent",
                  }
            }
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={focused ? item.ion[1] : item.ion[0]}
                size={glyph}
                color={color as string}
              />

            </View>
            {item.badge ? (
              (() => {
                // A badge is a circle, not a pill: `minWidth` + horizontal
                // padding let the box grow wider than it is tall, so the
                // radius stopped describing a circle, and the Text carried
                // Android's default font padding, which pushed the digits
                // below the optical centre. Fixed box, no padding, no font
                // padding, lineHeight equal to the box so the cap-height
                // lands in the middle.
                const text = item.badge > 99 ? "99+" : String(item.badge);
                const size = 16;
                const capsule = text.length > 2;
                return (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      top: badgeTop,
                      left: "50%",
                      marginLeft: 2,
                      width: capsule ? 22 : size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: brand,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      numberOfLines={1}
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        lineHeight: size,
                        fontWeight: "600",
                        includeFontPadding: false,
                        // Centre the *run*, not the box: an auto-width Text is
                        // centred by its parent, which leaves the glyphs half a
                        // side-bearing to the left. An explicit width plus
                        // textAlign puts the digits on the circle's axis.
                        width: capsule ? 22 : size,
                        textAlign: "center",
                        textAlignVertical: "center",
                        letterSpacing: 0,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {text}
                    </Text>
                  </View>
                );
              })()
            ) : null}
            {!compact && (
              <Text
                numberOfLines={1}
                // The label needs an explicit line box on Android. Left to
                // itself the Text grows to the theme's line height and, inside a
                // fixed-height item, pushes the icon row out through the top of
                // the bar — the glyphs were being clipped away entirely.
                style={{
                  // Absolute, not in flow: a flow-positioned label here makes
                  // the icon glyphs stop painting on Android (the sibling-Text
                  // bug that broke this bar the first time).
                  position: "absolute",
                  bottom: 8,
                  fontSize: 10,
                  lineHeight: 12,
                  height: 14,
                  includeFontPadding: false,
                  letterSpacing: 0.1,
                  color,
                  fontWeight: focused ? "600" : "400",
                }}
              >
                {item.label}
              </Text>
            )}
          </Pressable>
        );
      });

  return <View style={container}>{rendered}</View>;
}
