import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config — replaces app.json so we can read APP_ENV at runtime
 * and switch bundleIdentifier / display name for dev / staging / production.
 *
 * APP_ENV is set by package.json scripts:
 *   - dev          → APP_ENV unset (treated as "development")
 *   - dev:staging  → APP_ENV=staging
 *   - dev:prod     → APP_ENV=production (rare; usually only for EAS build)
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const env = process.env.APP_ENV ?? "development";
  const isProd = env === "production";
  const isStaging = env === "staging";

  return {
    ...config,
    name: isProd
      ? "Multica"
      : isStaging
        ? "Multica (Staging)"
        : "Multica (Dev)",
    slug: "multica-mobile",
    version: "1.1.0",
    // Foldables (Galaxy Z Fold 8) and tablets need the full orientation set;
    // the unfolded 4:3 canvas is used in both landscape and portrait.
    orientation: "default",
    userInterfaceStyle: "automatic",
    scheme: "multica",
    // Android: built in-repo for the Z Fold 8 target. Package ids mirror the
    // iOS variant scheme so dev/staging/prod installs can coexist.
    android: {
      // Monotonic; Android refuses to install an APK over a higher code.
      // v1.0.0 shipped with the default (1).
      versionCode: 2,
      package: isProd
        ? "ai.multica.mobile"
        : isStaging
          ? "ai.multica.mobile.staging"
          : "ai.multica.mobile.dev",
      // Foldable + large-screen: resizable, no fixed aspect. The manifest
      // attributes (`resizeableActivity`, `configChanges` incl. `density`)
      // are applied by plugins/with-foldable-manifest.js — Expo's schema has
      // no key for them.
      // Fold8 cover 1248x1972 and main 1848x2448, Fold8 Ultra 2504x2256.
      //
      // CAMERA is declared here because expo-image-picker's plugin only
      // *removes* that permission when `cameraPermission: false`; it never
      // adds it for a non-false value, so a build would otherwise ask at
      // runtime for a permission the manifest does not hold.
      permissions: ["INTERNET", "ACCESS_NETWORK_STATE", "CAMERA"],
    },
    // 1024x1024 full-bleed, no-alpha source that belongs to mobile alone. Do
    // not point this back at the desktop icon (apps/desktop/build/icon.png):
    // that one is padded for macOS, and iOS would mask it a second time, which
    // is the white ring from #6995. Expo prebuild generates every required iOS
    // icon size from this single PNG.
    icon: "./assets/icon.png",
    ios: {
      // Expo keeps the top-level portrait policy for iPhone while adding all
      // iPad orientations required for multitasking when tablet support is on.
      supportsTablet: true,
      // Pins DEVELOPMENT_TEAM on every prebuild. Leaving it unset is the normal
      // path — `expo run:ios` then resolves a signing identity from the Keychain
      // itself, which is right when the Apple ID owns exactly one team. With
      // several (a personal team plus an employer's) it takes the *first*
      // identity found whenever the terminal is non-interactive, writes that
      // choice into the generated ios/, and never clears it again: prebuild only
      // writes DEVELOPMENT_TEAM when a value is present, so a project pinned to
      // the wrong team stays wrong until ios/ is deleted. Setting this re-applies
      // the intended team on every `scripts/ios-run.sh` run, which also repairs
      // an already-mispinned checkout.
      appleTeamId: process.env.EXPO_APPLE_TEAM_ID,
      // Per-variant bundle id overrides exist for one reason: an Apple ID
      // can only sign bundle prefixes it owns, so contributors not on the
      // Multica Apple Developer team (and external users self-building a
      // personal copy against production) need to swap to a reverse-domain
      // they control. Each variant has its own `_<VARIANT>` suffix and is
      // only read inside that variant's branch — a generic
      // `EXPO_BUNDLE_IDENTIFIER` would leak across variants (Expo CLI
      // auto-loads `.env.<mode>.local` regardless of APP_ENV) and collapse
      // dev / staging / prod onto a single id.
      bundleIdentifier: isProd
        ? (process.env.EXPO_BUNDLE_IDENTIFIER_PROD ?? "ai.multica.mobile")
        : isStaging
          ? (process.env.EXPO_BUNDLE_IDENTIFIER_STAGING ?? "ai.multica.mobile.staging")
          : (process.env.EXPO_BUNDLE_IDENTIFIER_DEV ?? "ai.multica.mobile.dev"),
    },
    plugins: [
      // Foldable-only manifest attributes; see plugins/with-foldable-manifest.js
      "./plugins/with-foldable-manifest",
      // NDK 29: RN 0.86 pins NDK 27, whose libc++ lacks a symbol libfbjni
      // needs at startup. See plugins/with-android-ndk.js.
      "./plugins/with-android-ndk",
      // Real upload key instead of the debug key; credentials come from
      // MULTICA_UPLOAD_* env vars. See plugins/with-release-signing.js.
      "./plugins/with-release-signing",
      "expo-router",
      // Schibsted Grotesk (UI) and JetBrains Mono (identifiers, counts, the
      // background texture). Declared as native families with per-weight
      // files so `fontFamily` + `fontWeight` pick the real cut on Android
      // instead of synthesising bold from Regular.
      [
        "expo-font",
        {
          android: {
            fonts: [
              {
                fontFamily: "Schibsted Grotesk",
                fontDefinitions: [
                  { path: "./assets/fonts/SchibstedGrotesk_400Regular.ttf", weight: 400 },
                  { path: "./assets/fonts/SchibstedGrotesk_500Medium.ttf", weight: 500 },
                  { path: "./assets/fonts/SchibstedGrotesk_600SemiBold.ttf", weight: 600 },
                  { path: "./assets/fonts/SchibstedGrotesk_700Bold.ttf", weight: 700 },
                ],
              },
              {
                fontFamily: "JetBrains Mono",
                fontDefinitions: [
                  { path: "./assets/fonts/JetBrainsMono_400Regular.ttf", weight: 400 },
                  { path: "./assets/fonts/JetBrainsMono_500Medium.ttf", weight: 500 },
                ],
              },
            ],
          },
          ios: {
            fonts: [
              "./assets/fonts/SchibstedGrotesk_400Regular.ttf",
              "./assets/fonts/SchibstedGrotesk_500Medium.ttf",
              "./assets/fonts/SchibstedGrotesk_600SemiBold.ttf",
              "./assets/fonts/SchibstedGrotesk_700Bold.ttf",
              "./assets/fonts/JetBrainsMono_400Regular.ttf",
              "./assets/fonts/JetBrainsMono_500Medium.ttf",
            ],
          },
        },
      ],
      "expo-image",
      "expo-localization",
      "expo-secure-store",
      "@react-native-community/datetimepicker",
      "react-native-enriched-markdown",
      [
        "expo-image-picker",
        {
          // iOS NSPhotoLibraryUsageDescription. Without this string in
          // Info.plist, calling launchImageLibraryAsync hard-crashes on
          // iOS 14+. Camera + microphone are disabled — we only ever read
          // from the existing photo library.
          photosPermission:
            "Allow Multica to access your photos to attach images to issues and comments.",
          // Profile photo can be taken with the camera on Android as well as
          // picked from the library; Android asks at runtime.
          cameraPermission:
            "Allow Multica to use the camera so you can take a profile photo.",
          microphonePermission: false,
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            buildReactNativeFromSource: true,
            // SDK 57's supported scene runtime is required for Xcode 27 builds.
            // Keep this in prebuild config so clean native generations retain it.
            enableSceneSupport: true,
          },
          android: {
            // React Native 0.86 pins NDK 27.1.12297006, whose
            // libc++_shared.so predates LLVM 20 and therefore lacks
            // __cxa_init_primary_exception. libfbjni.so is linked against
            // that symbol, so an NDK 27 build installs and then dies at
            // startup with `SoLoaderDSONotFoundError: couldn't find DSO to
            // load: libfbjni.so` (the file is present — the dlopen fails).
            // Pin 29 here so `expo prebuild` regenerating android/ keeps the
            // toolchain that actually works. Install it with:
            //   sdkmanager "ndk;29.0.14206865"
            ndkVersion: "29.0.14206865",
          },
        },
      ],
    ],
    extra: { APP_ENV: env },
  };
};
