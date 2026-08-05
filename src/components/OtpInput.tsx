import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
}

/**
 * OTP input component.
 *
 * Renders 6 visual digit cells for Android/desktop, plus a single
 * visually-hidden <input autocomplete="one-time-code"> that Safari iOS
 * uses for SMS autofill. The hidden input is real (not opacity:0 overlay)
 * so Safari treats it as the canonical autofill target.
 */
export function OtpInput({ value, onChange, onComplete, length = 6, disabled }: OtpInputProps) {
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
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

  // Safari iOS autofill target — visually hidden but real DOM input.
  // Safari will fill this with the full OTP code from SMS.
  // We use onInput with a short delay because Safari commits the value
  // asynchronously across multiple input events.
  const safariInputRef = useRef<HTMLInputElement | null>(null);
  const onSafariInput = () => {
    const el = safariInputRef.current;
    if (!el) return;
    // Use requestAnimationFrame to ensure Safari has committed the full value
    requestAnimationFrame(() => {
      const text = el.value.replace(/\D/g, "").slice(0, length);
      if (text.length === 0) return;
      el.value = "";
      onChange(text);
      if (text.length === length) {
        onComplete?.(text);
      } else {
        cellRefs.current[Math.min(text.length - 1, length - 1)]?.focus();
      }
    });
  };

  return (
    <div dir="ltr" className="relative flex items-center justify-center gap-2">
      {/*
        Safari iOS autofill input.
        - position: absolute + clip hides it visually without opacity/pointer tricks
        - font-size 16px prevents iOS zoom
        - NOT autoFocus so it doesn't steal focus from cell inputs on load
        - Safari still detects it and shows "From Messages" suggestion on tap
      */}
      <input
        ref={safariInputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        onInput={onSafariInput}
        disabled={disabled}
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
          fontSize: "16px",
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
          className={cn(
            "h-14 w-11 rounded-2xl border-2 border-hair bg-card text-center text-2xl font-semibold text-foreground",
            "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
          )}
        />
      ))}
    </div>
  );
}
