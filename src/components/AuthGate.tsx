import React from "react";
import { AuthModal } from "./AuthModal";
import { OblivionLogo } from "./OblivionLogo";

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
          {/* A branded spinner using the logo or a standard one */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent opacity-50" />
          <p className="text-sm font-medium opacity-70">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    return (
      <div className="relative">
        {/* 
          We render the children (the shell) but we can also overlay the AuthModal 
          or a landing screen. For now, we'll show the shell and ensure the modal is available.
        */}
        {children}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            // The success callback in AuthModal handles state updates via setInMemoryAuth
          }}
          designConfig={designConfig}
        />
        {/* Optional: Auto-open modal if user is definitely not logged in and no auth is pending */}
        {/* This might be too aggressive depending on user preference, so we'll leave it manual for now */}
      </div>
    );
  }

  // 3. Authenticated State
  return <>{children}</>;
};
