/**
 * Bottom-sheet renderer for `showActionSheetWithOptions` on Android.
 *
 * Mounted once in the root layout. Graphite: a dimmed backdrop and one panel
 * with a top hairline, holding plain left-aligned 52dp rows on the 20dp gutter
 * with hairlines between them — the same row language as the More screen. The
 * cancel action stays last and muted, destructive actions use the destructive
 * ink. NativeWind tokens keep light/dark automatic.
 */
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import {
  setActionSheetPresenter,
  type ActionSheetRequest,
} from "@/lib/action-sheet";

export function ActionSheetHost() {
  const [request, setRequest] = useState<ActionSheetRequest | null>(null);
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const muted = THEME[colorScheme].mutedForeground;
  const ripple = THEME[colorScheme].secondary;
  // `useWindowDimensions()` reports the whole window, which under
  // edge-to-edge includes the system bars — measured on a Fold 8 canvas it put
  // the panel bottom below the visible edge and pushed the Cancel row off
  // screen. Measure the modal's own box instead and cap against that.
  const { height: windowHeight } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(0);
  const availableHeight = containerHeight > 0 ? containerHeight : windowHeight;
  const panelMaxHeight = Math.round(availableHeight * 0.86);
  // The panel's own bottom padding sits inside `maxHeight`: keep it in mind
  // when sizing, it clips the last child if the panel is capped exactly.
  const bottomPadding = Math.max(insets.bottom, 16) + 8;
  // Explicit height on the list is what actually clips in RN; `maxHeight` on
  // a ScrollView and `flex: 1` both let the content keep its natural height,
  // which pushed everything below it past the panel edge.
  //
  // The header is measured, not assumed. It used to be budgeted as a fixed
  // 64dp, which is only right for a one-line title over a one-line message:
  // a board card's sheet passes the issue title as the message, and a title
  // that wrapped made the header taller than its budget, so the fixed-height
  // panel clipped the last rows — they painted partly but took no taps. A
  // sheet with no title at all had the opposite problem, 64dp of dead space.
  const [headerHeight, setHeaderHeight] = useState(0);
  const hasHeader = !!(request?.title || request?.message);
  const headerBlock = hasHeader ? headerHeight : 0;
  const listBudget = Math.max(120, panelMaxHeight - headerBlock - bottomPadding);
  const [contentHeight, setContentHeight] = useState(0);
  const listHeight =
    contentHeight > 0 ? Math.min(contentHeight, listBudget) : listBudget;

  useEffect(() => {
    setActionSheetPresenter(setRequest);
    return () => setActionSheetPresenter(null);
  }, []);

  const dismiss = useCallback(
    (index: number) => {
      const current = request;
      setRequest(null);
      // Let the modal start closing before navigation runs, so a push from
      // the callback does not animate under a still-visible sheet.
      requestAnimationFrame(() => current?.callback(index));
    },
    [request],
  );

  const cancelIndex = request?.cancelButtonIndex ?? -1;


  return (
    <Modal
      visible={!!request}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => dismiss(cancelIndex)}
    >
      <View
        className="flex-1 justify-end"
        onLayout={(event) =>
          setContainerHeight(event.nativeEvent.layout.height)
        }
      >
        <Pressable
          className="absolute inset-0 bg-black/40"
          onPress={() => dismiss(cancelIndex)}
        />
        <View
          className="bg-background border-t border-border rounded-t-xl overflow-hidden"
          style={{
            // Pin the panel's layout box to its visible content: a merely
            // `maxHeight`-capped panel lets children paint below the box on
            // Android, where they receive no touches.
            height: Math.min(
              panelMaxHeight,
              listHeight + headerBlock + bottomPadding,
            ),
            paddingBottom: bottomPadding,
            // A phone-width sheet centred on the unfolded canvas, instead of
            // centred labels stretched across 970dp.
            width: "100%",
            maxWidth: 520,
            alignSelf: "center",
          }}
        >
          {request?.title || request?.message ? (
            <View
              className="pl-5 pr-14 pt-4 pb-3 gap-0.5 relative border-b border-border"
              onLayout={(event) =>
                setHeaderHeight(event.nativeEvent.layout.height)
              }
            >
              {request.title ? (
                <Text
                  className="text-[15px] leading-[21px] font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {request.title}
                </Text>
              ) : null}
              {request.message ? (
                <Text
                  className="text-[13px] text-muted-foreground"
                  numberOfLines={2}
                >
                  {request.message}
                </Text>
              ) : null}
              {cancelIndex >= 0 ? (
                // Taps near the very bottom edge of the sheet proved
                // unreliable on Android (the rows paint but the touch target
                // does not take). A close control in the header gives the
                // sheet a dismiss affordance that is always reachable; the
                // backdrop and the system back button still work too.
                <Pressable
                  onPress={() => dismiss(cancelIndex)}
                  hitSlop={12}
                  className="absolute right-1 top-1 size-11 items-center justify-center"
                  accessibilityLabel={request.options[cancelIndex]}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={20} color={muted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ScrollView
            bounces={false}
            style={{ height: listHeight }}
            onContentSizeChange={(_w, h) => setContentHeight(h)}
          >
            {request?.options.map((label, index) => {
              const destructive = request.destructiveButtonIndex === index;
              const cancel = index === cancelIndex;
              const last = index === request.options.length - 1;
              return (
                <Pressable
                  key={`${label}-${index}`}
                  onPress={() => dismiss(index)}
                  accessibilityRole="button"
                  android_ripple={{ color: ripple }}
                  className={
                    last
                      ? "px-5 min-h-[52px] justify-center"
                      : "px-5 min-h-[52px] justify-center border-b border-border"
                  }
                >
                  <Text
                    numberOfLines={2}
                    className={
                      destructive
                        ? "text-[15px] leading-[21px] text-destructive"
                        : cancel
                          ? "text-[15px] leading-[21px] text-muted-foreground"
                          : "text-[15px] leading-[21px] text-foreground"
                    }
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}
