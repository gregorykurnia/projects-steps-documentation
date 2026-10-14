import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-page items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-text">
            AI Build Log
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        AI Build Log · models, tokens, cost and time per step
      </footer>
    </div>
  );
}
