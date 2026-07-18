import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PatientAuthMenu } from "@/components/PatientAuthMenu";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  hideHeader?: boolean;
  wide?: boolean;
}

export function PageShell({ children, className, hideHeader, wide }: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {!hideHeader && <TruCareHeader />}
      <main
        className={cn(
          "mx-auto w-full px-4 pb-16 pt-6 sm:px-6",
          wide ? "max-w-6xl" : "max-w-xl",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function TruCareHeader() {
  return (
    <header className="border-b border-hair bg-background">
      <div className="mx-auto grid max-w-6xl grid-cols-3 items-center px-4 py-4">
        {/* Leading slot (right side in RTL) — kept for balance */}
        <div className="flex items-center justify-start" />
        <Link to="/" className="flex items-center justify-center gap-2 text-brand">
          <span className="text-2xl font-extrabold tracking-tight">TruCare</span>
        </Link>
        <div className="flex items-center justify-end">
          <PatientAuthMenu />
        </div>
      </div>
    </header>
  );
}
