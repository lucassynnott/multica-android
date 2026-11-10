/**
 * In-body search field for picker sheets on platforms where the native
 * header search bar does not exist (Android formSheets have no toolbar).
 * Renders nothing when the native bar owns the input. See
 * `lib/use-native-search-bar.ts`.
 *
 * Not auto-focused: the sheet opens at its lower detent, and raising the
 * keyboard immediately would cover most of a list people often just scan.
 */
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PickerSearch } from "@/lib/use-native-search-bar";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useT } from "@/lib/i18n";

export function PickerSearchField({ search }: { search: PickerSearch }) {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme];
  const { t } = useT("issues");
  if (search.native) return null;
  return (
    <View className="px-5 pb-2 pt-4">
      <View className="h-11 flex-row items-center gap-2 rounded-lg border border-border bg-card px-3">
        <Ionicons name="search" size={16} color={theme.mutedForeground} />
        <TextInput
          value={search.query}
          onChangeText={search.setQuery}
          placeholder={search.placeholder}
          placeholderTextColor={theme.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={search.placeholder}
          // Size is inline, not a `text-*` class: NativeWind adds a
          // lineHeight with those, which clips descenders in a TextInput.
          style={{ fontSize: 15 }}
          className="h-11 flex-1 p-0 font-sans text-foreground"
        />
        {search.query.length > 0 ? (
          <Pressable
            onPress={() => search.setQuery("")}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("picker.clear")}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.mutedForeground}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
