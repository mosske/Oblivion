import { useEffect, useRef, useState, useCallback } from "react";
import {
  EQ_FREQUENCIES,
  EQ_PRESETS,
  EQState,
  loadSavedEQState,
  saveEQState,
  getSharedAudioContext,
  connectAudioElementToEqualizer,
  loadAudioStream,
  resumeAudioContext,
  setFilterBandGain,
  setFilterPresetGains,
  AudioPlayerPipeline,
} from "../utils/audioPlayer";

export function useAudioPlayer(
  externalAudioRef?: React.RefObject<HTMLAudioElement | null>
) {
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = externalAudioRef || internalAudioRef;

  const [eqState, setEqState] = useState<EQState>(() => loadSavedEQState());
  const pipelineRef = useRef<AudioPlayerPipeline | null>(null);

  // Resume context helper for user play and seek actions
  const resume = useCallback(async () => {
    const audioCtx = pipelineRef.current?.audioContext || getSharedAudioContext();
    if (audioCtx && audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch (err) {
        console.warn("[useAudioPlayer] Failed to resume AudioContext:", err);
      }
    }
  }, []);

  // Connect audio element to Web Audio API equalizer pipeline
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Ensure crossOrigin is anonymous BEFORE loading URLs
    if (el.crossOrigin !== "anonymous") {
      el.crossOrigin = "anonymous";
    }

    const pipeline = connectAudioElementToEqualizer(el, eqState.gains);
    pipelineRef.current = pipeline;

    // Add listeners on play / seek to auto-resume context
    const handleAction = () => {
      resume();
    };

    el.addEventListener("play", handleAction);
    el.addEventListener("playing", handleAction);
    el.addEventListener("seeking", handleAction);
    el.addEventListener("seeked", handleAction);

    return () => {
      el.removeEventListener("play", handleAction);
      el.removeEventListener("playing", handleAction);
      el.removeEventListener("seeking", handleAction);
      el.removeEventListener("seeked", handleAction);
    };
  }, [audioRef, resume]);

  // Adjust gain for a specific band in real-time using setTargetAtTime
  const setBandGain = useCallback((bandIndex: number, newGainValue: number) => {
    if (bandIndex < 0 || bandIndex >= EQ_FREQUENCIES.length) return;
    const clamped = Math.max(-12, Math.min(12, newGainValue));

    if (pipelineRef.current) {
      setFilterBandGain(
        pipelineRef.current.filterNodes,
        bandIndex,
        clamped,
        pipelineRef.current.audioContext
      );
    }

    setEqState((prev) => {
      const nextGains = [...prev.gains];
      nextGains[bandIndex] = clamped;

      let matched = "Custom";
      for (const [presetName, presetGains] of Object.entries(EQ_PRESETS)) {
        if (presetGains.every((g, idx) => Math.abs(g - nextGains[idx]) < 0.1)) {
          matched = presetName;
          break;
        }
      }

      const nextState: EQState = { preset: matched, gains: nextGains };
      saveEQState(nextState);
      return nextState;
    });
  }, []);

  // Apply a preset to all 7 bands in real-time
  const setPreset = useCallback((presetName: string) => {
    const presetGains = EQ_PRESETS[presetName];
    if (!presetGains) return;

    if (pipelineRef.current) {
      setFilterPresetGains(
        pipelineRef.current.filterNodes,
        presetGains,
        pipelineRef.current.audioContext
      );
    }

    const nextState: EQState = { preset: presetName, gains: [...presetGains] };
    saveEQState(nextState);
    setEqState(nextState);
  }, []);

  const reset = useCallback(() => {
    setPreset("Flat");
  }, [setPreset]);

  // Stream URL loader that guarantees crossOrigin = "anonymous" BEFORE setting src
  const playStream = useCallback(
    (streamUrl: string, options?: { autoPlay?: boolean; loop?: boolean; volume?: number }) => {
      const el = audioRef.current;
      if (!el) return;
      loadAudioStream(el, streamUrl, options);
    },
    [audioRef]
  );

  return {
    audioRef,
    eqState,
    pipeline: pipelineRef.current,
    audioContext: pipelineRef.current?.audioContext || getSharedAudioContext(),
    filterNodes: pipelineRef.current?.filterNodes || [],
    sourceNode: pipelineRef.current?.sourceNode || null,
    setBandGain,
    setPreset,
    reset,
    resume,
    playStream,
  };
}
export default useAudioPlayer;
