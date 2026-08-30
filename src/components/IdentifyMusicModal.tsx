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
      case "cyberpunk-neon":
        return {
          accentHex: "#06b6d4",
          badgeBg: "bg-cyan-500/15",
          accentText: "text-cyan-400",
          btnPrimary: "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/25 font-bold",
          btnActive: "bg-cyan-400 text-slate-950",
          glowBg: "bg-cyan-500/20",
          pulseBg: "bg-cyan-500/20",
          ringBorder: "border-cyan-400/40",
          ringColor: "ring-cyan-400/30",
          cardBorder: "border-cyan-500/40",
          cardBg: "bg-cyan-500/10",
        };
      case "ytmusic-red":
        return {
          accentHex: "#dc2626",
          badgeBg: "bg-red-600/15",
          accentText: "text-red-500",
          btnPrimary: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/25 font-bold",
          btnActive: "bg-red-600 text-white",
          glowBg: "bg-red-600/20",
          pulseBg: "bg-red-600/20",
          ringBorder: "border-red-500/40",
          ringColor: "ring-red-500/30",
          cardBorder: "border-red-500/40",
          cardBg: "bg-red-600/10",
        };
      case "dynamic-emerald":
        return {
          accentHex: "#10b981",
          badgeBg: "bg-emerald-500/15",
          accentText: "text-emerald-400",
          btnPrimary: "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 font-bold",
          btnActive: "bg-emerald-500 text-slate-950",
          glowBg: "bg-emerald-500/20",
          pulseBg: "bg-emerald-500/20",
          ringBorder: "border-emerald-400/40",
          ringColor: "ring-emerald-400/30",
          cardBorder: "border-emerald-500/40",
          cardBg: "bg-emerald-500/10",
        };
      case "audiophile-gold":
        return {
          accentHex: "#f59e0b",
          badgeBg: "bg-amber-500/15",
          accentText: "text-amber-400",
          btnPrimary: "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg shadow-amber-500/25 font-bold",
          btnActive: "bg-amber-500 text-stone-950",
          glowBg: "bg-amber-500/20",
          pulseBg: "bg-amber-500/20",
          ringBorder: "border-amber-400/40",
          ringColor: "ring-amber-400/30",
          cardBorder: "border-amber-500/40",
          cardBg: "bg-amber-500/10",
        };
      case "twilight-vaporwave":
        return {
          accentHex: "#a855f7",
          badgeBg: "bg-purple-600/15",
          accentText: "text-purple-300",
          btnPrimary: "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 font-bold",
          btnActive: "bg-purple-600 text-white",
          glowBg: "bg-purple-600/20",
          pulseBg: "bg-purple-600/20",
          ringBorder: "border-purple-400/40",
          ringColor: "ring-purple-400/30",
          cardBorder: "border-purple-500/40",
          cardBg: "bg-purple-600/10",
        };
      case "designer":
      default:
        return {
          accentHex: "#c89b3c",
          badgeBg: "bg-[#c89b3c]/15",
          accentText: "text-[#b88928]",
          btnPrimary: "bg-[#c89b3c] hover:bg-[#d8a846] text-black shadow-md shadow-[#c89b3c]/25 font-bold",
          btnActive: "bg-[#c89b3c] text-black",
          glowBg: "bg-[#c89b3c]/20",
          pulseBg: "bg-[#c89b3c]/20",
          ringBorder: "border-[#c89b3c]/40",
          ringColor: "ring-[#c89b3c]/30",
          cardBorder: "border-[#c89b3c]/40",
          cardBg: "bg-[#c89b3c]/5",
        };
    }
  })();

  const modalTitleClass =
    designConfig.isLight || designConfig.id === "designer"
      ? "text-[#181816] font-black"
      : designConfig.id === "audiophile-gold"
      ? "text-amber-50 font-extrabold"
      : designConfig.id === "twilight-vaporwave"
      ? "text-purple-50 font-extrabold"
      : "text-white font-extrabold";

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
        className={`relative w-full max-w-md ${designConfig.modalBg || designConfig.cardBg} border ${designConfig.borderSubtle} rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 flex flex-col items-center text-center overflow-hidden`}
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
            <h2 className={`text-lg sm:text-xl tracking-tight ${modalTitleClass}`}>
              Identify Music
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${
              designConfig.isLight
                ? "text-[#57534a] hover:text-[#181816] hover:bg-black/5"
                : `${designConfig.textMuted} hover:${designConfig.textPrimary} hover:bg-white/10`
            } transition-colors`}
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
                <Mic className="w-9 h-9 animate-bounce" />
              ) : status === "analyzing" ? (
                <Sparkles className="w-9 h-9 animate-spin" />
              ) : status === "matched" ? (
                <RotateCcw className="w-8 h-8" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>
          </div>

          {/* Status Text Display */}
          <div className="mt-5 space-y-1">
            <h3 className={`text-base font-bold ${designConfig.isLight ? "text-[#181816]" : designConfig.textPrimary} flex items-center justify-center gap-2`}>
              {status === "matched" && <CheckCircle2 className="w-5 h-5 text-emerald-500 inline" />}
              {status === "error" && <AlertCircle className="w-5 h-5 text-rose-500 inline" />}
              <span>{statusMessage}</span>
            </h3>
            <p className={`text-xs ${designConfig.textMuted} max-w-xs mx-auto`}>
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
          <div className={`w-full p-4 rounded-2xl ${designConfig.cardBg} border ${themeStyles.cardBorder} ${themeStyles.cardBg} flex items-center gap-4 text-left shadow-lg animate-fade-in z-10`}>
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
              <h4 className={`text-sm sm:text-base font-bold ${designConfig.isLight ? "text-[#181816]" : designConfig.textPrimary} truncate`} title={matchedSong.title}>
                {matchedSong.title}
              </h4>
              <p className={`text-xs ${designConfig.textMuted} truncate`}>
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
            className={`flex-1 py-3 px-4 rounded-2xl text-xs font-semibold ${
              designConfig.btnSecondary || `${designConfig.pillBg} ${designConfig.textPrimary}`
            } hover:opacity-90 transition-all`}
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
