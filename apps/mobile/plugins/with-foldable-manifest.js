/**
 * Foldable manifest attributes that Expo's config schema cannot express.
 *
 * `android/` is a generated directory, so anything written there by hand is
 * lost on the next `expo prebuild`. These must survive that:
 *
 *   android:resizeableActivity="true"
 *       The app is a real multi-window / large-screen app, not a fixed-size
 *       phone surface. Android also uses it for app continuity while a
 *       foldable switches panels.
 *
 *   android:screenOrientation="unspecified"
 *       Honour the device orientation instead of pinning portrait; the Fold
 *       8's unfolded 4:3 canvas is designed to rotate.
 *
 *   android:configChanges="…|density|fontScale|locale|layoutDirection"
 *       The one that matters most for a fold. A fold is a configuration
 *       change on the same activity, and it changes the display density as
 *       well as the size — the Fold 8's cover and main panels report
 *       different dpi. Without `density` in configChanges Android recreates
 *       the activity, which remounts the JS tree and drops navigation state.
 *       Reproduced on the emulator: select Board, then change size AND
 *       density → back on Inbox. A size-only change kept Board, which is how
 *       the cause was isolated. React Native already forwards
 *       onConfigurationChanged to JS, so window-size hooks re-render instead
 *       of the app restarting.
 *
 * `resizeableActivity` is not reachable through app.config.ts, and pinning it
 * here keeps a future Expo config change from silently making the app
 * non-resizable.
 */
const { withAndroidManifest } = require("expo/config-plugins");

// React Native's own defaults plus the display-related ones a foldable
// changes. Android does not care about the order.
const REQUIRED_CONFIG_CHANGES = [
  "keyboard",
  "keyboardHidden",
  "orientation",
  "screenLayout",
  "screenSize",
  "smallestScreenSize",
  "uiMode",
  "density",
  "fontScale",
  "locale",
  "layoutDirection",
];

module.exports = function withFoldableManifest(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest?.application?.[0];
    const activity = application?.activity?.find(
      (entry) => entry.$?.["android:name"] === ".MainActivity",
    );
    if (!activity) {
      // Failing loudly beats shipping an APK that silently restarts on a fold.
      throw new Error(
        "with-foldable-manifest: .MainActivity not found in AndroidManifest",
      );
    }

    activity.$["android:resizeableActivity"] = "true";
    activity.$["android:screenOrientation"] = "unspecified";

    const existing = (activity.$["android:configChanges"] ?? "")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean);
    activity.$["android:configChanges"] = [
      ...new Set([...existing, ...REQUIRED_CONFIG_CHANGES]),
    ].join("|");

    return config;
  });
};
