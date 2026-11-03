/**
 * Bottom-sheet renderer for `showActionSheetWithOptions` on Android.
 *
 * Mounted once in the root layout. Keeps the visual language of the iOS
 * native sheet: dimmed backdrop, one rounded panel, a scrolling list of
 * actions with the cancel action last, destructive actions in the destructive
 * colour. Native Wind tokens keep light/dark automatic.
 */
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import {
  setActionSheetPresenter,
  type ActionSheetRequest,
} from "@/lib/action-sheet";

export function ActionSheetHost() {
  const [request, setRequest] = useState<ActionSheetRequest | null>(null);
  const insets = useSafeAreaInsets();
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
  // which pushed everything below it past the panel edge. Every option —
  // Cancel included — lives inside this one list, so there is no pinned row
  // to lose. Budget the title block and the panel padding only.
  const TITLE_BLOCK_HEIGHT = 64;
  const listBudget = Math.max(
    120,
    panelMaxHeight - TITLE_BLOCK_HEIGHT - bottomPadding,
  );
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
          className="bg-background border-t border-border rounded-t-2xl overflow-hidden"
          style={{
            // Pin the panel's layout box to its visible content. Leaving it
            // merely `maxHeight`-capped let the children paint below the box
            // on Android: rows were visible but received no touches near the
            // bottom of the sheet.
            height: Math.min(
              panelMaxHeight,
              listHeight + TITLE_BLOCK_HEIGHT + bottomPadding,
            ),
            paddingBottom: bottomPadding,
          }}
        >
          {request?.title || request?.message ? (
            <View className="px-4 pt-4 pb-2 items-center gap-1 relative">
              {request.title ? (
                <Text className="text-sm font-semibold text-foreground text-center">
                  {request.title}
                </Text>
              ) : null}
              {request.message ? (
                <Text className="text-xs text-muted-foreground text-center">
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
                  className="absolute right-0 top-2 p-3"
                  accessibilityLabel={request.options[cancelIndex]}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={20} color="#71717a" />
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
              return (
                <Pressable
                  key={`${label}-${index}`}
                  onPress={() => dismiss(index)}
                  className="px-4 py-3.5 border-b border-border active:bg-secondary"
                >
                  <Text
                    className={
                      destructive
                        ? "text-base text-destructive text-center"
                        : "text-base text-foreground text-center"
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
