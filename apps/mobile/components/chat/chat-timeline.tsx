/**
 * Per-task execution trace — what the agent is/was thinking and which tools
 * it called. Rendered:
 *
 *   - Live (under the StatusPill while a task is in flight), AND
 *   - Persisted (under the assistant bubble once the message has landed)
 *
 * Process steps (thinking / tool_use / tool_result / error) collapse
 * behind a single "N steps" toggle. Final text is NOT rendered here —
 * the parent renders the assistant message's `content` (or the latest
 * streaming text) as its own markdown block.
 *
 * Folds use RNR `Collapsible` (built on `@rn-primitives/collapsible`).
 * The earlier version of this file hand-rolled four separate
 * `useState + Pressable + chevron` triggers (~60 lines of state +
 * handlers); Collapsible owns open/close + a11y semantics in one place.
 *
 * Visual: one hairline-bordered block of mono 12 muted lines. While the task
 * is streaming, the last line is the current step and reads in foreground.
 * Expanded step detail is an indented run behind a left hairline, never a
 * second panel inside the block.
 *
 * `defaultOpen` is true on the outer fold while streaming so the user
 * sees activity; the persisted instance below an assistant bubble
 * starts closed (matches web's `OuterProcessFold` behaviour in
 * `packages/views/chat/components/chat-message-list.tsx`).
 */
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TaskMessagePayload } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  items: TaskMessagePayload[];
  /** Whether the owning task is still running. Drives the default-open
   *  state and the dot-pulse next to the trigger. */
  isStreaming?: boolean;
}

/** One trace line: mono 12 on a 20dp line, muted unless it is the current step. */
const LINE = "font-mono text-xs leading-5";
/** Expanded detail under a step: indented behind a left hairline. */
const DETAIL = "ml-[5px] mt-1 mb-1 border-l border-border pl-3";

function useMutedIconColor() {
  const { colorScheme } = useColorScheme();
  return THEME[colorScheme].mutedForeground;
}

export function ChatTimeline({ items, isStreaming = false }: Props) {
  const processSteps = items.filter((i) => i.type !== "text");
  const { t } = useT("chat");
  const muted = useMutedIconColor();
  if (processSteps.length === 0) return null;
  const lastIndex = processSteps.length - 1;

  return (
    <Collapsible defaultOpen={isStreaming}>
      <CollapsibleTrigger asChild>
        <View
          accessibilityRole="button"
          accessibilityLabel={t("timeline.steps_count", {
            count: processSteps.length,
          })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
          className="min-h-7 flex-row items-center gap-1.5 self-start active:opacity-70"
        >
          <Ionicons name="chevron-forward" size={12} color={muted} />
          {isStreaming ? <StreamingDot /> : null}
          <Text className="font-mono text-xs text-muted-foreground">
            {t("timeline.steps_count", { count: processSteps.length })}
          </Text>
        </View>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <View className="mt-1 rounded-lg border border-border px-3.5 py-2.5">
          {processSteps.map((item, index) => (
            <StepRow
              key={`${item.task_id}-${item.seq}`}
              item={item}
              current={isStreaming && index === lastIndex}
            />
          ))}
        </View>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StreamingDot() {
  // Single accent dot beside the trigger so the user knows the rows
  // below may still be growing. Real "agent is alive" cue is StatusPill
  // (breathing dots) below; this is a quiet co-signal.
  return <View className="h-1.5 w-1.5 rounded-full bg-primary" />;
}

interface StepProps {
  item: TaskMessagePayload;
  /** The step the agent is on right now: rendered in foreground. */
  current: boolean;
}

function StepRow({ item, current }: StepProps) {
  switch (item.type) {
    case "thinking":
      return <ThinkingRow item={item} current={current} />;
    case "tool_use":
      return <ToolCallRow item={item} current={current} />;
    case "tool_result":
      return <ToolResultRow item={item} current={current} />;
    case "error":
      return <ErrorRow item={item} />;
    default:
      return null;
  }
}

function ThinkingRow({ item, current }: StepProps) {
  const text = item.content ?? "";
  const muted = useMutedIconColor();
  if (!text) return null;
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <View className="flex-row items-start gap-2 active:opacity-70">
          <Ionicons
            name="bulb-outline"
            size={12}
            color={muted}
            style={{ marginTop: 4 }}
          />
          <Text
            className={cn(
              LINE,
              "flex-1",
              current ? "text-foreground" : "text-muted-foreground",
            )}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <View className={DETAIL}>
          <Text className={cn(LINE, "text-muted-foreground")}>{text}</Text>
        </View>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolCallRow({ item, current }: StepProps) {
  const summary = getToolSummary(item);
  const { t } = useT("chat");
  const muted = useMutedIconColor();
  const hasInput = !!item.input && Object.keys(item.input).length > 0;
  const line = (
    <Text
      className={cn(
        LINE,
        "flex-1",
        current ? "text-foreground" : "text-muted-foreground",
      )}
      numberOfLines={1}
    >
      {item.tool ?? t("timeline.tool")}
      {summary ? ` ${summary}` : ""}
    </Text>
  );
  // If the call has no expandable input, render a non-interactive row —
  // wrapping a static row in Collapsible adds a wasted tap target.
  if (!hasInput) {
    return (
      <View className="flex-row items-start gap-2">
        <View style={{ width: 12 }} />
        {line}
      </View>
    );
  }
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <View className="flex-row items-start gap-2 active:opacity-70">
          <Ionicons
            name="chevron-forward"
            size={12}
            color={muted}
            style={{ marginTop: 4 }}
          />
          {line}
        </View>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <View className={DETAIL}>
          <Text className={cn(LINE, "text-muted-foreground")}>
            {JSON.stringify(item.input, null, 2)}
          </Text>
        </View>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ToolResultRow({ item, current }: StepProps) {
  const output = item.output ?? "";
  const { t } = useT("chat");
  const muted = useMutedIconColor();
  if (!output) return null;
  const preview = output.length > 80 ? `${output.slice(0, 80)}…` : output;
  const prefix = item.tool
    ? t("timeline.tool_result_named", { tool: item.tool })
    : t("timeline.tool_result_unnamed");
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <View className="flex-row items-start gap-2 active:opacity-70">
          <Ionicons
            name="chevron-forward"
            size={12}
            color={muted}
            style={{ marginTop: 4 }}
          />
          <Text
            className={cn(
              LINE,
              "flex-1",
              current ? "text-foreground" : "text-muted-foreground",
            )}
            numberOfLines={1}
          >
            {prefix}
            {preview}
          </Text>
        </View>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <View className={DETAIL}>
          <Text className={cn(LINE, "text-muted-foreground")}>
            {output.length > 4000
              ? `${output.slice(0, 4000)}\n${t("timeline.truncated")}`
              : output}
          </Text>
        </View>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ErrorRow({ item }: { item: TaskMessagePayload }) {
  const { t } = useT("chat");
  const { colorScheme } = useColorScheme();
  return (
    <View className="flex-row items-start gap-2">
      <Ionicons
        name="alert-circle"
        size={12}
        color={THEME[colorScheme].destructive}
        style={{ marginTop: 4 }}
      />
      <Text className={cn(LINE, "flex-1 text-destructive")} numberOfLines={3}>
        {item.content || t("timeline.error")}
      </Text>
    </View>
  );
}

/**
 * Mirror of web's `getToolSummary` (chat-message-list.tsx) — picks the most
 * informative single-line summary from a tool_use payload. Order matters:
 * `query` / `file_path` / `pattern` are the headline params, `command` /
 * `prompt` get truncated, and a final loop catches whichever short string
 * a future tool might emit.
 */
function getToolSummary(item: TaskMessagePayload): string {
  if (!item.input) return "";
  const inp = item.input as Record<string, unknown>;
  const pick = (k: string): string | undefined => {
    const v = inp[k];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const q = pick("query");
  if (q) return q;
  const fp = pick("file_path") ?? pick("path");
  if (fp) return shortenPath(fp);
  const p = pick("pattern");
  if (p) return p;
  const d = pick("description");
  if (d) return d;
  const cmd = pick("command");
  if (cmd) return cmd.length > 100 ? `${cmd.slice(0, 100)}…` : cmd;
  const prompt = pick("prompt");
  if (prompt) return prompt.length > 100 ? `${prompt.slice(0, 100)}…` : prompt;
  const skill = pick("skill");
  if (skill) return skill;
  for (const v of Object.values(inp)) {
    if (typeof v === "string" && v.length > 0 && v.length < 120) return v;
  }
  return "";
}

function shortenPath(p: string): string {
  const parts = p.split("/");
  if (parts.length <= 3) return p;
  return `…/${parts.slice(-2).join("/")}`;
}
