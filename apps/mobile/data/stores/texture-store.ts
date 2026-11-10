/**
 * Whether the animated background texture (components/ui/tide-texture.tsx)
 * is shown. A display preference, so it lives in a client store and is
 * persisted the same way as the theme preference.
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "background-texture";

interface TextureState {
  enabled: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
}

export const useTextureStore = create<TextureState>((set) => ({
  enabled: true,
  hydrate: async () => {
    const saved = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
    if (saved === "off") set({ enabled: false });
  },
  setEnabled: (enabled) => {
    set({ enabled });
    void SecureStore.setItemAsync(STORAGE_KEY, enabled ? "on" : "off").catch(
      () => {},
    );
  },
}));
