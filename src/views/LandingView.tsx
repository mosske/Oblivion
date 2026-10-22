
import React from "react";
import { AuthModal } from "../components/AuthModal";

export const LandingView = ({ designConfig, onOpenAuthModal }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  const handleGetStarted = () => {
    setIsAuthModalOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-transparent p-4">
      <div className="max-w-4xl text-center">
        <h1 className="mb-6 text-6xl font-bold tracking-tight text-white">
          Welcome to Oblivion
        </h1>
        <p className="mb-10 text-lg text-gray-300 md:text-xl">
          Your personal sanctuary for music. Discover, organize, and immerse yourself in the sounds you love.
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <button
            onClick={handleGetStarted}
            className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-transform hover:scale-105 active:scale-95"
          >
            Get Started
          </button>
          <button
            onClick={handleGetStarted}
            className="rounded-full border border-white px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
          >
            Learn More
          </button>
        </div>
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="mb-2 text-xl font-bold text-white">Sync Everything</h3>
            <p className="text-gray-400">Your music follows you everywhere. Seamless synchronization across all your devices.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="mb-2 text-xl font-bold text-white">Custom Themes</h3>
            <p className="text-gray-400">Express your personality with 20+ stunning themes, from Vaporwave to Cyberpunk.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="mb-2 text-xl font-bold text-white">Pure Experience</h3>
            <p className="text-gray-400">A minimalist interface designed to get out of your way and let the music take center stage.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
