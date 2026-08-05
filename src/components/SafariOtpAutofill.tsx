import { useEffect, useRef } from "react";

interface SafariOtpAutofillProps {
  onAutofill: (code: string) => void;
  length?: number;
}

/**
 * Invisible input for Safari iOS SMS autofill.
 * Place this anywhere on the page (preferably after the button) —
 * Safari finds it via autocomplete="one-time-code" and fills it automatically.
 */
export function SafariOtpAutofill({ onAutofill, length = 6 }: SafariOtpAutofillProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleChange = () => {
      const text = el.value.replace(/\D/g, "").slice(0, length);
      if (text.length === length) {
        el.value = "";
        onAutofill(text);
      }
    };

    el.addEventListener("input", handleChange);
    return () => el.removeEventListener("input", handleChange);
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
