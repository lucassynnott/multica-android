/**
 * Workspace global search modal.
 *
 * Mirrors packages/views/search/search-command.tsx but is scoped to
 * search-only — mobile IA puts page nav in the More popover and
 * workspace switching in Settings, so a command-palette here would
 * duplicate them (see feedback_mobile_ia_main_vs_more).
 *
 * Result categories, ordering (live projects, then live issues, then a
 * trailing Cancelled section — see lib/search-rows.ts), debounce (300ms),
 * abort policy, and Recent rendering mirror the web source.
 * Highlight + snippet line for `match_source` matches preserves the
 * "why did this match" signal users rely on when scanning results.
 *
 * Visual layer (Graphite): the field is a bordered `bg-card` panel with its
 * own clear button; every result is a DESIGN.md "Row" — mono identifier in the
 * 62dp column (the project icon for a project), title 15, and the status as
 * 12 muted text. A comment/description hit adds one 13 muted snippet line.
 * A failed request is its own row with a retry, never "No results".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type {
  Issue,
  SearchIssueResult,
  SearchProjectResult,
} from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectIcon } from "@/components/ui/project-icon";
import { TideTexture } from "@/components/ui/tide-texture";
import { api } from "@/data/api";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import {
  selectViewedIssueIds,
  useViewedIssuesStore,
} from "@/data/viewed-issues-store";
import { issueDetailOptions } from "@/data/queries/issues";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { projectStatusLabel } from "@/lib/project-status";
import { buildSearchRows, type RowItem } from "@/lib/search-rows";

const DEBOUNCE_MS = 300;
const ISSUE_LIMIT = 20;
const PROJECT_LIMIT = 10;
const RECENT_LIMIT = 5;

// `buildSearchRows` stays pure; it supplies stable section identities and the
// localized render owns the label lookup.
const SEARCH_HEADER_LABELS: Record<string, string> = {
  "h-recent": "navigation:routes.recent",
  "h-projects": "navigation:routes.projects",
  "h-issues": "navigation:routes.issues",
  "h-cancelled": "issues:status.cancelled",
};

// HighlightText — mobile port of web's HighlightText
// Web uses an HTML <mark> which doesn't exist in RN, so we segment the
// string ourselves and wrap matched parts in a styled <Text>. Same regex
// escape + case-insensitive substring match as
// packages/views/search/search-command.tsx:55-89.

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
  numberOfLines?: number;
}

function HighlightText({
  text,
  query,
  className,
  numberOfLines,
}: HighlightTextProps) {
  const parts = useMemo(() => {
    const q = query.trim();
    if (!q) return [{ text, hit: false }];
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const out: { text: string; hit: boolean }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) out.push({ text: text.slice(last, m.index), hit: false });
      out.push({ text: m[0], hit: true });
      last = regex.lastIndex;
    }
    if (last < text.length) out.push({ text: text.slice(last), hit: false });
    return out.length > 0 ? out : [{ text, hit: false }];
  }, [text, query]);

  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.hit ? (
          // A step of surface plus weight, not a colour: vermilion is kept
          // for actions and unread.
          <Text key={i} className="bg-secondary font-semibold text-foreground">
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        ),
      )}
    </Text>
  );
}

// Row item types — drives the single FlatList render
// RowItem + buildSearchRows live in lib/search-rows.ts so the ordering rules
// (including the cancelled partition) are testable without mounting the screen.

/** DESIGN.md "Group header": 44dp, top hairline, name at 13/600. */
function SectionLabel({ label }: { label: string }) {
  return (
    <View className="h-11 flex-row items-center border-t border-border px-5">
      <Text className="text-[13px] font-semibold text-foreground">{label}</Text>
    </View>
  );
}

function navigateOnTap(slug: string | null, path: string) {
  // Search is `presentation: "modal"` (see (app)/[workspace]/_layout.tsx).
  // `router.replace` swaps the modal out for the destination in a single
  // atomic transition — the new screen renders with its own presentation
  // (default `card`), and the resulting history is `[..., inbox, detail]`,
  // so the user's back gesture lands on the screen that was under search.
  if (!slug) return;
  router.replace(path);
}

/**
 * One result row. `leading` fills the fixed 62dp column (a mono identifier or
 * a project icon), `meta` is the trailing 12 muted status text.
 */
function ResultRow({
  leading,
  title,
  query,
  snippet,
  meta,
  onPress,
}: {
  leading: React.ReactNode;
  title: string;
  query: string;
  snippet: string | null;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="min-h-11 flex-row items-start gap-2 px-5 py-2.5 active:bg-secondary"
    >
      <View className="h-[21px] w-[62px] shrink-0 justify-center">{leading}</View>
      <View className="min-w-0 flex-1 gap-1">
        <HighlightText
          text={title}
          query={query}
          className="text-[15px] leading-[21px] text-foreground"
          numberOfLines={2}
        />
        {snippet ? (
          <HighlightText
            text={snippet}
            query={query}
            className="text-[13px] text-muted-foreground"
            numberOfLines={1}
          />
        ) : null}
      </View>
      <Text
        className="shrink-0 text-xs leading-[21px] text-muted-foreground"
        numberOfLines={1}
      >
        {meta}
      </Text>
    </Pressable>
  );
}

function Identifier({ value }: { value: string }) {
  return (
    <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
      {value}
    </Text>
  );
}

interface SearchIssueRowProps {
  item: SearchIssueResult;
  query: string;
  slug: string | null;
}

function SearchIssueRow({ item, query, slug }: SearchIssueRowProps) {
  // Web only renders the snippet line for comment matches
  // (packages/views/search/search-command.tsx:632) and the backend only
  // populates `matched_snippet` for comment matches anyway
  // (server/internal/handler/issue.go:592). Keep mobile strictly aligned.
  const showSnippet =
    item.match_source === "comment" && !!item.matched_snippet;
  const { labelOf } = useIssueStatuses();
  return (
    <ResultRow
      leading={<Identifier value={item.identifier} />}
      title={item.title}
      query={query}
      snippet={showSnippet ? (item.matched_snippet ?? null) : null}
      meta={labelOf(item.status)}
      onPress={() => navigateOnTap(slug, `/${slug}/issue/${item.id}`)}
    />
  );
}

interface SearchProjectRowProps {
  item: SearchProjectResult;
  query: string;
  slug: string | null;
}

function SearchProjectRow({ item, query, slug }: SearchProjectRowProps) {
  const showSnippet =
    item.match_source === "description" && !!item.matched_snippet;
  return (
    <ResultRow
      leading={<ProjectIcon icon={item.icon} size="sm" />}
      title={item.title}
      query={query}
      snippet={showSnippet ? (item.matched_snippet ?? null) : null}
      meta={projectStatusLabel(item.status)}
      onPress={() => navigateOnTap(slug, `/${slug}/project/${item.id}`)}
    />
  );
}

interface RecentRowProps {
  item: Issue;
  slug: string | null;
}

function RecentRow({ item, slug }: RecentRowProps) {
  const { labelOf } = useIssueStatuses();
  return (
    <ResultRow
      leading={<Identifier value={item.identifier} />}
      title={item.title}
      query=""
      snippet={null}
      meta={labelOf(item.status)}
      onPress={() => navigateOnTap(slug, `/${slug}/issue/${item.id}`)}
    />
  );
}

// Loading state — row-shaped skeletons, so the eye lands on list structure
// instead of a centered spinner.
function SearchLoading() {
  return (
    <View className="pt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} className="min-h-11 flex-row items-center gap-2 px-5 py-2.5">
          <Skeleton className="h-3 w-[54px]" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3 w-12" />
        </View>
      ))}
    </View>
  );
}

// Screen

interface SearchResultsState {
  issues: SearchIssueResult[];
  projects: SearchProjectResult[];
}

const EMPTY_RESULTS: SearchResultsState = { issues: [], projects: [] };

export default function SearchModal() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultsState>(EMPTY_RESULTS);
  const [isLoading, setIsLoading] = useState(false);
  // A request that failed for a reason other than being superseded. Without
  // it an offline search is indistinguishable from "nothing matched".
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Recent — mirrors mention-suggestion-bar.tsx:85-95.
  const viewedIds = useViewedIssuesStore(selectViewedIssueIds(wsId));
  const recentIds = useMemo(
    () => viewedIds.slice(0, RECENT_LIMIT),
    [viewedIds],
  );
  const recentQueries = useQueries({
    queries: recentIds.map((id) => issueDetailOptions(wsId, id)),
  });
  const recentIssues = useMemo<Issue[]>(
    () =>
      recentQueries
        .map((q) => q.data)
        .filter((i): i is Issue => !!i),
    [recentQueries],
  );

  // Cleanup pending debounce + abort on unmount. Without this, navigating
  // away mid-request leaves a dangling timeout + an in-flight fetch whose
  // setState would warn against an unmounted component.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const runSearch = useCallback((q: string) => {
    // Race-correctness: clear the pending debounce AND abort any in-flight
    // controller BEFORE the early-return / state writes below. The abort
    // is synchronous (signal.aborted flips immediately), so the post-await
    // guard in the timeout body will skip stale `setResults` / `setIsLoading`
    // even if the network response arrives later.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!q.trim()) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const [issueRes, projectRes] = await Promise.all([
          api.searchIssues(
            { q: q.trim(), limit: ISSUE_LIMIT, include_closed: true },
            { signal: controller.signal },
          ),
          api.searchProjects(
            { q: q.trim(), limit: PROJECT_LIMIT, include_closed: true },
            { signal: controller.signal },
          ),
        ]);
        if (!controller.signal.aborted) {
          setResults({ issues: issueRes.issues, projects: projectRes.projects });
          setIsLoading(false);
        }
      } catch {
        // Abort throws here too; ignore — a newer request is in flight, or
        // the user dismissed the modal. Anything else is a real failure and
        // gets its own row (drift / network errors are already logged inside
        // parseWithFallback + the api logger).
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setFailed(true);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      runSearch(value);
    },
    [runSearch],
  );

  const trimmedQuery = query.trim();
  const hasResults =
    results.issues.length > 0 || results.projects.length > 0;

  // Build the FlatList data. One flat array of discriminated rows means a
  // single virtualised list covers Recent (empty-state) and the search results
  // without nesting SectionList inside another scroller. Ordering lives in
  // buildSearchRows (lib/search-rows.ts).
  const data = useMemo<RowItem[]>(
    () =>
      buildSearchRows({
        query,
        issues: results.issues,
        projects: results.projects,
        recentIssues,
      }),
    [query, results, recentIssues],
  );

  const renderItem = useCallback<ListRenderItem<RowItem>>(
    ({ item }) => {
      switch (item.kind) {
        case "header":
          return (
            <SectionLabel label={t(SEARCH_HEADER_LABELS[item.key] ?? item.title)} />
          );
        case "issue":
          return <SearchIssueRow item={item.issue} query={item.query} slug={slug} />;
        case "project":
          return <SearchProjectRow item={item.project} query={item.query} slug={slug} />;
        case "recent":
          return <RecentRow item={item.issue} slug={slug} />;
      }
    },
    [slug, t],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TideTexture height={300} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* The field is a panel in its own right: bordered card, 44dp tall. */}
        <View className="px-5 pb-3 pt-2">
          <View className="h-11 flex-row items-center gap-2 rounded-lg border border-border bg-card pl-3">
            <Ionicons
              name="search"
              size={18}
              color={THEME[colorScheme].mutedForeground}
            />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={handleChange}
              placeholder={t("list.search_placeholder")}
              placeholderTextColor={THEME[colorScheme].mutedForeground}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel={t("list.search_placeholder")}
              style={{ fontSize: 15, includeFontPadding: false }}
              className="h-11 flex-1 p-0 font-sans text-foreground"
            />
            {/* Android has no `clearButtonMode`, so the button is ours. */}
            {query.length > 0 ? (
              <Pressable
                onPress={() => {
                  handleChange("");
                  inputRef.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel={t("picker.clear")}
                className="size-11 items-center justify-center"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={THEME[colorScheme].mutedForeground}
                />
              </Pressable>
            ) : (
              <View className="w-1" />
            )}
          </View>
        </View>

        {/* Body */}
        <FlatList
          data={failed ? [] : data}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            isLoading ? (
              <SearchLoading />
            ) : failed ? (
              <View className="gap-3 border-t border-border px-5 pt-4">
                <Text className="text-[15px] leading-[21px] text-foreground">
                  {t("list.search_failed")}
                </Text>
                <Button
                  variant="outline"
                  className="min-h-11 self-start"
                  onPress={() => runSearch(query)}
                >
                  <Text>{t("common:actions.retry")}</Text>
                </Button>
              </View>
            ) : trimmedQuery && !hasResults ? (
              <View className="border-t border-border px-5 pt-4">
                <Text className="text-[15px] leading-[21px] text-muted-foreground">
                  {t("list.no_results", { query: trimmedQuery })}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoading && hasResults && !failed ? (
              <View className="items-center justify-center py-4">
                <ActivityIndicator color={THEME[colorScheme].mutedForeground} />
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
