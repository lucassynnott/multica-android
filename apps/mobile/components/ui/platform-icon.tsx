/**
 * Cross-platform icon for the places that were written against SF Symbols.
 *
 * `expo-image` renders `"sf:<name>"` on iOS only — on Android it resolves to
 * nothing, which left the tab bar and the More menu with invisible icons.
 * Rather than swap the iOS artwork (the design was built on SF Symbols and
 * its metrics), keep the SF source on iOS and map the same concept to an
 * Ionicons glyph on Android, which ships with @expo/vector-icons and needs
 * no extra native module.
 */
import { Platform, View, type ColorValue } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface Props {
  /** SF Symbol name without the `sf:` prefix, e.g. "tray.fill". */
  sf: string;
  /** Ionicons equivalent used on Android. */
  ion: IoniconName;
  color: ColorValue;
  size: number;
}

export function PlatformIcon({ sf, ion, color, size }: Props) {
  if (Platform.OS === "ios") {
    return (
      <Image source={`sf:${sf}`} style={{ width: size, height: size, color }} />
    );
  }
  // A fixed box with the glyph's line height pinned to its size. The material
  // bottom bar squeezes whatever height it is handed, and a bare `Ionicons`
  // Text happily shrinks with it — at six tabs on the cover screen the glyph
  // collapsed to a thin sliver. An explicit box plus `flexShrink: 0` keeps the
  // icon at its designed size in every bar layout.
  return (
    <View
      style={{
        width: size,
        height: Math.round(size * 1.3),
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons
        name={ion}
        size={size}
        color={color}
        style={{ flexShrink: 0, lineHeight: Math.round(size * 1.3) }}
      />
    </View>
  );
}
