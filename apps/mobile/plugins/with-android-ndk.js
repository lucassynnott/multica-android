/**
 * Pin the Android NDK to 29.0.14206865 in the generated `android/` project.
 *
 * Why this exists: React Native 0.86 pins `ndkVersion = "27.1.12297006"` in
 * `node_modules/react-native/gradle/libs.versions.toml`, which the root
 * project plugin exposes as `rootProject.ext.ndkVersion`, and which
 * `android/app/build.gradle` uses by default.
 *
 * NDK 27's `libc++_shared.so` predates LLVM 20 and does not export
 * `__cxa_init_primary_exception`. `libfbjni.so` links against that symbol, so
 * an NDK 27 build installs cleanly and then dies at process start with
 *
 *   SoLoaderDSONotFoundError: couldn't find DSO to load: libfbjni.so
 *
 * …even though `libfbjni.so` is inside the APK — the dlopen fails on the
 * unresolved C++ symbol, not on a missing file. NDK 29 exports it and the
 * app starts.
 *
 * `expo-build-properties` accepts `android.ndkVersion`, but with SDK 57 and
 * the RN root-project plugin that value did not reach `app/build.gradle`
 * (regenerating still produced `ndkVersion rootProject.ext.ndkVersion` →
 * 27.1.12297006). Patching the app module here is the version that actually
 * survives `expo prebuild`.
 *
 * Install the NDK first:  sdkmanager "ndk;29.0.14206865"
 */
const { withAppBuildGradle } = require("expo/config-plugins");

const NDK_VERSION = "29.0.14206865";
const PINNED = `ndkVersion "${NDK_VERSION}"`;

module.exports = function withAndroidNdk(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      throw new Error(
        "with-android-ndk: expected a Groovy app/build.gradle, found " +
          config.modResults.language,
      );
    }
    const source = config.modResults.contents;
    if (source.includes(PINNED)) return config;

    const replaced = source.replace(
      /ndkVersion\s+rootProject\.ext\.ndkVersion/,
      PINNED,
    );
    if (replaced === source) {
      throw new Error(
        "with-android-ndk: no 'ndkVersion rootProject.ext.ndkVersion' line to replace",
      );
    }
    config.modResults.contents = replaced;
    return config;
  });
};
