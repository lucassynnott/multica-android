/**
 * Edit issue title / description. Modal presentation, configured in
 * `[workspace]/_layout.tsx`. Save runs the optimistic `useUpdateIssue`
 * mutation; modal dismisses on success.
 *
 * Mirrors `project/[id]/edit.tsx` so users get the same gesture on both
 * record types (cancel/save in header, dirty Alert on dismiss-while-dirty).
 *
 * Description uses `useMentionInput` + `<DescriptionField>` so the @-mention
 * pipeline matches `new-issue.tsx`. v1 note: existing mentions in the
 * server-side description render as raw markdown text while editing because
 * there's no markdown-to-marker deserializer yet — `serialize()` still
 * produces a valid round-trip since unparsed `[@name](mention://...)` literals
 * pass through unchanged. New @-mentions added during the edit get serialized
 * normally via the marker pipeline.
 *
 * Properties (status / priority / assignee / labels / project / due_date)
 * are NOT edited here — they have dedicated chip pickers on the detail page.
 * This screen only owns the two free-text fields.
 */
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { stripChannelMediaMarkers } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { DescriptionField } from "@/components/issue/description-field";
import { MentionSuggestionBar } from "@/components/issue/mention-suggestion-bar";
import { SubmitIssueButton } from "@/components/issue/submit-issue-button";
import { issueDetailOptions } from "@/data/queries/issues";
import { useUpdateIssue } from "@/data/mutations/issues";
import { buildIssueTextUpdate } from "@/data/issue-edit";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";
import { useDiscardGuard } from "@/lib/use-discard-guard";
import { useMentionInput } from "@/lib/use-mention-input";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function EditIssue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  const detail = useQuery(issueDetailOptions(wsId, id));
  const update = useUpdateIssue(id);

  const [title, setTitle] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [initialDescription, setInitialDescription] = useState("");
  const description = useMentionInput();
  const [seeded, setSeeded] = useState(false);
  // Seed once when data arrives, before committing the form. Background
  // refetches must not overwrite edits already in progress.
  const setDescriptionText = description.setText;

  if (detail.data && !seeded) {
    setTitle(detail.data.title);
    setInitialTitle(detail.data.title);
    const initial = detail.data.description ?? "";
    setDescriptionText(stripChannelMediaMarkers(initial));
    setInitialDescription(initial);
    setSeeded(true);
  }

  const currentDescription = description.serialize();

  const dirty = useMemo(() => {
    if (!detail.data || !seeded) return false;
    return (
      title.trim() !== initialTitle ||
      currentDescription.trim() !==
        stripChannelMediaMarkers(initialDescription).trim()
    );
  }, [detail.data, seeded, title, initialTitle, currentDescription, initialDescription]);

  const canSave =
    seeded && title.trim().length > 0 && dirty && !update.isPending;

  const leave = useDiscardGuard(dirty && !update.isSuccess, {
    title: t("form.discard_title"),
    message: t("form.discard_message_issue"),
    keep: t("form.keep_editing"),
    discard: t("common:actions.discard"),
  });

  const onCancel = useCallback(() => {
    if (!dirty) {
      leave();
      return;
    }
    Alert.alert(
      t("form.discard_title"),
      t("form.discard_message_issue"),
      [
        { text: t("form.keep_editing"), style: "cancel" },
        {
          text: t("common:actions.discard"),
          style: "destructive",
          onPress: () => leave(),
        },
      ],
    );
  }, [dirty, leave, t]);

  const onSave = useCallback(() => {
    if (!canSave) return;
    // `UpdateIssueRequest.description` is `string | undefined` — server
    // treats empty string as "clear the description", which is what we
    // want when the user wipes the field. Mobile deliberately omits strict
    // text baselines until this screen has a conflict reconciliation flow;
    // otherwise a real 409 would leave the draft in an unrecoverable retry
    // loop. Web/desktop keep baseline protection with their compare UI.
    const patch = buildIssueTextUpdate(title, currentDescription);
    update.mutate(patch, {
      onSuccess: () => leave(),
      onError: (err) => {
        Alert.alert(
          t("form.save_failed"),
          err instanceof Error ? err.message : t("common:states.error"),
        );
      },
    });
  }, [canSave, title, currentDescription, update, leave, t]);

  const headerLeft = useCallback(
    () => (
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        className="min-h-11 justify-center px-1 active:opacity-60"
      >
        <Text className="text-[15px] text-muted-foreground">
          {t("common:actions.cancel")}
        </Text>
      </Pressable>
    ),
    [onCancel, t],
  );

  const headerRight = useCallback(
    () => (
      <SubmitIssueButton
        disabled={!canSave}
        loading={update.isPending}
        onPress={onSave}
        label={t("common:actions.save")}
        accessibilityLabel={update.isPending ? t("edit.saving") : t("edit.save")}
      />
    ),
    [canSave, onSave, update.isPending, t],
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerLeft, headerRight }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-4 pb-6 gap-1"
          keyboardShouldPersistTaps="handled"
        >
          {!detail.data ? (
            <Text className="text-[15px] leading-[21px] text-muted-foreground">
              {t("common:states.loading")}
            </Text>
          ) : (
            <>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t("new.title_placeholder")}
                placeholderTextColor={THEME[colorScheme].mutedForeground}
                accessibilityLabel={t("common:fields.title")}
                // Size is inline, not a `text-*` class: NativeWind adds a
            // lineHeight with those, which clips descenders in a TextInput.
            style={{ fontSize: 22 }}
            className="min-h-12 p-0 font-sans font-semibold text-foreground"
                returnKeyType="next"
                editable={!update.isPending}
              />
              <DescriptionField
                description={description}
                disabled={update.isPending}
              />
            </>
          )}
        </ScrollView>
        {/* Mention suggestion bar floats above the keyboard while the user
            is mid-@. Outside the ScrollView so it doesn't scroll with the
            form body. */}
        <MentionSuggestionBar {...description.suggestionBar} />
      </KeyboardAvoidingView>
    </View>
  );
}
