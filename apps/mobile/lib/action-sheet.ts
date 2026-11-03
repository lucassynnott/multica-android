/**
 * Cross-platform action sheet.
 *
 * Every menu in this app was written against `ActionSheetIOS`, which is an
 * iOS-only export of react-native — on Android the import is undefined and
 * tapping "…" crashed. This module keeps the exact call signature those call
 * sites already use, so the migration is one import swap per file:
 *
 *   - import { ActionSheetIOS } from "react-native";
 *   + import { ActionSheet } from "@/lib/action-sheet";
 *
 * On iOS it delegates to the native sheet (unchanged behaviour). On Android —
 * and anywhere ActionSheetIOS is unavailable — it renders the same list in a
 * bottom sheet drawn by `<ActionSheetHost />`, mounted once in the root
 * layout. Both paths report the tapped index through the same callback, and
 * both report the cancel index when dismissed.
 */
import { ActionSheetIOS, Platform } from "react-native";

export interface ActionSheetOptions {
  title?: string;
  message?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
  /** Android only: anchored popover origin. Ignored on iOS. */
  anchor?: number;
}

export type ActionSheetCallback = (buttonIndex: number) => void;

export interface ActionSheetRequest {
  title?: string;
  message?: string;
  options: string[];
  cancelButtonIndex: number;
  destructiveButtonIndex?: number;
  callback: ActionSheetCallback;
}

type Presenter = (request: ActionSheetRequest | null) => void;

let presenter: Presenter | null = null;

/** Called by the host component on mount. Internal. */
export function setActionSheetPresenter(next: Presenter | null) {
  presenter = next;
}

export function hasNativeActionSheet(): boolean {
  return Platform.OS === "ios" && !!ActionSheetIOS?.showActionSheetWithOptions;
}

export function showActionSheetWithOptions(
  options: ActionSheetOptions,
  callback: ActionSheetCallback,
) {
  const cancelButtonIndex =
    options.cancelButtonIndex ?? findCancelIndex(options.options);

  if (hasNativeActionSheet()) {
    ActionSheetIOS.showActionSheetWithOptions(
      { ...options, cancelButtonIndex },
      callback,
    );
    return;
  }

  if (presenter) {
    presenter({
      title: options.title,
      message: options.message,
      options: options.options,
      cancelButtonIndex,
      destructiveButtonIndex: options.destructiveButtonIndex,
      callback,
    });
    return;
  }

  // No host mounted (unit tests, or a screen rendered outside the app shell):
  // treat the interaction as cancelled rather than throwing.
  callback(cancelButtonIndex);
}

/** Same shape as `ActionSheetIOS`, so existing call sites read unchanged. */
export const ActionSheet = { showActionSheetWithOptions };

function findCancelIndex(options: string[]): number {
  const index = options.findIndex((label) => /^cancel$/i.test(label.trim()));
  return index === -1 ? options.length - 1 : index;
}
