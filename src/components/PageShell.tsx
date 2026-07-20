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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!hideHeader && <TruCareHeader />}
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pb-16 pt-6 sm:px-6",
          wide ? "max-w-6xl" : "max-w-xl",
          className,
        )}
      >
        {children}
      </main>
      <footer className="border-t border-hair bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row sm:px-6">
          <img
            src="/AstraZeneca-Logo.png"
            alt="AstraZeneca"
            className="h-12 w-auto object-contain"
          />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms-of-use" className="hover:text-foreground">תנאי שימוש</Link>
            <Link to="/privacy-policy" className="hover:text-foreground">מדיניות פרטיות</Link>
            <span>POWERED BY B-ONLINE</span>
          </div>
        </div>
      </footer>
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
