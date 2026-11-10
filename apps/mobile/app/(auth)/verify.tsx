import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useKeyboardVisible } from "@/lib/use-keyboard-visible";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ui/text";
import { OtpInput, type OtpInputRef } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { MulticaLogo } from "@/components/brand/multica-logo";
import { TideTexture } from "@/components/ui/tide-texture";
import { ApiHost } from "@/components/auth/api-host";
import { useAuthStore } from "@/data/auth-store";
import { i18n, useT } from "@/lib/i18n";
import { mapAuthError } from "@/lib/auth-error";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function Verify() {
  const sendCode = useAuthStore((s) => s.sendCode);
  const verifyCode = useAuthStore((s) => s.verifyCode);
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const otpRef = useRef<OtpInputRef>(null);
  const { t } = useT("auth");
  const keyboardVisible = useKeyboardVisible();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const submit = async (value: string) => {
    if (!value || !email || submitting) return;
    void Haptics.selectionAsync();
    setSubmitting(true);
    setError(null);
    try {
      await verifyCode(email, value);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(mapAuthError(err, t("verify.verify_failed"), (key) => i18n.t(`auth:${key}`)));
      setSubmitting(false);
      otpRef.current?.clear();
      setCode("");
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || resending || !email) return;
    void Haptics.selectionAsync();
    setResending(true);
    setError(null);
    try {
      await sendCode(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      otpRef.current?.clear();
      setCode("");
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(mapAuthError(err, t("verify.resend_failed"), (key) => i18n.t(`auth:${key}`)));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <TideTexture height={560} opacity={0.11} />
      <KeyboardAwareScrollView
        // Same reason as login: on the cover geometry the six OTP boxes and the
        // Verify button sat underneath the keypad. This view scrolls the
        // focused field above the measured keyboard instead of relying on a
        // window resize that edge-to-edge no longer performs.
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
          {/* Same capped column as the sign-in screen. */}
          <View className="w-full max-w-[420px] self-center gap-7">
            <MulticaLogo size={40} />
            <View className="gap-2">
              <Text
                role="heading"
                className="text-[30px] font-semibold leading-9 tracking-tight text-foreground"
              >
                {t("verify.enter_title")}
              </Text>
              <Text className="text-[15px] leading-[22px] text-muted-foreground">
                {t("verify.sent_to", { email })}
              </Text>
            </View>

            <View className="gap-2.5">
              <Text className="text-[13px] font-medium text-muted-foreground">
                {t("verify.code_label")}
              </Text>
              <OtpInput
                ref={otpRef}
                numberOfDigits={CODE_LENGTH}
                value={code}
                onChange={setCode}
                onComplete={submit}
                autoFocus
                editable={!submitting}
              />
              {error ? (
                <Text className="text-[13px] text-destructive">{error}</Text>
              ) : null}
            </View>

            <View className="gap-1">
              <Button
                className="h-[52px]"
                disabled={submitting || code.length < CODE_LENGTH}
                onPress={() => submit(code)}
              >
                <Text className="text-base font-semibold">
                  {submitting ? t("verify.verifying") : t("verify.verify")}
                </Text>
              </Button>

              <View className="flex-row flex-wrap items-center justify-between gap-x-4">
                <Pressable
                  onPress={onResend}
                  disabled={cooldown > 0 || resending}
                  accessibilityRole="button"
                  className="min-h-11 justify-center active:opacity-70"
                >
                  <Text
                    className={
                      cooldown > 0 || resending
                        ? "text-[13px] text-muted-foreground"
                        : "text-[13px] font-semibold text-primary"
                    }
                  >
                    {resending
                      ? t("login.sending")
                      : cooldown > 0
                        ? t("verify.resend_in", { count: cooldown })
                        : t("verify.resend")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.back()}
                  disabled={submitting}
                  accessibilityRole="button"
                  className="min-h-11 justify-center active:opacity-70"
                >
                  <Text className="text-[13px] text-muted-foreground">
                    {t("verify.change_email")}
                  </Text>
                </Pressable>
              </View>
            </View>

            <ApiHost />
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
