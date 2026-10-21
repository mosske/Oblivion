import React from "react";
import { LandingView } from "../views/LandingView";
import { AuthModal } from "./AuthModal";

interface AuthGateProps {
  children: React.ReactNode;
  isAuthInitializing: boolean;
  user: any;
  onOpenAuthModal?: () => void;
  designConfig?: any;
}

export const AuthGate: React.FC<AuthGateProps> = ({ 
  children, 
  isAuthInitializing, 
  user, 
  onOpenAuthModal, 
  designConfig 
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  const handleOpenAuthModal = onOpenAuthModal || (() => setIsAuthModalOpen(true));

  // 1. Smooth Initializing State
  if (isAuthInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent opacity-50" />
          <p className="text-sm font-medium opacity-70">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State - Show LandingView
  if (!user) {
    return (
      <div className="relative">
        <LandingView designConfig={designConfig} onOpenAuthModal={handleOpenAuthModal} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            // The success callback in AuthModal handles state updates via setInMemoryAuth
          }}
          designConfig={designConfig}
        />
      </div
    );
  }

  // 3. Authenticated State
  return <>{children}</>;
};
