import React from "react";
import { LogIn, Settings, ShieldAlert } from "lucide-react";
import { OblivionLogo } from "./OblivionLogo";

interface AuthRetryCardProps {
  onSignIn: () => void;
  onOpenSettings?: () => void;
  title?: string;
  subtitle?: string;
}

export function AuthRetryCard({
  onSignIn,
  onOpenSettings,
  title = "Sign-in session could not be verified",
  subtitle = "Your login was rejected or the session is no longer valid. Please try signing in again.",
}: AuthRetryCardProps) {
  return (
    <div
      data-theme="designer"
      className="relative z-50 flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#051911] via-[#0a2b20] to-[#051911] font-sans px-6 py-10"
    >
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-emerald-400/20 bg-[#072018]/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-red-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            Session check failed
          </span>
        </div>

        <OblivionLogo variant="full" colorMode="official" size={64} />

        <div className="space-y-2 text-center">
          <h1 className="text-lg font-bold tracking-wide">{title}</h1>
          <p className="text-sm leading-relaxed text-emerald-100/80">{subtitle}</p>
        </div>

        <button
          onClick={onSignIn}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#dfbe7a] to-[#9a7732] px-4 py-3.5 text-sm font-bold tracking-wide text-emerald-950 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
        >
          <LogIn className="h-4 w-4" />
          Sign in with Google
        </button>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-transparent px-4 py-3 text-sm font-semibold tracking-wide text-emerald-100 transition-colors hover:bg-emerald-400/10"
          >
            <Settings className="h-4 w-4" />
            Open Settings
          </button>
        )}
      </div>
    </div>
  );
}
