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

export interface EqualizerContextValue {
  eqState: EQState;
  audioCtxRef: React.MutableRefObject<AudioContext | null>;
  sourceNodeRef: React.MutableRefObject<MediaElementAudioSourceNode | null>;
  filtersRef: React.MutableRefObject<BiquadFilterNode[]>;
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
  const attachedAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Resume helper for autoplay restriction handling
  const resumeAudioContext = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch((err) => {
        console.warn("AudioContext resume error:", err);
      });
    }
  }, []);

  // 1. Connect the Audio Graph Correctly & 2. Prevent Duplicate Source Node Errors
  const attachAudioElement = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioElement) return;

    // 1. Ensure crossOrigin = "anonymous" to prevent CORS blocking from silencing or bypassing Web Audio
    try {
      if (audioElement.crossOrigin !== "anonymous") {
        audioElement.crossOrigin = "anonymous";
      }
    } catch {}

    // 2. createMediaElementSource(audioRef) can only be called ONCE per HTMLMediaElement instance.
    // If sourceNodeRef.current already exists, reuse it instead of instantiating a new MediaElementSourceNode on component re-renders.
    if (sourceNodeRef.current && attachedAudioElementRef.current === audioElement) {
      return;
    }

    attachedAudioElementRef.current = audioElement;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtxClass();
      }
      const audioCtx = audioCtxRef.current;

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

      // Create MediaElementSourceNode once if not already created
      if (!sourceNodeRef.current) {
        sourceNodeRef.current = audioCtx.createMediaElementSource(audioElement);
      }

      // Build the 7 BiquadFilterNode peaking filters chain if not yet built
      if (filtersRef.current.length !== EQ_FREQUENCIES.length) {
        const initialGains = loadSavedEQState().gains;
        const filters = EQ_FREQUENCIES.map((freq, idx) => {
          const filter = audioCtx.createBiquadFilter();
          filter.type = "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1.4; // standard bandwidth for 7-band EQ
          filter.gain.value = initialGains[idx] ?? 0;
          return filter;
        });
        filtersRef.current = filters;

        // 1. Route the node chain:
        // <audio> -> MediaElementSourceNode -> Filter 1 (60Hz) -> Filter 2 (150Hz) -> ... -> Filter 7 (15kHz) -> AudioContext.destination
        let prevNode: AudioNode = sourceNodeRef.current;
        for (const filter of filters) {
          prevNode.connect(filter);
          prevNode = filter;
        }
        prevNode.connect(audioCtx.destination);
      }
    } catch (err) {
      console.warn("Failed to attach audio element to Web Audio equalizer pipeline:", err);
    }
  }, []);

  // 3. Live Slider Gain Updates:
  // In the slider onChange handler, directly update the target BiquadFilterNode gain:
  // filtersRef.current[index].gain.value = newGainValue;
  const setGain = useCallback((index: number, newGainValue: number) => {
    if (index < 0 || index >= EQ_FREQUENCIES.length) return;
    const clamped = Math.max(-12, Math.min(12, newGainValue));

    // Direct update on BiquadFilterNode gain for real-time responsiveness
    if (filtersRef.current[index]) {
      const audioCtx = audioCtxRef.current;
      if (audioCtx) {
        try {
          filtersRef.current[index].gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.01);
        } catch {
          filtersRef.current[index].gain.value = clamped;
        }
      } else {
        filtersRef.current[index].gain.value = clamped;
      }
    }

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
  }, []);

  // 3. Ensure changing presets updates all 7 filterNode.gain.value properties in real time
  const setPreset = useCallback((presetName: string) => {
    const presetGains = EQ_PRESETS[presetName];
    if (!presetGains) return;

    presetGains.forEach((gain, idx) => {
      if (filtersRef.current[idx]) {
        const audioCtx = audioCtxRef.current;
        if (audioCtx) {
          try {
            filtersRef.current[idx].gain.setTargetAtTime(gain, audioCtx.currentTime, 0.01);
          } catch {
            filtersRef.current[idx].gain.value = gain;
          }
        } else {
          filtersRef.current[idx].gain.value = gain;
        }
      }
    });

    const nextState: EQState = {
      preset: presetName,
      gains: [...presetGains],
    };
    saveEQState(nextState);
    setEqState(nextState);
  }, []);

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
