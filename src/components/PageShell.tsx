import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-4">
        <Link to="/" className="flex items-center gap-2 text-brand">
          <span className="text-2xl font-extrabold tracking-tight">TruCare</span>
        </Link>
      </div>
    </header>
  );
}
