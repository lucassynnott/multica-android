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
| Picker search field | `lib/use-native-search-bar.ts`, `components/ui/picker-search-field.tsx` | react-native-screens builds no toolbar for a formSheet on Android, so `headerSearchBarOptions` (and the sheet's title) never render. Search pickers (assignee, label, project, lead, mention) render an in-body field on Android from the same hook state. |
| Discard guard | `lib/use-discard-guard.ts` | The "Discard changes?" alert lived only on the header Cancel button; hardware back and the back gesture dropped drafts silently. New issue, edit issue, new project and edit project now confirm on `beforeRemove`. Screens leave through the hook's `leave()` so a save does not prompt. |
| Modal back arrow | `app/(app)/[workspace]/_layout.tsx` | `presentation: "modal"` is a plain push on Android and drew a back arrow beside the custom close button. `headerBackVisible: false` on those screens. |
| Date picker | `components/issue/pickers/due-date-picker-body.tsx` | `display="inline"` is iOS-only, and Android's picker is a system dialog that leaves nothing in the sheet once closed. On Android the sheet shows the draft day as a row and opens the dialog imperatively (`DateTimePickerAndroid.open`), once on arrival and again on tap. |
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
- **medium** — navigation rail replaces the bottom bar, so the taller 4:3
  canvas keeps its vertical space. The board shows two columns plus the next
  column's edge beside the rail.

  Both shapes are `components/nav/app-tab-bar.tsx`: one component that only
  changes flex direction, so a fold is a relayout and never a tree rebuild.
  Five destinations (Inbox, Mine, Board, Chat, More), each an icon over a
  label; the active one is foreground-coloured and semibold. The rail carries
  a "New issue" tile at its top. More is a real screen, not a popover.
- **expanded** — rail plus room for three or four columns, and a slightly
  wider list column in the split below.

### List and detail split

From 672dp up (`isSplitPane` in `lib/responsive.ts`: the rail, a 300dp list
and at least 300dp of detail, so every unfolded Fold posture qualifies) a tap
on an issue opens it in a pane to the right of the list instead of pushing
`issue/[id]`. It applies to the Board tab in its list view, My Issues and
Inbox rows that target an issue. The kanban, search, project detail and every
compact window keep pushing the full-screen route.

- `components/ui/split-pane.tsx` lays out the list at 300dp (320 on expanded)
  with a right hairline and the detail in the rest. Both children are always
  mounted in the same place and the detail is only hidden when the window is
  not split, so a fold is a relayout: nothing is navigated, the list keeps its
  scroll offset, and unfolding shows the same issue with its draft intact.
- `components/issue/issue-detail-view.tsx` is the whole issue detail. The
  route `issue/[id]` renders it with `variant="screen"` (native header); the
  pane renders `variant="pane"` on `bg-card` with its own header (identifier,
  "open full screen", the "…" menu). Pickers and the edit screen are still
  routes pushed over the tabs; they take the issue id from their own URL.
- The open issue per surface (board / mine / inbox) lives in
  `data/stores/issue-pane-store.ts`, not in navigation state, and is reset on
  workspace change. A deleted issue clears its slot instead of popping a
  route. The selected row is `bg-secondary`, and rows in the narrow column
  stack (id, meta and avatar on one line, title below).
- Only the selected tab mounts its pane (`issue-detail-pane.tsx`): the
  composer's mention and reply stores are singletons, so background tabs must
  not keep live composers. Switching tabs therefore drops an unsent comment
  draft in the pane; opening a picker does not.

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

## Visual system

See `DESIGN.md`. Two Android-specific points:

- Schibsted Grotesk and JetBrains Mono are registered as native font families
  by the `expo-font` config plugin (`app.config.ts`), with one file per
  weight. That is what makes `fontWeight` select a real cut on Android; a
  font loaded at runtime by name gets a synthesised bold instead. Adding a
  weight means adding the file and a prebuild.
- The animated background (`components/ui/tide-texture.tsx`) updates a text
  node four times a second, so `uiautomator dump` reports "could not get idle
  state" on any screen showing it. Automation should use screenshots, or turn
  the texture off in More first.

## Board (kanban)

The Board has two views, switched by the picker in its header and remembered
in `data/stores/board-view-store.ts`: a grouped list (`board-list.tsx`) and
the horizontal kanban (`board-canvas.tsx`). Both use the same move sheet.


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
pnpm --filter @multica/mobile test        # vitest, 318 tests
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

- **The header must be measured, not budgeted.** The panel has an explicit
  height (see below), and the header was once assumed to be 64dp. A board
  card's sheet passes the issue title as the message; when it wrapped, the
  header outgrew its budget and the panel clipped the last rows, which then
  painted partly and took no taps. The header's height now comes from
  `onLayout`. Verify any change to this component by tapping the last row,
  not only by screenshotting — a rendered row is not a working button.
- **A long option list must be an explicit height.** `maxHeight` on a
  `ScrollView`, and `flex: 1` inside a `maxHeight` panel, both let the content
  keep its natural height on Android; with 15 workspace statuses the list ran
  past the panel edge. The sheet sets the list height from
  `onContentSizeChange`, clamped to a budget derived from the measured modal
  box (not `useWindowDimensions`, which includes the system bars).

## Dev server

`react-native-css-interop` 0.2.4 emits Metro's pre-0.83 file-change event, and
Metro 0.84 throws on it (`Cannot read properties of undefined (reading
'addedFiles')`), killing the dev server the first time NativeWind regenerates
styles. `patches/react-native-css-interop@0.2.4.patch` emits the current event
shape. Drop the patch once NativeWind ships the fix.

## Known gaps

- Text laid out right after a live fold can lose its last character
  ("Pinne" for "Pinned" in the More menu). Reproduced on the emulator by
  changing `wm density` 428 → 403 without restarting; a fresh launch at
  either density is correct. Auto-width single-line text appears to be
  measured with the previous density. Root cause not found — it is the cost
  of keeping the activity alive across a density change (see `density` in
  `configChanges` above) and needs checking on a physical Fold.
- Chat still uses React Native's `KeyboardAvoidingView` with
  `behavior="height"`, which captures its frame once; after a fold the
  composer offset can be wrong until the tab remounts. Not changed here
  because the test backend had no agent to chat with.

- The list and detail split has only been type-checked, not run on a
  device. Inside the pane the comment bubbles, code blocks and the composer
  field are `bg-card` on a `bg-card` surface and rely on their hairline
  border; the mockup gives them a third, lighter step. Android back does not
  close the pane (there is no route to pop).
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
