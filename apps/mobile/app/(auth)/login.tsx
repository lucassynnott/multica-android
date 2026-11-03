import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { MulticaLogo } from "@/components/brand/multica-logo";
import { useAuthStore } from "@/data/auth-store";
import { i18n, useT } from "@/lib/i18n";
import { mapAuthError } from "@/lib/auth-error";

export default function Login() {
  const { t } = useT("auth");
  const keyboardVisible = useKeyboardVisible();
  // When the keyboard opens the layout flips from centred to top-anchored.
  // Any scroll offset taken while the field was still centred would leave the
  // logo cropped under the status bar, so reset the scroll on every change.
  const scrollRef = useRef<{ scrollTo: (p: { y: number; animated: boolean }) => void }>(null);
  useEffect(() => {
    // Runs after KeyboardAwareScrollView's own scroll-to-input pass, so the
    // settled position is the top of the form rather than a half-scrolled one.
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [keyboardVisible]);
  const sendCode = useAuthStore((s) => s.sendCode);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    void Haptics.selectionAsync();
    setSubmitting(true);
    setError(null);
    try {
      await sendCode(trimmed);
      router.push({ pathname: "/verify", params: { email: trimmed } });
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(mapAuthError(err, t("login.send_failed"), (key) => i18n.t(`auth:${key}`)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAwareScrollView
        ref={scrollRef as never}
        // Auth forms used to sit under a KeyboardAvoidingView with a plain
        // ScrollView. On the Fold 8 cover geometry (467x737 dp) the keyboard
        // covered the email field and the Send code button entirely: with
        // edge-to-edge the window no longer resizes, so the centered content
        // never moved. KeyboardAwareScrollView measures the real keyboard and
        // scrolls the focused field above it.
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          // Centre when there is room; anchor to the top once the keyboard
          // is up so the field and the submit button both stay above it.
          justifyContent: keyboardVisible ? "flex-start" : "center",
          paddingHorizontal: 16,
          paddingTop: keyboardVisible ? 12 : 24,
          paddingBottom: keyboardVisible ? 16 : 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={0}
      >
          <View className="gap-6">
            <View className="gap-2">
              <MulticaLogo size={28} />
              <Text className="text-[22px] font-semibold tracking-tight text-foreground">
                {t("login.title")}
              </Text>
              <Text className="text-[13px] text-muted-foreground">
                {t("login.subtitle")}
              </Text>
            </View>

            <View className="gap-4">
              <View className="gap-2">
                <Text className="text-xs font-medium text-muted-foreground">
                  {t("login.email_label")}
                </Text>
                <TextField
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  keyboardType="email-address"
                  placeholder={t("login.email_placeholder")}
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={onSubmit}
                  returnKeyType="send"
                  editable={!submitting}
                  invalid={!!error}
                  className="h-9"
                />
                {error ? (
                  <Text className="text-[13px] text-destructive">{error}</Text>
                ) : null}
              </View>

              <Button
                className="mt-2"
                disabled={submitting || !email.trim()}
                onPress={onSubmit}
              >
                <Text>{submitting ? t("login.sending") : t("login.send_code")}</Text>
              </Button>
            </View>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
