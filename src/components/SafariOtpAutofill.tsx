import { useEffect, useRef } from "react";

interface SafariOtpAutofillProps {
  onAutofill: (code: string) => void;
  length?: number;
}

/**
 * Invisible input for Safari iOS SMS autofill.
 * Fills the code into state — user still taps the button manually.
 */
export function SafariOtpAutofill({ onAutofill, length = 6 }: SafariOtpAutofillProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handleInput = () => {
      const text = el.value.replace(/\D/g, "").slice(0, length);
      if (!text) return;
      el.value = "";
      onAutofill(text);
    };
    el.addEventListener("input", handleInput);
    return () => el.removeEventListener("input", handleInput);
  }, [onAutofill, length]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    />
  );
}
