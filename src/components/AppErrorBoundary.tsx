import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { OblivionLogo } from "./OblivionLogo";

interface FallbackProps {
  error: Error | null;
  reset: () => void;
}

function AppErrorFallback({ error, reset }: FallbackProps) {
  return (
    <div
      data-theme="designer"
      className="relative z-40 flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#051911] via-[#0a2b20] to-[#051911] font-sans px-6 py-10 text-white"
    >
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-emerald-400/20 bg-[#072018]/90 p-8 shadow-2xl backdrop-blur-xl">
        <OblivionLogo variant="full" colorMode="official" size={72} />

        <div className="space-y-2 text-center">
          <h1 className="text-lg font-bold tracking-wide">Oblivion Music</h1>
          <p className="text-sm text-emerald-100/80">Something went wrong while loading the app.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-200">
            <strong className="font-bold text-red-300">Error:</strong> {error.message || "Unknown error"}
          </div>
        )}

        <button
          onClick={reset}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#dfbe7a] to-[#9a7732] px-4 py-3 text-sm font-bold tracking-wide text-emerald-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-3.5-7.1" />
            <path d="M21 4v5h-5" />
          </svg>
          Reload app
        </button>

        <p className="text-center text-[11px] leading-relaxed text-emerald-100/50">
          If the problem persists, try signing in again from Settings.
        </p>
      </div>
    </div>
  );
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  public state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error | null } {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface render-time crashes to the console for debugging without blocking re-render.
    console.error("[AppErrorBoundary] Caught a render error:", error, info);
  }

  public reset(): void {
    this.setState({ hasError: false, error: null });
  }

  public render(): ReactNode {
    const { hasError, error } = this.state;
    if (hasError) {
      return <AppErrorFallback error={error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
