import { useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, onComplete, length = 6, disabled }: OtpInputProps) {
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
  const safariInputRef = useRef<HTMLInputElement | null>(null);
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
    if (text.length === length) onComplete?.(text);
    else cellRefs.current[Math.min(text.length, length - 1)]?.focus();
  };

  // Safari iOS: receives the autofill value via onChange (more reliable than onInput).
  // We call onChange to update the parent state (activates the button),
  // then immediately call onComplete to auto-submit without waiting for a tap.
  const onSafariChange = (e: ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.target.value = "";
    onChange(text);           // update parent state → button becomes active
    if (text.length === length) {
      onComplete?.(text);     // auto-submit immediately
    } else {
      cellRefs.current[Math.min(text.length - 1, length - 1)]?.focus();
    }
  };

  return (
    <div dir="ltr" className="relative flex items-center justify-center gap-2">
      {/*
        Safari iOS autofill input — covers the cell area so Safari can target it,
        but pointerEvents:"none" lets all taps (including the submit button) pass through.
        clip+overflow hides the cursor/text visually.
      */}
      <input
        ref={safariInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        onChange={onSafariChange}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          fontSize: 16,
          pointerEvents: "none", // taps pass through to cells and button below
          zIndex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          caretColor: "transparent",
        }}
      />

      {/* Visual digit cells */}
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { cellRefs.current[i] = el; }}
          value={chars[i].trim()}
          disabled={disabled}
          autoComplete="off"
          onPaste={onCellPaste}
          onKeyDown={(e) => onCellKey(e, i)}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, ch);
            if (ch && i < length - 1) cellRefs.current[i + 1]?.focus();
          }}
          inputMode="numeric"
          maxLength={1}
          style={{ position: "relative", zIndex: 2 }}
          className={cn(
            "h-14 w-11 rounded-2xl border-2 border-hair bg-card text-center text-2xl font-semibold text-foreground",
            "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
          )}
        />
      ))}
    </div>
  );
}
