/**
 * Six-slot OTP input. Wraps `input-otp-native`'s headless OTPInput with
 * mobile design tokens (a `bg-card` panel per slot with a hairline, accent
 * border on the active slot, mono digits because it is a code, 2px caret). Paste-to-fill, autofocus, and iOS/Android one-time-code
 * autofill are handled by the underlying library (textContentType + autoComplete
 * are set inside its TextInput).
 *
 * Numeric input enforced via `inputMode="numeric"` (library default).
 */
import { forwardRef } from "react";
import { Text, View } from "react-native";
import {
  OTPInput,
  type OTPInputProps,
  type OTPInputRef,
  type SlotProps,
} from "input-otp-native";
import { cn } from "@/lib/utils";

export type { OTPInputRef as OtpInputRef };

export interface OtpInputProps
  extends Omit<OTPInputProps, "render" | "maxLength"> {
  numberOfDigits?: number;
}

export const OtpInput = forwardRef<OTPInputRef, OtpInputProps>(
  ({ numberOfDigits = 6, ...rest }, ref) => {
    return (
      <OTPInput
        ref={ref}
        maxLength={numberOfDigits}
        containerStyle={{ flexDirection: "row", gap: 8 }}
        render={({ slots }) => (
          <>
            {slots.map((slot, idx) => (
              <Slot key={idx} slot={slot} />
            ))}
          </>
        )}
        {...rest}
      />
    );
  },
);
OtpInput.displayName = "OtpInput";

function Slot({ slot }: { slot: SlotProps }) {
  return (
    <View
      className={cn(
        "w-12 h-14 rounded-lg items-center justify-center bg-card border border-border",
        slot.isActive && "border-primary",
      )}
    >
      {slot.char ? (
        <Text
          className="font-mono text-foreground font-medium"
          style={{ fontSize: 22, includeFontPadding: false }}
        >
          {slot.char}
        </Text>
      ) : slot.hasFakeCaret ? (
        <View className="w-0.5 h-6 bg-foreground" />
      ) : null}
    </View>
  );
}
