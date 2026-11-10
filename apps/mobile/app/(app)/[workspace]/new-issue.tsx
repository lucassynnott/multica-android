/**
 * New issue creation modal — manual only.
 *
 * Layout follows Apple Reminders / Linear iOS / Things 3: one vertical
 * scrolling form (title → description → property chips), no sticky bottom
 * toolbar. Property chips are part of the form, not pinned above keyboard.
 * MentionSuggestionBar floats above keyboard only when the user is mid-@.
 *
 * No markdown toolbar / upload buttons in v1: mobile users creating an
 * issue rarely format markdown, and attachment upload is deferred to a
 * later release (see plan-issue-majestic-rabin.md "skip uploads").
 *
 * Mention pipeline shares `useMentionInput` with `issue/[id]/new-comment.tsx`
 * — both surfaces produce canonical `[@name](mention://type/id)` markdown
 * recognised by util.ParseMentions on the server.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { SubmitIssueButton } from "@/components/issue/submit-issue-button";
import { CreateFormAttributeRow } from "@/components/issue/create-form-attribute-row";
import { MentionSuggestionBar } from "@/components/issue/mention-suggestion-bar";
import { DescriptionField } from "@/components/issue/description-field";
import { TideTexture } from "@/components/ui/tide-texture";
import { useCreateIssue } from "@/data/mutations/issues";
import { useNewIssueDraftStore } from "@/data/stores/new-issue-draft-store";
import { Text } from "@/components/ui/text";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { useMentionInput } from "@/lib/use-mention-input";
import { useT } from "@/lib/i18n";
import { useDiscardGuard } from "@/lib/use-discard-guard";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function NewIssueModal() {
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  const [title, setTitle] = useState("");
  const description = useMentionInput();
  // Attribute chips (status / priority / assignee / due date / project)
  // live in `useNewIssueDraftStore` so the new-issue-picker/* formSheet
  // routes can read and write the same values without a parent-child
  // React relationship. The store is reset on mount + on unmount so
  // re-opening the new-issue modal starts clean.
  const status = useNewIssueDraftStore((s) => s.status);
  const priority = useNewIssueDraftStore((s) => s.priority);
  const assignee = useNewIssueDraftStore((s) => s.assignee);
  const dueDate = useNewIssueDraftStore((s) => s.dueDate);
  const project = useNewIssueDraftStore((s) => s.project);
  const statusPreset = useNewIssueDraftStore((s) => s.statusPreset);
  const resetDraft = useNewIssueDraftStore((s) => s.reset);
  const { labelOf } = useIssueStatuses();

  // Reset on unmount only. Resetting on mount as well wiped the status the
  // board's column "+" stores just before pushing this screen, so an issue
  // added from the "In Review" column was created in the default status.
  useEffect(() => {
    return () => {
      resetDraft();
    };
  }, [resetDraft]);

  const createIssue = useCreateIssue();
  const isSubmitting = createIssue.isPending;

  const canSubmit = !isSubmitting && title.trim().length > 0;

  const leave = useDiscardGuard(
    !createIssue.isSuccess &&
      (title.trim().length > 0 || description.text.trim().length > 0),
    {
      title: t("form.discard_title"),
      message: t("form.discard_message_new_issue"),
      keep: t("form.keep_editing"),
      discard: t("common:actions.discard"),
    },
  );

  const onSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) return;
    const finalDescription = description.serialize().trim();
    try {
      await createIssue.mutateAsync({
        title: trimmedTitle,
        description: finalDescription || undefined,
        status,
        priority,
        ...(assignee
          ? { assignee_type: assignee.type, assignee_id: assignee.id }
          : {}),
        ...(dueDate ? { due_date: dueDate } : {}),
        ...(project ? { project_id: project.id } : {}),
      });
      leave();
    } catch (err) {
      Alert.alert(
        t("errors.create_failed"),
        err instanceof Error ? err.message : t("common:states.error"),
      );
    }
  }, [
    title,
    description,
    status,
    priority,
    assignee,
    dueDate,
    project,
    createIssue,
    leave,
    t,
  ]);

  const headerRight = useCallback(
    () => (
      <SubmitIssueButton
        disabled={!canSubmit}
        loading={isSubmitting}
        onPress={onSubmit}
      />
    ),
    [canSubmit, isSubmitting, onSubmit],
  );

  return (
    <View className="flex-1 bg-background">
      <TideTexture height={300} />
      <Stack.Screen options={{ headerRight }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-4 pb-6 gap-1"
          keyboardShouldPersistTaps="handled"
        >
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
            autoFocus
            returnKeyType="next"
            editable={!isSubmitting}
          />
          <DescriptionField
            description={description}
            disabled={isSubmitting}
          />
          <CreateFormAttributeRow />
          {statusPreset ? (
            <Text className="mt-2 text-[13px] text-muted-foreground">
              {t("new.status_preset_hint", { status: labelOf(status) })}
            </Text>
          ) : null}
        </ScrollView>

        {/* Mention suggestions float above the keyboard only when the user
            types `@`. Self-hides via `if (!visible) return null` so it
            doesn't take space at rest. */}
        <MentionSuggestionBar {...description.suggestionBar} />
      </KeyboardAvoidingView>
    </View>
  );
}
