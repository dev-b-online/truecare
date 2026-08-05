import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (code: string) => void; // called immediately when 6 digits are ready (Safari autofill)
  length?: number;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, onComplete, length = 6, disabled }: OtpInputProps) {
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

  // Safari iOS autofill: the overlay input receives the full OTP string.
  // We read it in onChange (not onInput) to get the complete value Safari committed.
  const onOverlayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value.replace(/\D/g, "").slice(0, length);
    if (!text) return;

    // update visual cells
    onChange(text);

    // reset overlay so Safari can autofill again if needed
    e.target.value = "";

    // if complete, trigger submit immediately — no need to press the button
    if (text.length === length) {
      onComplete?.(text);
    } else {
      cellRefs.current[Math.min(text.length - 1, length - 1)]?.focus();
    }
  };

  return (
    <div dir="ltr" className="relative flex items-center justify-center gap-2">
      {/* Overlay: single transparent input for Safari iOS SMS autofill */}
      <input
        ref={overlayRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        onChange={onOverlayChange}
        disabled={disabled}
        aria-label="קוד אימות"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          fontSize: 16,
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
          tabIndex={-1}
          className={cn(
            "relative h-14 w-11 rounded-2xl border-2 border-hair bg-card text-center text-2xl font-semibold text-foreground",
            "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30",
          )}
        />
      ))}
    </div>
  );
}
