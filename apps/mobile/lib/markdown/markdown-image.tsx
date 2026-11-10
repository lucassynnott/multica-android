/**
 * Block-level image with real aspect ratio + tap-to-lightbox.
 *
 *   - Aspect ratio detection uses RN's `Image.getSize` (cross-platform,
 *     network-friendly). While dimensions resolve we lay out at 16:9 as
 *     a placeholder — same width-100% so the surrounding flow is stable
 *     and only the height shifts once the real ratio lands.
 *   - Rendering uses `expo-image` for on-disk caching + smooth fade-in
 *     transition.
 *   - Tap dispatches into the global LightboxProvider for fullscreen
 *     viewing with pinch-zoom + swipe-down-to-dismiss.
 *
 * URI resolution: markdown content authored in Multica stores image
 * references using the internal `mc://file/<id>` scheme rather than
 * baking signed HTTPS URLs into the content (signed URLs expire). iOS
 * doesn't understand `mc://`, so we look the URI up in the supplied
 * `attachments` list and swap it for the matching `download_url` before
 * passing to any image API. Unmatched URIs fall through unchanged —
 * external https links and well-known schemes load directly; an
 * unknown reference fails the getSize callback and we fall back to a
 * 16:9 placeholder slot.
 *
 * Size cap: the image never renders wider than 420dp or taller than 360dp.
 * Without it a phone screenshot in a chat reply fills the whole unfolded
 * screen (the column there is 760dp wide, so a 9:19 image would be 1600dp
 * tall). The box keeps the image's real aspect ratio, so nothing is cropped
 * or letterboxed; the lightbox still shows it full size.
 *
 * Cancellation: a content re-render that swaps the URI must not let the
 * previous getSize callback overwrite state — guard with a `cancelled`
 * flag in the cleanup path.
 */
import { useEffect, useMemo, useState } from "react";
import { Image as RNImage, Pressable, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import type { Attachment } from "@multica/core/types";
import { matchAttachmentByURL } from "@multica/core/attachments/image-sequence";
import { resolveAttachmentUrl } from "@/lib/attachment-url";
import { useLightbox } from "./lightbox-provider";
import { useImageSequence } from "./image-sequence";

const MAX_WIDTH = 420;
const MAX_HEIGHT = 360;
/** Narrower than this, the height cap binds before the width cap does. */
const TALL_ASPECT = MAX_WIDTH / MAX_HEIGHT;

interface Props {
  uri: string;
  alt?: string;
  attachments?: Attachment[];
}

export function MarkdownImage({ uri, alt, attachments }: Props) {
  const { open } = useLightbox();
  const sequence = useImageSequence();
  const [aspect, setAspect] = useState<number | null>(null);

  const resolvedUri = useMemo(() => {
    // mc://file/<id> → look up the matching attachment's loadable URL.
    // No match (external link, html https URL, or unresolved mc://) falls
    // through to the original uri.
    //
    // `matchAttachmentByURL` + this URL pick are the ones the shared sequence
    // builder uses, so the URI a tap reports is byte-identical to the one
    // `ImageSequenceProvider` put in the array — otherwise the lightbox could
    // not find its position and would silently drop back to a single image.
    const match = matchAttachmentByURL(uri, attachments);
    const candidate: string | null | undefined = match
      ? match.download_url || match.markdown_url || match.url
      : uri;
    // The backend may return a server-relative `download_url` (e.g.
    // `/api/attachments/{id}/download`) when no CloudFront signer is
    // configured — see MUL-2976. RN's image loader has no document
    // origin to resolve against, so prepend `EXPO_PUBLIC_API_URL` for
    // server-relative paths and let absolute URLs / external links pass
    // through unchanged.
    return resolveAttachmentUrl(candidate) ?? uri;
  }, [uri, attachments]);

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      resolvedUri,
      (w, h) => {
        if (cancelled || !w || !h) return;
        setAspect(w / h);
      },
      () => {
        // Network failure / decode failure / 404 / unknown URI scheme
        // (e.g. unresolved mc://) — keep the 16:9 fallback so the slot
        // still shows the muted background instead of collapsing.
        if (!cancelled) setAspect(16 / 9);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [resolvedUri]);

  const ratio = aspect ?? 16 / 9;
  // Wide or square: fill the column up to MAX_WIDTH, height follows the
  // ratio and cannot pass MAX_HEIGHT. Tall: pin the height to MAX_HEIGHT and
  // let the width follow; `maxWidth: "100%"` only matters inside a bubble
  // narrower than that derived width.
  const boxStyle =
    ratio >= TALL_ASPECT
      ? ({ width: "100%", maxWidth: MAX_WIDTH, aspectRatio: ratio } as const)
      : ({ height: MAX_HEIGHT, maxWidth: "100%", aspectRatio: ratio } as const);

  return (
    <Pressable
      onPress={() => open(resolvedUri, sequence)}
      accessibilityRole="imagebutton"
      accessibilityLabel={alt || undefined}
      style={[{ alignSelf: "flex-start" }, boxStyle]}
    >
      <View className="flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <ExpoImage
          source={{ uri: resolvedUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          transition={150}
        />
      </View>
    </Pressable>
  );
}
