import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Search, X, Music, AlertCircle, Sparkles, CheckCircle2, RotateCcw, Radio } from "lucide-react";
import { FullAppDesignConfig } from "../utils/appDesignThemes";

interface MatchedSong {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  genre?: string;
  url?: string;
}

interface IdentifyMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (searchQuery: string) => void;
  designConfig: FullAppDesignConfig;
}

export const IdentifyMusicModal: React.FC<IdentifyMusicModalProps> = ({
  isOpen,
  onClose,
  onSelectSong,
  designConfig,
}) => {
  const [status, setStatus] = useState<"idle" | "listening" | "analyzing" | "matched" | "nomatch" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("Tap to listen");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [matchedSong, setMatchedSong] = useState<MatchedSong | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [audioVolume, setAudioVolume] = useState<number>(0);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const RECORDING_DURATION_MS = 5000;

  // Derive theme-specific colors and visual states
  const themeStyles = (() => {
    switch (designConfig.id) {
      case "candyland":
        return {
          accentHex: "#ff70a6",
          badgeBg: "bg-[#ff70a6]/20 border border-pink-300/80 text-[#ff70a6] font-bold shadow-xs",
          accentText: "text-[#ff70a6]",
          btnPrimary: "bg-gradient-to-r from-[#ff70a6] via-[#ff8fab] to-[#ffd166] hover:brightness-105 text-white shadow-lg shadow-[#ff70a6]/35 font-extrabold active:scale-95 border border-white/40",
          btnSecondary: "bg-white/90 hover:bg-white text-[#3b1235] border-2 border-pink-200 font-bold shadow-xs active:scale-95",
          btnActive: "bg-gradient-to-r from-[#ff70a6] via-[#ff8fab] to-[#ffd166] text-white ring-4 ring-[#ff70a6]/40",
          glowBg: "bg-pink-400/30",
          pulseBg: "bg-pink-400/35",
          ringBorder: "border-pink-300",
          ringColor: "ring-[#ff70a6]/40",
          cardBorder: "border-pink-200",
          cardBg: "bg-white/95 border-2 border-pink-200/80 shadow-md shadow-pink-100/60",
          modalBg: "bg-[#fff8fa] border-2 border-pink-200/90 shadow-2xl",
          modalTitle: "text-[#3b1235] font-black",
          closeBtn: "text-[#6b2d5f] hover:text-[#3b1235] hover:bg-pink-100/80 border border-pink-200/50 bg-white/70",
          statusTitle: "text-[#3b1235] font-black",
          statusSubtitle: "text-[#6b2d5f] font-medium",
          trackTitle: "text-[#3b1235] font-bold",
          trackArtist: "text-[#ff70a6] font-semibold",
          iconColor: "text-white",
        };
      case "obsidian-depth":
        return {
          accentHex: "#38bdf8",
          badgeBg: "bg-[#22252e] border border-white/[0.06] shadow-[inset_3px_3px_6px_#14161d,inset_-2px_-2px_5px_rgba(255,255,255,0.06)] text-[#38bdf8] font-bold",
          accentText: "text-[#38bdf8]",
          btnPrimary: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7] hover:brightness-110 text-[#091524] shadow-[7px_7px_18px_#14161e,-5px_-5px_14px_rgba(255,255,255,0.12),0_0_24px_rgba(56,189,248,0.4)] font-black active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5)] active:scale-95 transition-all border border-white/30",
          btnSecondary: "bg-gradient-to-br from-[#323744] to-[#252932] hover:text-white text-[#38bdf8] border border-white/[0.08] shadow-[6px_6px_14px_#14161e,-5px_-5px_12px_rgba(255,255,255,0.06)] active:shadow-[inset_3px_3px_7px_#13151b,inset_-2px_-2px_4px_rgba(255,255,255,0.05)] font-bold transition-all",
          btnActive: "bg-gradient-to-r from-[#a5f3fc] via-[#38bdf8] to-[#0284c7] text-[#091524] shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4)]",
          glowBg: "bg-sky-400/30",
          pulseBg: "bg-sky-400/35",
          ringBorder: "border-sky-400/70",
          ringColor: "ring-sky-400/50",
          cardBorder: "border-white/[0.06]",
          cardBg: "bg-gradient-to-br from-[#323744] to-[#252932] shadow-[10px_10px_22px_#14161e,-8px_-8px_20px_rgba(255,255,255,0.07),inset_0_1px_1px_rgba(255,255,255,0.12)]",
          modalBg: "bg-[#2a2e38] border border-white/[0.08] shadow-[20px_20px_45px_#14161e,-16px_-16px_36px_rgba(255,255,255,0.06)]",
          modalTitle: "text-slate-100 font-extrabold tracking-tight",
          closeBtn: "bg-gradient-to-br from-[#323744] to-[#252932] text-slate-300 hover:text-white border border-white/[0.08] shadow-[5px_5px_12px_#14161e,-4px_-4px_10px_rgba(255,255,255,0.06)] active:shadow-[inset_3px_3px_6px_#13151b]",
          statusTitle: "text-slate-100 font-bold",
          statusSubtitle: "text-slate-400 font-medium",
          trackTitle: "text-slate-100 font-bold",
          trackArtist: "text-[#38bdf8] font-semibold",
          iconColor: "text-[#091524]",
        };
      case "cyberpunk-neon":
        return {
          accentHex: "#06b6d4",
          badgeBg: "bg-cyan-500/15 border border-cyan-500/30",
          accentText: "text-cyan-400",
          btnPrimary: "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/25 font-bold",
          btnSecondary: "bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-semibold",
          btnActive: "bg-cyan-400 text-slate-950",
          glowBg: "bg-cyan-500/20",
          pulseBg: "bg-cyan-500/20",
          ringBorder: "border-cyan-400/40",
          ringColor: "ring-cyan-400/30",
          cardBorder: "border-cyan-500/40",
          cardBg: "bg-slate-900/90",
          modalBg: "bg-slate-950/95 border border-cyan-500/30 shadow-2xl",
          modalTitle: "text-white font-extrabold",
          closeBtn: "text-slate-400 hover:text-cyan-400 hover:bg-white/10",
          statusTitle: "text-slate-100",
          statusSubtitle: "text-slate-400",
          trackTitle: "text-slate-100",
          trackArtist: "text-slate-400",
          iconColor: "text-slate-950",
        };
      case "ytmusic-red":
        return {
          accentHex: "#dc2626",
          badgeBg: "bg-red-600/15 border border-red-500/30",
          accentText: "text-red-500",
          btnPrimary: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 font-bold",
          btnSecondary: "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-red-900/40 font-semibold",
          btnActive: "bg-red-600 text-white",
          glowBg: "bg-red-600/20",
          pulseBg: "bg-red-600/20",
          ringBorder: "border-red-500/40",
          ringColor: "ring-red-500/30",
          cardBorder: "border-red-500/40",
          cardBg: "bg-zinc-900/90",
          modalBg: "bg-zinc-950/95 border border-red-500/30 shadow-2xl",
          modalTitle: "text-white font-extrabold",
          closeBtn: "text-zinc-400 hover:text-red-400 hover:bg-white/10",
          statusTitle: "text-zinc-100",
          statusSubtitle: "text-zinc-400",
          trackTitle: "text-zinc-100",
          trackArtist: "text-zinc-400",
          iconColor: "text-white",
        };
      case "dynamic-emerald":
        return {
          accentHex: "#10b981",
          badgeBg: "bg-emerald-500/15 border border-emerald-500/30",
          accentText: "text-emerald-400",
          btnPrimary: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 font-bold",
          btnSecondary: "bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 font-semibold",
          btnActive: "bg-emerald-500 text-slate-950",
          glowBg: "bg-emerald-500/20",
          pulseBg: "bg-emerald-500/20",
          ringBorder: "border-emerald-400/40",
          ringColor: "ring-emerald-400/30",
          cardBorder: "border-emerald-500/40",
          cardBg: "bg-slate-900/90",
          modalBg: "bg-slate-950/95 border border-emerald-500/30 shadow-2xl",
          modalTitle: "text-slate-100 font-extrabold",
          closeBtn: "text-slate-400 hover:text-emerald-400 hover:bg-white/10",
          statusTitle: "text-slate-100",
          statusSubtitle: "text-slate-400",
          trackTitle: "text-slate-100",
          trackArtist: "text-slate-400",
          iconColor: "text-slate-950",
        };
      case "audiophile-gold":
        return {
          accentHex: "#f59e0b",
          badgeBg: "bg-amber-500/15 border border-amber-800/40",
          accentText: "text-amber-400",
          btnPrimary: "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/25 font-bold",
          btnSecondary: "bg-[#2c1a0e] hover:bg-[#382213] text-amber-200 border border-amber-800/50 font-semibold",
          btnActive: "bg-amber-500 text-stone-950",
          glowBg: "bg-amber-500/20",
          pulseBg: "bg-amber-500/20",
          ringBorder: "border-amber-400/40",
          ringColor: "ring-amber-400/30",
          cardBorder: "border-amber-500/40",
          cardBg: "bg-[#211208]/95",
          modalBg: "bg-[#211208]/98 border border-amber-900/50 shadow-2xl",
          modalTitle: "text-amber-50 font-extrabold",
          closeBtn: "text-amber-300/60 hover:text-amber-100 hover:bg-amber-950/50",
          statusTitle: "text-amber-50",
          statusSubtitle: "text-amber-300/70",
          trackTitle: "text-amber-100",
          trackArtist: "text-amber-300/70",
          iconColor: "text-stone-950",
        };
      case "twilight-vaporwave":
        return {
          accentHex: "#ff2a8d",
          badgeBg: "bg-pink-600/15 border border-pink-500/30",
          accentText: "text-pink-400",
          btnPrimary: "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg shadow-pink-500/30 font-bold",
          btnSecondary: "bg-[#250d3a]/80 hover:bg-[#33134e] text-pink-200 border border-pink-500/30 font-semibold",
          btnActive: "bg-pink-500 text-white",
          glowBg: "bg-pink-500/20",
          pulseBg: "bg-pink-500/20",
          ringBorder: "border-pink-400/40",
          ringColor: "ring-pink-400/30",
          cardBorder: "border-pink-500/40",
          cardBg: "bg-[#180927]/90",
          modalBg: "bg-[#130720]/95 border border-pink-500/30 shadow-2xl",
          modalTitle: "text-pink-50 font-extrabold",
          closeBtn: "text-pink-300/60 hover:text-pink-100 hover:bg-pink-900/30",
          statusTitle: "text-pink-50",
          statusSubtitle: "text-pink-300/70",
          trackTitle: "text-pink-100",
          trackArtist: "text-pink-300/70",
          iconColor: "text-white",
        };
      case "neue-editorial":
        return {
          accentHex: "#1F1F1F",
          badgeBg: "bg-[#1F1F1F]/10 border border-[#1F1F1F]/20",
          accentText: "text-[#1F1F1F]",
          btnPrimary: "bg-[#1F1F1F] hover:bg-[#3A3530] text-[#F2E8D8] shadow-md shadow-black/20 font-bold rounded-full",
          btnSecondary: "bg-[#F2E8D8] hover:bg-[#E5DAC8] text-[#1F1F1F] border border-[#1F1F1F]/30 font-semibold rounded-full",
          btnActive: "bg-[#1F1F1F] text-[#F2E8D8]",
          glowBg: "bg-[#1F1F1F]/10",
          pulseBg: "bg-[#1F1F1F]/10",
          ringBorder: "border-[#1F1F1F]/30",
          ringColor: "ring-[#1F1F1F]/20",
          cardBorder: "border-[#1F1F1F]/15",
          cardBg: "bg-[#FDFBF7]",
          modalBg: "bg-[#FDFBF7] border border-[#1F1F1F]/20 shadow-2xl",
          modalTitle: "text-[#1F1F1F] font-black",
          closeBtn: "text-[#666055] hover:text-[#1F1F1F] hover:bg-black/5",
          statusTitle: "text-[#1F1F1F]",
          statusSubtitle: "text-[#666055]",
          trackTitle: "text-[#1F1F1F]",
          trackArtist: "text-[#666055]",
          iconColor: "text-[#F2E8D8]",
        };
      case "designer":
      default:
        return {
          accentHex: "#c89b3c",
          badgeBg: "bg-[#c89b3c]/15 border border-[#c89b3c]/30",
          accentText: "text-[#b88928]",
          btnPrimary: "bg-[#c89b3c] hover:bg-[#d8a846] text-black shadow-md shadow-[#c89b3c]/25 font-bold",
          btnSecondary: "bg-[#ebe7dc] hover:bg-[#dfd9cb] text-[#1a201c] font-semibold border border-[#d8d2c4]",
          btnActive: "bg-[#c89b3c] text-black",
          glowBg: "bg-[#c89b3c]/20",
          pulseBg: "bg-[#c89b3c]/20",
          ringBorder: "border-[#c89b3c]/40",
          ringColor: "ring-[#c89b3c]/30",
          cardBorder: "border-[#c89b3c]/40",
          cardBg: "bg-[#f8f6f0]",
          modalBg: "bg-[#f8f6f0] border border-[#e6e2d8] shadow-2xl",
          modalTitle: "text-[#181816] font-black",
          closeBtn: "text-[#666258] hover:text-[#181816] hover:bg-black/5",
          statusTitle: "text-[#181816]",
          statusSubtitle: "text-[#8a857b]",
          trackTitle: "text-[#181816]",
          trackArtist: "text-[#666258]",
          iconColor: "text-black",
        };
    }
  })();

  // Cleanup on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      cleanupAudio();
      setStatus("idle");
      setStatusMessage("Tap to listen");
      setMatchedSong(null);
      setErrorMessage("");
      setProgress(0);
      setAudioVolume(0);
    }
  }, [isOpen]);

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {}
      scriptProcessorRef.current = null;
    }
    if (analyserRef.current) {
      try {
        analyserRef.current.disconnect();
      } catch {}
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    recordedChunksRef.current = [];
  };

  const startListening = async () => {
    cleanupAudio();
    setStatus("listening");
    setStatusMessage("Listening to audio...");
    setMatchedSong(null);
    setErrorMessage("");
    setProgress(0);
    setAudioVolume(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserRef.current = analyserNode;

      // Buffer audio data
      const bufferSize = 4096;
      const scriptNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
      scriptProcessorRef.current = scriptNode;

      recordedChunksRef.current = [];

      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Clone float array
        recordedChunksRef.current.push(new Float32Array(inputData));
      };

      sourceNode.connect(analyserNode);
      analyserNode.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);

      // Volume monitoring for visualizer
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      const updateVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioVolume(Math.min(1, avg / 100));
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Countdown progress
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, Math.round((elapsed / RECORDING_DURATION_MS) * 100));
        setProgress(pct);

        if (elapsed >= RECORDING_DURATION_MS) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
          analyzeAudio(audioCtx.sampleRate);
        }
      }, 50);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      cleanupAudio();
      setStatus("error");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Microphone permission was denied. Please allow microphone access in your browser settings to identify music.");
      } else {
        setErrorMessage(err.message || "Failed to access microphone. Please check your audio input devices.");
      }
      setStatusMessage("Microphone Error");
    }
  };

  const analyzeAudio = async (origSampleRate: number) => {
    setStatus("analyzing");
    setStatusMessage("Analyzing audio fingerprint...");
    setProgress(100);

    // Merge recorded float chunks
    const chunks = recordedChunksRef.current;
    let totalSamples = 0;
    for (const c of chunks) totalSamples += c.length;

    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    // Downsample / resample to 16000Hz
    const targetSampleRate = 16000;
    const resampled = resampleTo16k(merged, origSampleRate, targetSampleRate);

    // Free microphone resources
    cleanupAudio();

    try {
      // Send samples to server endpoint
      const samplesArray = Array.from(resampled);

      const response = await fetch("/api/identify-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samples: samplesArray,
          sampleRate: targetSampleRate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.match && result.match.title) {
        setMatchedSong(result.match);
        setStatus("matched");
        setStatusMessage("Song Found!");
      } else {
        setStatus("nomatch");
        setStatusMessage("No match found");
        setErrorMessage(result.message || "Could not identify the song. Make sure the music is clearly audible and try again.");
      }
    } catch (err: any) {
      console.error("Audio recognition error:", err);
      setStatus("error");
      setStatusMessage("Recognition Failed");
      setErrorMessage(err.message || "An error occurred while identifying the music. Please try again.");
    }
  };

  const resampleTo16k = (audioData: Float32Array, origRate: number, targetRate: number = 16000): Float32Array => {
    if (origRate === targetRate) return audioData;
    const ratio = origRate / targetRate;
    const newLength = Math.round(audioData.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origIndex = i * ratio;
      const indexLow = Math.floor(origIndex);
      const indexHigh = Math.min(indexLow + 1, audioData.length - 1);
      const weight = origIndex - indexLow;
      result[i] = audioData[indexLow] * (1 - weight) + audioData[indexHigh] * weight;
    }
    return result;
  };

  const handleSearchSong = () => {
    if (matchedSong) {
      const searchQuery = `${matchedSong.title} ${matchedSong.artist}`.trim();
      onSelectSong(searchQuery);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none">
      <div
        className={`relative w-full max-w-md ${themeStyles.modalBg} rounded-3xl p-6 sm:p-8 space-y-6 flex flex-col items-center text-center overflow-hidden`}
      >
        {/* Background glow when active */}
        {status === "listening" && (
          <div
            className={`absolute -top-20 -left-20 w-80 h-80 rounded-full ${themeStyles.glowBg} blur-3xl pointer-events-none transition-all duration-700 animate-pulse`}
            style={{ transform: `scale(${1 + audioVolume * 0.8})` }}
          />
        )}
        {status === "matched" && (
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none transition-all duration-700" />
        )}

        {/* Modal Header */}
        <div className="w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${themeStyles.badgeBg} ${themeStyles.accentText}`}>
              <Radio className="w-5 h-5" />
            </div>
            <h2 className={`text-lg sm:text-xl tracking-tight ${themeStyles.modalTitle}`}>
              Identify Music
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${themeStyles.closeBtn} transition-all`}
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Visualizer & Action Area */}
        <div className="w-full flex flex-col items-center justify-center py-2 z-10">
          {/* Animated Central Button */}
          <div className="relative flex items-center justify-center">
            {/* Outer Pulsing Wave Rings during listening */}
            {status === "listening" && (
              <>
                <div
                  className={`absolute rounded-full ${themeStyles.pulseBg} animate-ping`}
                  style={{
                    width: `${140 + audioVolume * 60}px`,
                    height: `${140 + audioVolume * 60}px`,
                    animationDuration: "2s",
                  }}
                />
                <div
                  className={`absolute rounded-full border-2 ${themeStyles.ringBorder} animate-pulse`}
                  style={{
                    width: `${120 + audioVolume * 40}px`,
                    height: `${120 + audioVolume * 40}px`,
                  }}
                />
              </>
            )}

            {/* Circular Progress Ring */}
            {status === "listening" && (
              <svg className="absolute w-32 h-32 -rotate-90 pointer-events-none">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  className={designConfig.isLight ? "stroke-black/10 fill-none" : "stroke-white/10 fill-none"}
                  strokeWidth="4"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  style={{ stroke: themeStyles.accentHex }}
                  className="fill-none transition-all duration-100 ease-linear"
                  strokeWidth="4"
                  strokeDasharray={351.8}
                  strokeDashoffset={351.8 - (351.8 * progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
            )}

            <button
              onClick={status === "listening" ? cleanupAudio : startListening}
              disabled={status === "analyzing"}
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 transform active:scale-95 ${
                status === "listening"
                  ? `${themeStyles.btnActive} ring-4 ${themeStyles.ringColor} scale-105`
                  : status === "analyzing"
                  ? "bg-slate-700 text-slate-300 animate-pulse cursor-wait"
                  : status === "matched"
                  ? "bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105"
                  : `${themeStyles.btnPrimary} hover:scale-105`
              }`}
              title={status === "listening" ? "Stop Listening" : "Tap to listen"}
            >
              {status === "listening" ? (
                <Mic className={`w-9 h-9 animate-bounce ${themeStyles.iconColor}`} />
              ) : status === "analyzing" ? (
                <Sparkles className="w-9 h-9 animate-spin" stroke="currentColor" />
              ) : status === "matched" ? (
                <RotateCcw className="w-8 h-8 text-white" />
              ) : (
                <Mic className={`w-9 h-9 ${themeStyles.iconColor}`} />
              )}
            </button>
          </div>

          {/* Status Text Display */}
          <div className="mt-5 space-y-1">
            <h3 className={`text-base font-bold ${themeStyles.statusTitle} flex items-center justify-center gap-2`}>
              {status === "matched" && <CheckCircle2 className="w-5 h-5 text-emerald-500 inline" />}
              {status === "error" && <AlertCircle className="w-5 h-5 text-rose-500 inline" />}
              <span>{statusMessage}</span>
            </h3>
            <p className={`text-xs ${themeStyles.statusSubtitle} max-w-xs mx-auto`}>
              {status === "idle" && "Play music from another device or hum into your microphone."}
              {status === "listening" && `Listening... ${Math.ceil((RECORDING_DURATION_MS * (1 - progress / 100)) / 1000)}s`}
              {status === "analyzing" && "Matching acoustic fingerprint against music database..."}
              {status === "matched" && "We found a match for your audio snippet!"}
              {status === "nomatch" && "No match found. Try again closer to the sound source."}
              {status === "error" && errorMessage}
            </p>
          </div>
        </div>

        {/* Matched Result Card (Hidden until match is found) */}
        {matchedSong && (
          <div className={`w-full p-4 rounded-2xl ${themeStyles.cardBg} border ${themeStyles.cardBorder} flex items-center gap-4 text-left shadow-lg animate-fade-in z-10`}>
            <div className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border ${themeStyles.cardBorder} shadow-md bg-slate-800 flex items-center justify-center`}>
              {matchedSong.artwork ? (
                <img
                  src={matchedSong.artwork}
                  alt={matchedSong.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Music className={`w-8 h-8 ${themeStyles.accentText}`} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${themeStyles.accentText}`}>
                Identified Track
              </span>
              <h4 className={`text-sm sm:text-base font-bold ${themeStyles.trackTitle} truncate`} title={matchedSong.title}>
                {matchedSong.title}
              </h4>
              <p className={`text-xs ${themeStyles.trackArtist} truncate`}>
                {matchedSong.artist}
                {matchedSong.album ? ` • ${matchedSong.album}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="w-full flex items-center gap-3 pt-2 z-10">
          <button
            onClick={onClose}
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-semibold ${themeStyles.btnSecondary} hover:opacity-90 transition-all`}
          >
            Cancel
          </button>

          {matchedSong ? (
            <button
              onClick={handleSearchSong}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold ${themeStyles.btnPrimary} transition-all shadow-md flex items-center justify-center gap-2 active:scale-95`}
            >
              <Search className="w-4 h-4" />
              <span>Search Song</span>
            </button>
          ) : (
            <button
              onClick={status === "listening" ? cleanupAudio : startListening}
              disabled={status === "analyzing"}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                status === "listening"
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : themeStyles.btnPrimary
              }`}
            >
              {status === "listening" ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>{status === "idle" ? "Listen" : "Listen Again"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
