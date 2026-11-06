import React from "react";
import { OblivionLogo } from "./OblivionLogo";

interface LoadingScreenProps {
  label?: string;
}

export function LoadingScreen({ label = "Loading Oblivion Music…" }: LoadingScreenProps) {
  return (
    <div
      data-theme="designer"
      className="relative z-40 flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#051911] via-[#0a2b20] to-[#051911] font-sans px-6 py-10"
    >
      <div className="flex flex-col items-center gap-7">
        {/* Animated branded spinner ring */}
        <div className="relative" aria-hidden="true">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#dfbe7a]/30" style={{ width: 96, height: 96, marginLeft: "-48px", marginTop: "-48px" }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-emerald-500/20 border-t-[#dfbe7a]" style={{ animation: "oblivion-spin 1s linear infinite" }} />
        </div>

        <OblivionLogo variant="full" colorMode="official" size={84} />

        <p className="text-sm font-semibold tracking-wide text-emerald-100">{label}</p>
      </div>

      <style>{`
        @keyframes oblivion-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
