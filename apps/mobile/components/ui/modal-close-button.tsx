/**
 * Close icon (✕) rendered in the modal Stack header.
 *
 * A plain glyph on a 44dp target: Graphite has no filled icon buttons
 * except a screen's primary action, so the old filled circle is gone. The
 * pressed state is the shared ghost-button one (`bg-secondary`).
 *
 * Used by `[workspace]/_layout.tsx` for the new-issue, search, and
 * new-comment modals.
 */
import { router } from "expo-router";
import { IconButton } from "@/components/ui/icon-button";
import { useT } from "@/lib/i18n";

export function ModalCloseButton() {
  const { t } = useT();
  return (
    <IconButton
      name="close"
      iconSize={22}
      className="size-11"
      hitSlop={4}
      onPress={() => router.back()}
      accessibilityLabel={t("common:actions.close")}
    />
  );
}
