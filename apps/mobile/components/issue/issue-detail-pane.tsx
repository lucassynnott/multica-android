/**
 * The detail side of a list + detail split (`components/ui/split-pane.tsx`):
 * the issue selected on one list surface, or a quiet placeholder.
 *
 * Only the tab the user is on mounts its issue. Tab screens stay mounted in
 * the background, and the composer's mention and reply stores are singletons,
 * so three live composers would share one draft. A pushed route (a picker,
 * the edit screen) is not a tab switch and leaves the pane mounted, which is
 * what keeps the comment draft while a picker is open.
 */
import { useCallback, useSyncExternalStore } from "react";
import { View } from "react-native";
import { useNavigation } from "expo-router";
import { Text } from "@/components/ui/text";
import { IssueDetailView } from "@/components/issue/issue-detail-view";
import {
  useIssuePaneStore,
  type IssuePaneSurface,
} from "@/data/stores/issue-pane-store";
import { useT } from "@/lib/i18n";

/** Route name of the tab that hosts each surface, see `(tabs)/_layout.tsx`. */
const TAB_OF: Record<IssuePaneSurface, string> = {
  board: "board",
  mine: "my-issues",
  inbox: "inbox",
};

/**
 * True while `name` is the selected tab of the enclosing Tabs navigator.
 * Unlike `useIsFocused`, a screen pushed over the tabs does not flip it.
 */
function useIsTabSelected(name: string): boolean {
  const navigation = useNavigation();
  const read = useCallback(() => {
    const state = navigation.getState();
    return state?.routes[state.index]?.name === name;
  }, [navigation, name]);
  const subscribe = useCallback(
    (onChange: () => void) => navigation.addListener("state", onChange),
    [navigation],
  );
  return useSyncExternalStore(subscribe, read);
}

export function IssueDetailPane({ surface }: { surface: IssuePaneSurface }) {
  const { t } = useT("issues");
  const selection = useIssuePaneStore((s) => s.selections[surface]);
  const tabSelected = useIsTabSelected(TAB_OF[surface]);
  const issueId = selection?.issueId;

  const onClose = useCallback(() => {
    if (issueId) useIssuePaneStore.getState().clearIssue(issueId);
  }, [issueId]);

  if (!tabSelected) return null;

  if (!selection) {
    // Transparent on purpose: the host screen's TideTexture shows through.
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-[13px] text-muted-foreground">
          {t("empty.select_issue")}
        </Text>
      </View>
    );
  }

  return (
    // Keyed by issue so composer text, scroll position and the per-issue
    // effects start clean when another row is selected.
    <IssueDetailView
      key={selection.issueId}
      issueId={selection.issueId}
      variant="pane"
      highlight={selection.highlight}
      highlightNonce={selection.nonce}
      onClose={onClose}
    />
  );
}
