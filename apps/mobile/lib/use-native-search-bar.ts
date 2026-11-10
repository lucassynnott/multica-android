/**
 * Search state for a picker sheet.
 *
 * iOS: wires a native `UISearchController` (react-native-screens
 * `headerSearchBarOptions`) into the route's header. The Stack.Screen must
 * register `headerShown: true` + a `title` in the layout.
 *
 * Android: react-native-screens builds no toolbar for a formSheet screen, so
 * the header — title and search bar included — never renders and the query
 * could not be typed at all. There the route renders `<PickerSearchField>`
 * (components/ui/picker-search-field.tsx) above its list, driven by the same
 * state this hook returns.
 *
 * Why a hook rather than inlining `setOptions` in every route:
 *   - Cancel button contract: `cancelSearch()` clears the native text but
 *     does NOT fire `onChangeText`, so the query has to be reset in
 *     `onCancelButtonPress`. Easy to forget when copy-pasted.
 *   - Sensible defaults (autoCapitalize: "none", hideWhenScrolling: false)
 *     match the standard iOS picker pattern; one place to revise.
 */
import { useLayoutEffect, useState } from "react";
import { Platform } from "react-native";
import { useNavigation } from "expo-router";
import type { NativeSyntheticEvent, TextInputFocusEventData } from "react-native";

export interface PickerSearch {
  query: string;
  setQuery: (next: string) => void;
  placeholder: string;
  /** True when the native header search bar owns the input (iOS). */
  native: boolean;
}

export function usePickerSearch(
  placeholder: string,
  options?: { autoFocus?: boolean },
): PickerSearch {
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const autoFocus = options?.autoFocus;
  const native = Platform.OS === "ios";

  useLayoutEffect(() => {
    if (!native) return;
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder,
        autoCapitalize: "none",
        hideWhenScrolling: false,
        // Opt-in: pickers whose primary action is typing (assignee, label,
        // project, lead) set this so the keyboard appears on mount. Apple
        // HIG cautions against auto-keyboard for browse-first lists; pass
        // `autoFocus: true` only when the picker is search-first.
        autoFocus,
        onChangeText: (e: NativeSyntheticEvent<TextInputFocusEventData>) =>
          setQuery(e.nativeEvent.text),
        onCancelButtonPress: () => setQuery(""),
      },
    });
  }, [navigation, placeholder, autoFocus, native]);

  return { query, setQuery, placeholder, native };
}
