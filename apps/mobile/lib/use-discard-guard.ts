/**
 * Confirm before a dirty form is left by the system back button or gesture.
 *
 * The form screens put their "Discard changes?" alert on the header's Cancel
 * button, which is the only way out of an iOS modal. Android has two more —
 * the hardware/gesture back and the toolbar arrow — and both popped the
 * screen straight away, dropping whatever had been typed.
 *
 * Returns `leave()`: call it instead of `router.back()` from the screen's own
 * exits (after a save, or once the user confirmed in the Cancel alert) so
 * the guard does not ask a second time.
 *
 * Android only: on iOS the native stack performs a swipe dismissal before JS
 * can veto it, and the header Cancel button already covers that platform.
 */
import { useCallback, useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { router, useNavigation } from "expo-router";

interface Copy {
  title: string;
  message: string;
  keep: string;
  discard: string;
}

export function useDiscardGuard(dirty: boolean, copy: Copy): () => void {
  const navigation = useNavigation();
  const allowRef = useRef(false);
  const copyRef = useRef(copy);
  useEffect(() => {
    copyRef.current = copy;
  });

  useEffect(() => {
    if (Platform.OS !== "android" || !dirty) return;
    return navigation.addListener("beforeRemove", (event) => {
      if (allowRef.current) return;
      event.preventDefault();
      const { title, message, keep, discard } = copyRef.current;
      Alert.alert(title, message, [
        { text: keep, style: "cancel" },
        {
          text: discard,
          style: "destructive",
          onPress: () => {
            allowRef.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });
  }, [navigation, dirty]);

  return useCallback(() => {
    allowRef.current = true;
    router.back();
  }, []);
}
