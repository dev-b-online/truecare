import { useRef, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
}

/**
 * OTP input with Safari iOS SMS autofill support.
 *
 * Safari requires a single focused <input autocomplete="one-time-code"> to
 * offer autofill. We render one transparent full-width input on top of the
 * visual digit cells. It receives focus and Safari autofill, then we
 * distribute the value to the visual cells.
 *
 * Android Chrome uses WebOTP API (navigator.credentials.get) handled in the
 * parent component, so nothing extra is needed here for Android.
 */
export function OtpInput({ value, onChange, length = 6, disabled }: OtpInputProps) {
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
  const overlayRef = useRef<HTMLInputElement | null>(null);
  const chars = value.padEnd(length, " ").slice(0, length).split("");

  const setAt = (i: number, ch: string) => {
    const next = value.split("");
    while (next.length < length) next.push("");
    next[i] = ch;
    onChange(next.join("").replace(/\s+/g, "").slice(0, length));
  };

  const onCellKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && !chars[i].trim() && i > 0) {
      cellRefs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i < length - 1) cellRefs.current[i + 1]?.focus();
    if (e.key === "ArrowRight" && i > 0) cellRefs.current[i - 1]?.focus();
  };

  const onCellPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    cellRefs.current[Math.min(text.length, length - 1)]?.focus();
  };

  // Safari iOS: overlay input receives the full autofill value.
  // We use setTimeout(0) because Safari fires onInput before the full
  // autofill string is committed to input.value — reading it synchronously
  // drops the first character.
  const onOverlayInput = (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    setTimeout(() => {
      const text = (el.value ?? "").replace(/\D/g, "").slice(0, length);
      if (!text) return;
      onChange(text);
      el.value = "";
      cellRefs.current[Math.min(text.length - 1, length - 1)]?.focus();
    }, 0);
  };

  return (
    <div dir="ltr" className="relative flex items-center justify-center gap-2">
      {/* Overlay input — full size, transparent, sits on top for Safari SMS autofill */}
      <input
        ref={overlayRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        onInput={onOverlayInput}
        disabled={disabled}
        aria-label="קוד אימות"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          fontSize: 16, // prevents iOS zoom on focus
          zIndex: 10,
          cursor: "text",
          caretColor: "transparent",
          background: "transparent",
          border: "none",
          outline: "none",
        }}
      />

      {/* Visual digit cells */}
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            cellRefs.current[i] = el;
          }}
          value={chars[i].trim()}
          disabled={disabled}
          onPaste={onCellPaste}
          onKeyDown={(e) => onCellKey(e, i)}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, ch);
            if (ch && i < length - 1) cellRefs.current[i + 1]?.focus();
          }}
          inputMode="numeric"
          maxLength={1}
          tabIndex={-1}
          autoComplete="off"
          className={cn(
            "relative h-14 w-11 rounded-2xl border-2 border-hair bg-card text-center text-2xl font-semibold text-foreground",
            "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
          )}
        />
      ))}
    </div>
  );
}
