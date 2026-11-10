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
import { TideTexture } from "@/components/ui/tide-texture";
import { ApiHost } from "@/components/auth/api-host";
import { cn } from "@/lib/utils";
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
  // Visual only: the field's border turns to the ring colour while focused.
  const [focused, setFocused] = useState(false);

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
      <TideTexture height={560} opacity={0.11} />
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
          paddingHorizontal: 28,
          paddingTop: keyboardVisible ? 12 : 24,
          paddingBottom: keyboardVisible ? 16 : 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={0}
      >
          {/* One column, capped so the form does not stretch across the
              unfolded screen. */}
          <View className="w-full max-w-[420px] self-center gap-7">
            <MulticaLogo size={40} />
            <View className="gap-2">
              <Text
                role="heading"
                className="text-[30px] font-semibold leading-9 tracking-tight text-foreground"
              >
                {t("login.title")}
              </Text>
              <Text className="text-[15px] leading-[22px] text-muted-foreground">
                {t("login.subtitle")}
              </Text>
            </View>

            <View className="gap-4">
              <View className="gap-2.5">
                <Text className="text-[13px] font-medium text-muted-foreground">
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
                  accessibilityLabel={t("login.email_label")}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{ fontSize: 16 }}
                  className={cn(
                    "h-[52px] bg-card px-4 font-sans",
                    error
                      ? "border-destructive"
                      : focused
                        ? "border-ring"
                        : "border-border",
                  )}
                />
                {error ? (
                  <Text className="text-[13px] text-destructive">{error}</Text>
                ) : null}
              </View>

              <Button
                className="h-[52px]"
                disabled={submitting || !email.trim()}
                onPress={onSubmit}
              >
                <Text className="text-base font-semibold">
                  {submitting ? t("login.sending") : t("login.send_code")}
                </Text>
              </Button>
            </View>

            <ApiHost />
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
