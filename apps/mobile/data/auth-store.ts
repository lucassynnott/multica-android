/**
 * Mobile auth store — Zustand. Logic mirrors packages/core/auth/store.ts:
 *   - Token written ONLY on successful verifyCode
 *   - 401 → clear token; non-401 (5xx / network blip) → preserve token so
 *     the next launch can retry
 *   - logout = clear token + clear in-memory user + setToken(null)
 *
 * NOT shared with web/desktop (per Sharing Principles in root CLAUDE.md).
 * Storage backend is expo-secure-store (mobile only); web uses HttpOnly
 * cookies, desktop uses localStorage via StorageAdapter.
 */
import { create } from "zustand";
import type { User } from "@multica/core/types";
import { api, ApiError } from "./api";
import { clearToken, getToken, setToken } from "./secure-storage";
import { invalidateSessionEpoch } from "./session-epoch";
import { queryClient } from "./query-client";
import { useWorkspaceStore } from "./workspace-store";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  sendCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  /** Overwrite the in-memory user — call after PATCH /api/me so name/avatar
   *  edits land without a refetch. Server response is the source of truth. */
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  initialize: async () => {
    // Restore the persisted workspace slug alongside the auth token so the
    // entry redirect (app/index.tsx) can route directly to the last-used
    // workspace without flashing /select-workspace.
    await useWorkspaceStore.getState().restoreSlug();

    let token = await getToken();
    // Android/emulator test builds only: seed a session from the developer
    // environment so a fresh install can be driven without the email OTP
    // round-trip. Compiled out of release builds (`__DEV__` is false) and a
    // no-op whenever the variable is unset.
    //
    // The seeded value is a personal access token (`mul_…`), and the server
    // refuses to renew anything that is not an interactive session JWT
    // (server/internal/handler/session.go:61) — so `POST /api/auth/refresh`
    // answers 400 while this bootstrap is in use and session renewal stays
    // deferred. That is expected here, not a bug: everything else works
    // because the PAT authenticates normally at the middleware. A real
    // sign-in via verifyCode produces a refreshable JWT.
    if (!token && __DEV__ && process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN) {
      token = process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN;
      await setToken(token);
    }
    if (!token) {
      set({ isLoading: false });
      return;
    }
    api.setToken(token);
    try {
      const user = await api.getMe();
      set({ user, isLoading: false });
    } catch (err) {
      // Only clear token on a genuine 401. Network blips / 5xx keep the
      // token so the next launch (or a manual refresh) can retry.
      if (err instanceof ApiError && err.status === 401) {
        // Synchronous first, before the awaited delete: anything already
        // in flight has to learn the credential is dead now, not once the
        // Keychain write lands.
        invalidateSessionEpoch();
        await clearToken();
        api.setToken(null);
      }
      set({ user: null, isLoading: false });
    }
  },

  sendCode: async (email) => {
    await api.sendCode(email);
  },

  verifyCode: async (email, code) => {
    const { token, user } = await api.verifyCode(email, code);
    // Signing in replaces the credential just as decisively as signing out:
    // a renewal still in flight for the previous account must not write its
    // result over this one.
    invalidateSessionEpoch();
    await setToken(token);
    api.setToken(token);
    set({ user });
    return user;
  },

  logout: async () => {
    // First statement in the function, before any await. The Keychain delete
    // below is async, so until it lands a concurrent read still returns the
    // token being removed — the epoch is what makes this instant.
    invalidateSessionEpoch();
    await clearToken();
    api.setToken(null);
    // Every sign-out path ends here, so this is where the previous account's
    // data is dropped. Only the 401 handler used to clear the cache; a manual
    // sign-out kept the inbox, chat and workspace lists in memory, and the
    // next account to sign in on the device was shown them until a refetch.
    await useWorkspaceStore.getState().clear();
    queryClient.clear();
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
