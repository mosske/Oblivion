// Player.tsx - Add to component to enable background playback
// Find the audio ref and add these useEffects:

import React, { useRef, useEffect, useState } from "react";
// ... other imports ...

export function Player({
  currentTrack,
  playlist,
  currentTrackIndex,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
}: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // CRITICAL FIX #2: Keep audio playing in background
  useEffect(() => {
    // Create Web Audio context to maintain playback
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      if (isPlaying && ctx.state === 'suspended') {
        ctx.resume().catch(e => console.log('Audio context resume:', e));
      }
    } catch (error) {
      console.error('Audio context error:', error);
    }
  }, [isPlaying]);

  // CRITICAL FIX #2: Prevent pause when app is backgrounded
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && audioRef.current && isPlaying) {
        // App came back to focus, ensure playback continues
        audioRef.current.play().catch(e => {
          console.log('Resume playback error:', e);
        });
      }
    };

    const handleBeforeUnload = () => {
      // Don't pause when navigating
      if (audioRef.current && isPlaying) {
        // Save current state
        localStorage.setItem('oblivion_playback_time', String(audioRef.current.currentTime));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isPlaying]);

  // Sync audio playback with isPlaying state
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error('Play error:', err);
        // If autoplay fails, that's okay - user can click play button
      });
    } else if (!isPlaying && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  // ... rest of component ...

  // In the audio element, ensure proper attributes:
  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack ? `https://www.youtube.com/watch?v=${currentTrack.youtubeVideoId}` : ''}
        crossOrigin="anonymous"
        controlsList="nodownload"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={onNext}
        // CRITICAL: Allow playback in background
        onPause={(e) => {
          // Don't auto-pause on visibility changes
          if (document.hidden && isPlaying) {
            audioRef.current?.play().catch(() => {});
          }
        }}
      />
      
      {/* Mini player and expanded view JSX */}
    </>
  );
}