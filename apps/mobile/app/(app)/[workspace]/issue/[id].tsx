/**
 * Issue detail screen: the pushed, full-screen host of `IssueDetailView`.
 *
 * The parent _layout.tsx declares the `issue/[id]` Stack.Screen with title
 * "Issue"; the view overrides the native header once the data lands so the
 * bar shows `MUL-123` and the actions. On a wide window the same view also
 * renders beside a list, without this route (`issue-detail-pane.tsx`).
 */
import { useLocalSearchParams } from "expo-router";
import { IssueDetailView } from "@/components/issue/issue-detail-view";

export default function IssueDetail() {
  // `highlight` + `h` come from inbox deep-link (apps/mobile/app/(app)/
  // [workspace]/(tabs)/inbox.tsx). `highlight` is the target comment id;
  // `h` is a per-tap nonce so re-tapping the same row re-fires the
  // scroll-and-flash effect.
  const { id, highlight, h } = useLocalSearchParams<{
    id: string;
    workspace: string;
    highlight?: string;
    h?: string;
  }>();
  return (
    <IssueDetailView
      issueId={id}
      variant="screen"
      highlight={highlight}
      highlightNonce={h}
    />
  );
}
