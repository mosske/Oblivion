// Web Audio API Equalizer Node Chaining & Audio Routing
export const EQ_FREQUENCIES = [60, 150, 400, 1000, 2400, 6000, 15000] as const;
export type EQFrequency = (typeof EQ_FREQUENCIES)[number];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [6, 4, 2, 0, 0, 0, 0],
  Pop: [-1, 2, 5, 4, -1, -2, -2],
  Rock: [4, 3, -1, -2, 1, 3, 4],
  "Vocal / Clarity": [-2, -1, 1, 3, 4, 2, 0],
};

const STORAGE_KEY = "oblivion_eq_settings";

export interface EQState {
  preset: string;
  gains: number[];
}

export function loadSavedEQState(): EQState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.gains) && parsed.gains.length === 7) {
        return {
          preset: parsed.preset || "Flat",
          gains: parsed.gains.map((g: any) => {
            const num = Number(g);
            return isNaN(num) ? 0 : Math.max(-12, Math.min(12, num));
          }),
        };
      }
    }
  } catch {}
  return {
    preset: "Flat",
    gains: [0, 0, 0, 0, 0, 0, 0],
  };
}

export function saveEQState(state: EQState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export interface AudioPlayerPipeline {
  audioContext: AudioContext;
  sourceNode: MediaElementAudioSourceNode;
  filterNodes: BiquadFilterNode[];
  audioElement: HTMLAudioElement;
  setGain: (bandIndex: number, newGainValue: number) => void;
  setPreset: (presetName: string) => void;
  resume: () => Promise<void>;
  disconnect: () => void;
}

// Persistent singleton AudioContext
let persistentAudioContext: AudioContext | null = null;

// WeakMap tracking existing MediaElementAudioSourceNode to prevent duplicate creation errors
const elementSourceMap = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();
const elementPipelineMap = new WeakMap<HTMLAudioElement, AudioPlayerPipeline>();

/**
 * Returns a persistent singleton AudioContext instance.
 */
export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return null;

  if (!persistentAudioContext || persistentAudioContext.state === "closed") {
    persistentAudioContext = new AudioCtxClass();
  }
  return persistentAudioContext;
}

/**
 * Resumes the AudioContext if currently suspended (handles browser autoplay restrictions).
 */
export async function resumeAudioContext(ctx?: AudioContext | null): Promise<void> {
  const audioCtx = ctx || getSharedAudioContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (err) {
      console.warn("[audioPlayer] AudioContext auto-resume error:", err);
    }
  }
}

/**
 * Explicitly sets crossOrigin = "anonymous" BEFORE loading an audio stream URL
 * to prevent Web Audio API from being blocked by CORS security rules.
 */
export function loadAudioStream(
  audioElement: HTMLAudioElement,
  streamUrl: string,
  options?: { autoPlay?: boolean; loop?: boolean; volume?: number }
): void {
  if (!audioElement) return;

  // Ensure crossOrigin is set BEFORE setting the audio source
  if (audioElement.crossOrigin !== "anonymous") {
    audioElement.crossOrigin = "anonymous";
  }

  if (options?.loop !== undefined) {
    audioElement.loop = options.loop;
  }
  if (options?.volume !== undefined) {
    audioElement.volume = options.volume;
  }

  if (audioElement.src !== streamUrl) {
    audioElement.src = streamUrl;
    audioElement.load();
  }

  if (options?.autoPlay) {
    resumeAudioContext().then(() => {
      audioElement.play().catch(() => {});
    });
  }
}

/**
 * Connects an HTMLAudioElement to the Web Audio API 7-band BiquadFilterNode chain.
 *
 * Routing:
 * source -> filter[0] -> filter[1] -> ... -> filter[6] -> audioCtx.destination
 */
export function connectAudioElementToEqualizer(
  audioElement: HTMLAudioElement,
  initialGains?: number[]
): AudioPlayerPipeline | null {
  if (!audioElement || typeof window === "undefined") return null;

  // Check if this audio element already has an active pipeline
  const existingPipeline = elementPipelineMap.get(audioElement);
  if (existingPipeline) {
    return existingPipeline;
  }

  // 1. Ensure crossOrigin = "anonymous" BEFORE connecting / loading to prevent CORS silencing
  try {
    if (audioElement.crossOrigin !== "anonymous") {
      audioElement.crossOrigin = "anonymous";
    }
  } catch {}

  const audioCtx = getSharedAudioContext();
  if (!audioCtx) return null;

  // 2. Retrieve or create MediaElementAudioSourceNode (can only be called ONCE per HTMLMediaElement)
  let sourceNode = elementSourceMap.get(audioElement);
  if (!sourceNode) {
    try {
      sourceNode = audioCtx.createMediaElementSource(audioElement);
      elementSourceMap.set(audioElement, sourceNode);
    } catch (err) {
      console.warn("[audioPlayer] Error creating MediaElementSourceNode:", err);
      return null;
    }
  }

  // 3. Instantiate 7 BiquadFilterNode instances corresponding to standard frequency bands
  const gainsToUse = initialGains && initialGains.length === 7 ? initialGains : loadSavedEQState().gains;
  const filterNodes: BiquadFilterNode[] = EQ_FREQUENCIES.map((freq, index) => {
    const filter = audioCtx.createBiquadFilter();
    filter.type = "peaking";
    filter.frequency.value = freq;
    filter.Q.value = 1.4; // standard bandwidth for 7-band EQ
    filter.gain.value = gainsToUse[index] ?? 0;
    return filter;
  });

  // 4. Chain the nodes sequentially:
  // source -> filter[0] -> filter[1] -> ... -> filter[6] -> audioCtx.destination
  let previousNode: AudioNode = sourceNode;
  for (const filter of filterNodes) {
    previousNode.connect(filter);
    previousNode = filter;
  }
  previousNode.connect(audioCtx.destination);

  // 5. Resume AudioContext on user play/seek actions (browser autoplay policy requirement)
  const handleInteractionResume = () => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  };

  audioElement.addEventListener("play", handleInteractionResume);
  audioElement.addEventListener("playing", handleInteractionResume);
  audioElement.addEventListener("seeking", handleInteractionResume);
  audioElement.addEventListener("seeked", handleInteractionResume);

  // Helper to dynamically update gain in real-time with setTargetAtTime
  const setGain = (bandIndex: number, newGainValue: number) => {
    if (bandIndex < 0 || bandIndex >= filterNodes.length) return;
    const clampedGain = Math.max(-12, Math.min(12, newGainValue));
    const targetFilter = filterNodes[bandIndex];
    if (targetFilter) {
      try {
        targetFilter.gain.setTargetAtTime(clampedGain, audioCtx.currentTime, 0.01);
      } catch {
        targetFilter.gain.value = clampedGain;
      }
    }
  };

  const setPreset = (presetName: string) => {
    const presetGains = EQ_PRESETS[presetName];
    if (!presetGains) return;
    presetGains.forEach((gainVal, idx) => {
      setGain(idx, gainVal);
    });
  };

  const resume = async () => {
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  };

  const disconnect = () => {
    audioElement.removeEventListener("play", handleInteractionResume);
    audioElement.removeEventListener("playing", handleInteractionResume);
    audioElement.removeEventListener("seeking", handleInteractionResume);
    audioElement.removeEventListener("seeked", handleInteractionResume);
    try {
      sourceNode.disconnect();
      for (const filter of filterNodes) {
        filter.disconnect();
      }
    } catch {}
    elementPipelineMap.delete(audioElement);
  };

  const pipeline: AudioPlayerPipeline = {
    audioContext: audioCtx,
    sourceNode,
    filterNodes,
    audioElement,
    setGain,
    setPreset,
    resume,
    disconnect,
  };

  elementPipelineMap.set(audioElement, pipeline);
  return pipeline;
}

/**
 * Dynamically updates the gain property of a specific filter node in real-time
 * using setTargetAtTime to prevent clicks and zipper noise.
 */
export function setFilterBandGain(
  filters: BiquadFilterNode[],
  bandIndex: number,
  newGainValue: number,
  audioCtx?: AudioContext | null
): void {
  if (!filters || bandIndex < 0 || bandIndex >= filters.length) return;
  const filter = filters[bandIndex];
  if (!filter) return;

  const clamped = Math.max(-12, Math.min(12, newGainValue));
  const ctx = audioCtx || getSharedAudioContext();
  if (ctx) {
    try {
      filter.gain.setTargetAtTime(clamped, ctx.currentTime, 0.01);
      return;
    } catch {}
  }
  filter.gain.value = clamped;
}

/**
 * Updates all 7 filter nodes to match a preset configuration in real-time.
 */
export function setFilterPresetGains(
  filters: BiquadFilterNode[],
  presetGains: number[],
  audioCtx?: AudioContext | null
): void {
  if (!filters || !presetGains) return;
  presetGains.forEach((gain, i) => {
    setFilterBandGain(filters, i, gain, audioCtx);
  });
}
