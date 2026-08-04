import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, length = 6, disabled }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const chars = value.padEnd(length, " ").slice(0, length).split("");

  const setAt = (i: number, ch: string) => {
    const next = value.split("");
    while (next.length < length) next.push("");
    next[i] = ch;
    onChange(next.join("").replace(/\s+/g, "").slice(0, length));
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && !chars[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i < length - 1) refs.current[i + 1]?.focus();
    if (e.key === "ArrowRight" && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  // Safari iOS SMS autofill: a single hidden input with autocomplete="one-time-code"
  // receives the full OTP string, then we distribute it to the visual cells.
  const onHiddenChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/\D/g, "").slice(0, length);
    if (text) {
      onChange(text);
      refs.current[Math.min(text.length - 1, length - 1)]?.focus();
      e.target.value = ""; // reset so it can receive a new code
    }
  };

  return (
    <div dir="ltr" className="relative flex items-center justify-center gap-2">
      {/* Hidden single input for Safari iOS SMS autofill */}
      <input
        ref={hiddenRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        onChange={onHiddenChange}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      />
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={chars[i].trim()}
          disabled={disabled}
          autoComplete="one-time-code"
          onPaste={onPaste}
          onKeyDown={(e) => onKey(e, i)}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, ch);
            if (ch && i < length - 1) refs.current[i + 1]?.focus();
          }}
          inputMode="numeric"
          maxLength={1}
          className={cn(
            "h-14 w-11 rounded-2xl border-2 border-hair bg-card text-center text-2xl font-semibold text-foreground",
            "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
          )}
        />
      ))}
    </div>
  );
}
