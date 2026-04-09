import type { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-lavender-200 bg-pulse-700 text-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold tracking-tight"
              aria-hidden
            >
              P
            </span>
            <span className="text-lg font-semibold tracking-tight">Pulse</span>
          </div>
          <nav className="text-sm text-pulse-100">
            <span className="rounded-md bg-white/10 px-3 py-1.5">Dashboard</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-lavender-200 bg-lavender-50 py-4 text-center text-xs text-slate-500">
        Pulse video platform · Indigo & lavender
      </footer>
    </div>
  );
}
