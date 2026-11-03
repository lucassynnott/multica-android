# Android, foldables and the Z Fold 8

This app was written as an iPhone/iPad client. This file records what was
changed to make it a real Android app on foldables, why each change exists,
and how to build and verify it. Keep it current when Android behaviour moves.

## Build

Requirements that are easy to get wrong:

| Need | Version | Why |
| --- | --- | --- |
| JDK | 21 **with `javac`** | A JRE-only install fails with `Toolchain ... does not provide the required capabilities: [JAVA_COMPILER]`. |
| Android SDK | platforms 36, build-tools 36, platform-tools | `compileSdk`/`targetSdk` come from Expo 57. |
| NDK | **29.x**, pinned by `plugins/with-android-ndk.js` | RN 0.86 pins NDK 27, whose `libc++_shared.so` does not export `__cxa_init_primary_exception`. `libfbjni.so` links against it, so an NDK 27 build installs and then dies at startup with `couldn't find DSO to load: libfbjni.so` — the file is in the APK, the dlopen fails. The plugin replaces `ndkVersion rootProject.ext.ndkVersion` with the pinned version so a `expo prebuild` cannot silently undo it. Verify with `nm -D` on the packaged `libc++_shared.so`. |
| CMake | 3.22.1 | Reanimated / enriched-markdown native builds. |

```bash
export ANDROID_HOME=$HOME/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

cd apps/mobile
npx expo prebuild --platform android        # android/ is generated, not source
cd android
./gradlew assembleDebug -PreactNativeArchitectures=x86_64 --max-workers=2
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64 --max-workers=2
```

Debug builds load JS from Metro through the Expo dev client; release builds
bundle JS and need no server.

### Gradle and cgroups

A heavily loaded machine can also kill Gradle's own worker daemons mid-compile:
`Execution failed for task ':expo-constants:compileReleaseJavaWithJavac' >
Unable to connect to the child process 'Gradle Worker Daemon'`. That is
resource pressure, not a code error — re-run with `--max-workers=2` rather
than changing the build.

On a machine where the build runs inside a memory-limited cgroup, Gradle dies
mid-`compileDebugKotlin` with the kernel log showing
`oom-kill ... constraint=CONSTRAINT_MEMCG`. Run the build in its own scope:

```bash
systemd-run --user --scope -p MemoryMax=16G --unit=multica-build \
  /bin/bash -c 'cd apps/mobile/android && ./gradlew assembleDebug ...'
```

## Platform parity fixes

| Change | File | Why |
| --- | --- | --- |
| `ActionSheet` (cross-platform) + `ActionSheetHost` | `lib/action-sheet.ts`, `components/ui/action-sheet-host.tsx`, mounted in `app/_layout.tsx` | `ActionSheetIOS` is undefined on Android: every "…" menu, inbox menu, comment long-press and chat long-press crashed. The shim keeps the exact `showActionSheetWithOptions(options, cb)` signature, delegates to the native sheet on iOS, and draws a bottom sheet on Android. |
| `PlatformIcon` | `components/ui/platform-icon.tsx` | Tab bar and More menu used `expo-image` with `sf:` symbols, which render nothing on Android. Android gets the equivalent Ionicons glyph. |
| Date picker `display` | `components/issue/pickers/due-date-picker-body.tsx` | `display="inline"` is iOS-only; Android renders an empty sheet. Android uses the default dialog. |
| Keyboard avoidance | 8 screens (`login`, `verify`, `new-issue`, `search`, `chat`, issue/project edit…) | `behavior` was `undefined` on Android, relying on `adjustResize`. With edge-to-edge (Android 15+) the window no longer resizes, so the keyboard covered inputs. Android now uses `behavior="height"`. |
| Camera permission | `app.config.ts`, `AndroidManifest.xml` | The manifest stripped `CAMERA` while the profile screen offers "Take photo". Enabled, requested at runtime. |

## Foldable layout

Breakpoints live in `lib/responsive.ts` and are derived from the panels, not
from generic Material numbers:

| Posture | px @ dpi | dp | Class |
| --- | --- | --- | --- |
| Z Fold 8 cover | 1248×1972 @428 | 467×737 | compact |
| Z Fold 8 main | 1848×2448 @403 | 734×972 | medium |
| Z Fold 8 main, landscape | 2448×1848 @403 | 972×734 | expanded |
| Z Fold 8 Ultra main | 2504×2256 @422 | 949×855 | expanded |

- **compact** — bottom tab bar, one board column plus the next column's edge.
- **medium** — navigation rail replaces the bottom bar (`tabBarPosition:
  "left"`), so the taller 4:3 canvas keeps its vertical space. The board shows
  two columns plus the next column's edge beside the rail. `tabBarVariant` is
  deliberately *not* toggled with the breakpoint: flipping uikit ↔ material
  swaps the bar implementation and react-navigation rebuilds the tab tree.
- **expanded** — rail plus room for three or four columns; reserved for the
  split-pane work below.

Orientation is unlocked (`orientation: "default"`) and
`plugins/with-foldable-manifest.js` writes `resizeableActivity="true"`,
`screenOrientation="unspecified"` and an extended `configChanges` onto
`MainActivity`, because `android/` is generated and Expo's schema has no keys
for them.

`density` in `configChanges` is the one that matters for a fold. A fold is a
configuration change on the same activity, and the Fold 8's cover and main
panels report **different dpi** — so the change arrives as size *and* density.
Without `density` Android recreates the activity, which remounts the JS tree
and drops navigation state. This was a real, on-device defect: select Board,
fold, and the app came back on Inbox. The same resize with density held
constant kept Board, which isolated the cause. With `density` declared, the
activity is re-laid out in place: verify by selecting Board, applying
`wm size 1248x1972 && wm density 428`, and checking the header still reads
Board with the same `pidof`.

## Board (kanban)

`app/(app)/[workspace]/(tabs)/board.tsx` with `components/board/*` and
`lib/board.ts`. Columns are the workspace's own statuses (custom statuses
included), ordered by lifecycle category, then catalog position, then
built-in order — the same ordering web uses.

Moves go to `POST /api/issues/:id/move` with `before_id`/`after_id` anchors and
an optional `status`, matching `server/internal/handler/issue_move.go`. That
endpoint derives the position server-side; `position` must not be sent (400
`unsupported move field`). Same-column reorders omit `status`, which is also
the safe way to exercise the endpoint against a live workspace because nothing
is reassigned and no agent run starts.

Long-press a card for **Move to …** (destination statuses), **Move to top**
(pure reorder), and **Open issue**.

Not implemented yet: continuous drag-and-drop. The move sheet is the shipped
interaction; a pointer/keyboard/TalkBack user cannot drag, and the sheet is
what they get either way.

## Build artifacts

| Artifact | ABI | Size | Notes |
| --- | --- | --- | --- |
| `android/app/build/outputs/apk/debug/app-debug.apk` | x86_64 | ~100 MB | Expo dev client; needs Metro on 8085. |
| `android/app/build/outputs/apk/release/app-release.apk` | arm64-v8a + x86_64 | ~80 MB | JS bundled in `assets/index.android.bundle`; signed with the generated debug keystore. |

## Verification (emulator)

```bash
avdmanager create avd -n fold8 -k "system-images;android-36;google_apis;x86_64" -d "8in Foldable"
emulator -avd fold8 -no-snapshot-load -no-boot-anim -gpu swiftshader_indirect &
# Fold 8 main / cover, exactly:
adb shell wm size 1848x2448 && adb shell wm density 403
adb shell wm size 1248x1972 && adb shell wm density 428
adb shell dumpsys window displays | grep app=     # authoritative dp check
adb shell wm size reset && adb shell wm density reset
```

Debug builds sign in with the app's normal email-code flow. For emulator
automation only, a debug build also accepts `EXPO_PUBLIC_DEV_AUTH_TOKEN`
(read in `data/auth-store.ts` behind `__DEV__`, so it is dead code in release
builds). Put it in `apps/mobile/.env.development.local`, which is gitignored —
never in a committed env file.

## Checks that must stay green

```bash
pnpm --filter @multica/mobile typecheck   # tsc --noEmit
pnpm --filter @multica/mobile lint        # expo lint, 0 problems
pnpm --filter @multica/mobile test        # vitest, 307 tests
```

`app.config.test.ts` asserts the resolved `plugins` array, so it fails
whenever a config plugin is added or its options change — update the
expectation in the same commit, otherwise the suite reports the Android work
as a regression. It now also pins the plugin *order* (the two `plugins/`
entries must precede `expo-router`, or the router plugin rewrites the
manifest after them).

## Workflow-restricted statuses

A project can restrict its issues to a subset of the workspace's statuses
(MUL-7420). The board's move sheet lists workspace columns, so picking one the
issue's project does not accept returns `400` with
`{ code: "status_not_in_workflow", workflow_name, allowed_statuses }`. The
optimistic patch is rolled back and the user sees why, naming the workflow and
the statuses it does allow, instead of a silent no-op. Any other move failure
shows the server message. Rejection bodies can also be `409
workflow_step_moved`; that is left to the generic message for now.

## The Android action sheet

`ActionSheetIOS` does not exist on Android, so `lib/action-sheet.ts` routes to
one `Modal` bottom sheet mounted in the root layout. Two behaviours cost real
debugging time on the Fold 8 canvas:

- **Rows near the sheet's bottom edge paint but do not take taps.** The last
  row of a long status list and even a four-row sheet's `Cancel` were visible
  in `uiautomator` bounds and on screen, and taps there did nothing. Whatever
  the cause (clip versus dialog window), do not rely on the bottom strip: the
  sheet carries a close `✕` in its header, and the backdrop plus the system
  back button also dismiss it. Verify any change to this component by tapping,
  not only by screenshotting — a rendered row is not a working button.
- **A long option list must be an explicit height.** `maxHeight` on a
  `ScrollView`, and `flex: 1` inside a `maxHeight` panel, both let the content
  keep its natural height on Android; with 15 workspace statuses the list ran
  past the panel edge. The sheet sets the list height from
  `onContentSizeChange`, clamped to a budget derived from the measured modal
  box (not `useWindowDimensions`, which includes the system bars).

## Known gaps

- Two-pane master-detail (list + detail side by side on `expanded`) is not
  built; the rail plus wider lists is what ships today.
- `ios/` remains the reference platform: `sheetGrabberVisible`,
  `headerBackTitle` and iOS-only `Alert` styling are inert on Android.
- Release signing uses the generated debug keystore. A store build needs its
  own keystore.

## Known non-fatal dev warning

Metro prints `Text strings must be rendered within a <Text> component.` once
when a tab root mounts. It predates the Android work (already present in
`/tmp/metro2.log` before the board screen existed), it does not reproduce as a
crash, and it does not appear in release builds' user surface. Root-cause
still open: the message carries no component stack in logcat, so pinning it
needs a React DevTools / LogBox component-stack pass on the mounting screen.
