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
 * Visual layer (shadcn Nova): every row is the same two-line list row as
 * `IssueRow` — leading priority glyph, title 14/500, one muted meta line
 * (identifier, and the matched snippet when the hit was in a comment) — and
 * every status is a `StatusBadge`/`Badge`, never free-floating coloured text.
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { ProjectIcon } from "@/components/ui/project-icon";
import { ProjectStatusIcon } from "@/components/ui/project-status-icon";
import { StatusBadge } from "@/components/issue/status-badge";
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
import { issueColumnCategory } from "@/lib/issue-status";
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
          // Inline hex (yellow-200) instead of a Tailwind class because the
          // mobile tailwind.config.js intentionally curates its own palette
          // (no `yellow-*`) — see apps/mobile/CLAUDE.md "Visual tokens".
          <Text
            key={i}
            className="text-foreground"
            style={{ backgroundColor: "#fef08a" }}
          >
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

/**
 * Section label — 11px muted sentence case, matching the grouped issue lists.
 * The count lives in the row, so the label stays quiet.
 */
function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="px-4 pt-4 pb-1.5 text-[11px] font-medium text-muted-foreground">
      {label}
    </Text>
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

/** One muted meta line: identifier, then the matched snippet when there is one. */
function MetaLine({
  identifier,
  query,
  snippet,
}: {
  identifier: string;
  query: string;
  snippet: string | null;
}) {
  const { colorScheme } = useColorScheme();
  return (
    <View className="flex-row items-center gap-1.5 mt-0.5">
      <Text className="text-[11px] text-muted-foreground tabular-nums shrink-0">
        {identifier}
      </Text>
      {snippet ? (
        <>
          <Ionicons
            name="chatbubble-outline"
            size={11}
            color={THEME[colorScheme].mutedForeground}
          />
          <View className="flex-1 min-w-0">
            <HighlightText
              text={snippet}
              query={query}
              className="text-[11px] text-muted-foreground"
              numberOfLines={1}
            />
          </View>
        </>
      ) : null}
    </View>
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
  const { colorOf, labelOf } = useIssueStatuses();
  const category = issueColumnCategory(item);
  return (
    <Pressable
      onPress={() => navigateOnTap(slug, `/${slug}/issue/${item.id}`)}
      className="active:bg-secondary px-4 py-3"
    >
      <View className="flex-row items-center gap-3">
        <PriorityIcon priority={item.priority} size={14} />
        <View className="flex-1 min-w-0">
          <HighlightText
            text={item.title}
            query={query}
            className="text-sm font-medium text-foreground leading-[19px]"
            numberOfLines={1}
          />
          <MetaLine
            identifier={item.identifier}
            query={query}
            snippet={showSnippet ? (item.matched_snippet ?? null) : null}
          />
        </View>
        <StatusBadge
          label={labelOf(item.status)}
          status={item.status}
          category={category}
          color={colorOf(item.status)}
          className="shrink-0"
        />
      </View>
    </Pressable>
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
    <Pressable
      onPress={() => navigateOnTap(slug, `/${slug}/project/${item.id}`)}
      className="active:bg-secondary px-4 py-3"
    >
      <View className="flex-row items-center gap-3">
        <ProjectIcon icon={item.icon} size="md" />
        <View className="flex-1 min-w-0">
          <HighlightText
            text={item.title}
            query={query}
            className="text-sm font-medium text-foreground leading-[19px]"
            numberOfLines={1}
          />
          {showSnippet ? (
            <View className="mt-0.5">
              <HighlightText
                text={item.matched_snippet ?? ""}
                query={query}
                className="text-[11px] text-muted-foreground"
                numberOfLines={1}
              />
            </View>
          ) : null}
        </View>
        {/* Project status is not an issue status, so it uses the shared Badge
            surface rather than StatusBadge. */}
        <Badge variant="outline" className="shrink-0 gap-1.5">
          <ProjectStatusIcon status={item.status} size={12} />
          <Badge.Text>{projectStatusLabel(item.status)}</Badge.Text>
        </Badge>
      </View>
    </Pressable>
  );
}

interface RecentRowProps {
  item: Issue;
  slug: string | null;
}

function RecentRow({ item, slug }: RecentRowProps) {
  const { colorOf, labelOf } = useIssueStatuses();
  const category = issueColumnCategory(item);
  return (
    <Pressable
      onPress={() => navigateOnTap(slug, `/${slug}/issue/${item.id}`)}
      className="active:bg-secondary px-4 py-3"
    >
      <View className="flex-row items-center gap-3">
        <PriorityIcon priority={item.priority} size={14} />
        <View className="flex-1 min-w-0">
          <Text
            className="text-sm font-medium text-foreground leading-[19px]"
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text className="text-[11px] text-muted-foreground tabular-nums">
              {item.identifier}
            </Text>
          </View>
        </View>
        <StatusBadge
          label={labelOf(item.status)}
          status={item.status}
          category={category}
          color={colorOf(item.status)}
          className="shrink-0"
        />
      </View>
    </Pressable>
  );
}

// Loading state — same row-shaped Skeletons as the inbox and issue lists, so
// the eye lands on list structure instead of a centered spinner.
function SearchLoading() {
  return (
    <View className="px-4 pt-4 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Skeleton className="size-3.5 rounded-full" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-24" />
          </View>
          <Skeleton className="h-5 w-16 rounded-full" />
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
        // the user dismissed the modal. Drift / network errors are already
        // logged inside parseWithFallback + the api logger.
        if (!controller.signal.aborted) setIsLoading(false);
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Search input row — page inset 16, hairline under the field. */}
        <View className="flex-row items-center gap-3 border-b border-border px-4 py-2.5">
          <Ionicons
            name="search"
            size={18}
            color={THEME[colorScheme].mutedForeground}
          />
          <TextInput
            value={query}
            onChangeText={handleChange}
            placeholder={t("list.search_placeholder")}
            placeholderTextColor={THEME[colorScheme].mutedForeground}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
            className="flex-1 text-base text-foreground"
          />
        </View>

        {/* Body */}
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerClassName="pb-6"
          ListEmptyComponent={
            isLoading ? (
              <SearchLoading />
            ) : trimmedQuery && !hasResults ? (
              <View className="items-center justify-center py-12 px-8">
                <Text className="text-sm text-muted-foreground text-center leading-[19px]">
                  No results for &ldquo;{trimmedQuery}&rdquo;
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isLoading && hasResults ? (
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
