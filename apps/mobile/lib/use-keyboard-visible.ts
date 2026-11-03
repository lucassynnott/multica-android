import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * True while the software keyboard is on screen.
 *
 * Auth forms are centred when there is room and top-anchored when the keyboard
 * takes the bottom half: centring alone keeps the field visible but pushes the
 * submit button under the keypad on the Fold 8 cover geometry (467x737 dp).
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
