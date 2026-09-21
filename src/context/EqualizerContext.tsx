import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  EQ_FREQUENCIES,
  EQ_PRESETS,
  EQState,
  loadSavedEQState,
  saveEQState,
} from "../utils/equalizerEngine";
import { audioPlayer } from "../services/audioPlayer";

export interface EqualizerContextValue {
  eqState: EQState;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
  sourceNodeRef: React.MutableRefObject<MediaElementAudioSourceNode | null>;
  filtersRef: React.MutableRefObject<BiquadFilterNode[]>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  getAnalyser: () => AnalyserNode | null;
  attachAudioElement: (audioElement: HTMLAudioElement) => void;
  setGain: (index: number, newGainValue: number) => void;
  setPreset: (presetName: string) => void;
  resetEQ: () => void;
  resumeAudioContext: () => void;
}

const EqualizerContext = createContext<EqualizerContextValue | null>(null);

export const EqualizerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [eqState, setEqState] = useState<EQState>(() => loadSavedEQState());

  // Persistent React refs to satisfy requirement 2:
  // Store created MediaElementSourceNode, AudioContext, and filters in persistent refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const attachedAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Helper to ensure the Web Audio pipeline and filter chain are eagerly and reliably initialized
  const ensurePipeline = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      try {
        audioCtxRef.current = new AudioCtxClass({ latencyHint: "interactive" });
      } catch {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    const audioCtx = audioCtxRef.current;

    // Create the 7 BiquadFilterNode peaking/shelf filters chain if not yet built
    if (filtersRef.current.length !== EQ_FREQUENCIES.length) {
      const initialGains = loadSavedEQState().gains;
      const filters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = audioCtx.createBiquadFilter();
        if (idx === 0) {
          filter.type = "lowshelf";
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = "highshelf";
        } else {
          filter.type = "peaking";
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = initialGains[idx] ?? 0;
        return filter;
      });
      filtersRef.current = filters;

      // Create analyser node
      if (!analyserRef.current) {
        try {
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;
        } catch {}
      }

      // Chain: Filter 0 -> Filter 1 -> ... -> Filter 6 -> Analyser -> AudioContext.destination
      for (let i = 0; i < filters.length - 1; i++) {
        try {
          filters[i].connect(filters[i + 1]);
        } catch {}
      }

      const lastFilter = filters[filters.length - 1];
      if (analyserRef.current) {
        try {
          lastFilter.connect(analyserRef.current);
          analyserRef.current.connect(audioCtx.destination);
        } catch {
          try {
            lastFilter.connect(audioCtx.destination);
          } catch {}
        }
      } else {
        try {
          lastFilter.connect(audioCtx.destination);
        } catch {}
      }

      audioPlayer.setWebAudioPipeline(audioCtx, filters, sourceNodeRef.current || undefined, analyserRef.current || undefined);
    }

    return audioCtx;
  }, []);

  // Eagerly initialize pipeline on component mount so filters and context exist immediately
  React.useEffect(() => {
    ensurePipeline();
  }, [ensurePipeline]);

  // Resume helper for autoplay restriction handling
  const resumeAudioContext = useCallback(() => {
    const audioCtx = audioCtxRef.current || ensurePipeline();
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch((err) => {
        console.warn("[EqualizerContext] AudioContext resume note:", err);
      });
    }
  }, [ensurePipeline]);

  const getAnalyser = useCallback((): AnalyserNode | null => {
    if (analyserRef.current) return analyserRef.current;
    const audioCtx = ensurePipeline();
    if (audioCtx) {
      return analyserRef.current;
    }
    return null;
  }, [ensurePipeline]);

  // 1. Connect the Audio Graph Correctly & 2. Prevent Duplicate Source Node Errors
  const attachAudioElement = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioElement) return;

    // 1. Ensure crossOrigin = "anonymous" to prevent CORS blocking from silencing or bypassing Web Audio
    try {
      if (audioElement.crossOrigin !== "anonymous") {
        audioElement.crossOrigin = "anonymous";
      }
    } catch {}

    const audioCtx = ensurePipeline();
    if (!audioCtx) return;

    // 4. AudioContext State Management:
    // Handle browser autoplay restrictions by adding event listeners on play/seek actions
    // to automatically call audioCtx.resume() if audioCtx.state === 'suspended'.
    const handleResume = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    audioElement.removeEventListener("play", handleResume);
    audioElement.removeEventListener("playing", handleResume);
    audioElement.removeEventListener("seeking", handleResume);
    audioElement.removeEventListener("seeked", handleResume);
    audioElement.addEventListener("play", handleResume);
    audioElement.addEventListener("playing", handleResume);
    audioElement.addEventListener("seeking", handleResume);
    audioElement.addEventListener("seeked", handleResume);

    // 2. createMediaElementSource(audioRef) can only be called ONCE per HTMLMediaElement instance.
    if (!sourceNodeRef.current || attachedAudioElementRef.current !== audioElement) {
      try {
        sourceNodeRef.current = audioCtx.createMediaElementSource(audioElement);
        attachedAudioElementRef.current = audioElement;
      } catch (err: any) {
        console.warn("[EqualizerContext] createMediaElementSource note (direct audio fallback):", err);
      }
    }

    // Connect source to first filter
    if (sourceNodeRef.current && filtersRef.current[0]) {
      try {
        sourceNodeRef.current.connect(filtersRef.current[0]);
      } catch (err: any) {
        console.warn("[EqualizerContext] source connect note:", err);
      }
    }

    audioPlayer.setWebAudioPipeline(audioCtx, filtersRef.current, sourceNodeRef.current || undefined, analyserRef.current || undefined);
  }, [ensurePipeline]);

  // 3. Live Slider Gain Updates:
  // In the slider onChange handler, directly update the target BiquadFilterNode gain
  const setGain = useCallback((index: number, newGainValue: number) => {
    if (index < 0 || index >= EQ_FREQUENCIES.length) return;
    const clamped = Math.max(-12, Math.min(12, newGainValue));

    const audioCtx = ensurePipeline();
    resumeAudioContext();

    // Direct update on BiquadFilterNode gain for immediate, glitch-free sculpting
    if (filtersRef.current[index]) {
      const filter = filtersRef.current[index];
      try {
        if (audioCtx && audioCtx.state === "running") {
          filter.gain.cancelScheduledValues(audioCtx.currentTime);
          filter.gain.setValueAtTime(clamped, audioCtx.currentTime);
        } else {
          filter.gain.value = clamped;
        }
      } catch {
        filter.gain.value = clamped;
      }
    }

    audioPlayer.setBandGain(index, clamped);

    setEqState((prev) => {
      const nextGains = [...prev.gains];
      nextGains[index] = clamped;

      let matchedPreset = "Custom";
      for (const [name, presetGains] of Object.entries(EQ_PRESETS)) {
        if (presetGains.every((g, i) => Math.abs(g - nextGains[i]) < 0.1)) {
          matchedPreset = name;
          break;
        }
      }

      const nextState: EQState = {
        preset: matchedPreset,
        gains: nextGains,
      };
      saveEQState(nextState);
      return nextState;
    });
  }, [ensurePipeline, resumeAudioContext]);

  // 3. Ensure changing presets updates all 7 filterNode.gain.value properties in real time
  const setPreset = useCallback((presetName: string) => {
    const presetGains = EQ_PRESETS[presetName];
    if (!presetGains) return;

    const audioCtx = ensurePipeline();
    resumeAudioContext();

    presetGains.forEach((gain, idx) => {
      if (filtersRef.current[idx]) {
        const filter = filtersRef.current[idx];
        try {
          if (audioCtx && audioCtx.state === "running") {
            filter.gain.cancelScheduledValues(audioCtx.currentTime);
            filter.gain.setValueAtTime(gain, audioCtx.currentTime);
          } else {
            filter.gain.value = gain;
          }
        } catch {
          filter.gain.value = gain;
        }
      }
    });

    audioPlayer.setPreset(presetName);

    const nextState: EQState = {
      preset: presetName,
      gains: [...presetGains],
    };
    saveEQState(nextState);
    setEqState(nextState);
  }, [ensurePipeline, resumeAudioContext]);

  const resetEQ = useCallback(() => {
    setPreset("Flat");
  }, [setPreset]);

  return (
    <EqualizerContext.Provider
      value={{
        eqState,
        audioCtxRef,
        sourceNodeRef,
        filtersRef,
        analyserRef,
        getAnalyser,
        attachAudioElement,
        setGain,
        setPreset,
        resetEQ,
        resumeAudioContext,
      }}
    >
      {children}
    </EqualizerContext.Provider>
  );
};

export function useEqualizer(): EqualizerContextValue {
  const ctx = useContext(EqualizerContext);
  if (!ctx) {
    throw new Error("useEqualizer must be used within an EqualizerProvider");
  }
  return ctx;
}
