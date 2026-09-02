// 7-Band Web Audio API Equalizer Engine
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

class EqualizerManager {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private attachedElement: HTMLAudioElement | null = null;
  private currentGains: number[] = [0, 0, 0, 0, 0, 0, 0];
  private currentPreset: string = "Flat";
  private listeners: Set<(state: EQState) => void> = new Set();

  constructor() {
    const initial = loadSavedEQState();
    this.currentGains = [...initial.gains];
    this.currentPreset = initial.preset;
  }

  public getState(): EQState {
    return {
      preset: this.currentPreset,
      gains: [...this.currentGains],
    };
  }

  public subscribe(listener: (state: EQState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  // Connects the HTMLAudioElement to the 7-band peaking filter chain
  public attachAudioElement(audioElement: HTMLAudioElement): void {
    if (this.attachedElement === audioElement && this.sourceNode) {
      return;
    }
    this.attachedElement = audioElement;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioContextClass();
      }

      // Resume context on play or user interaction
      if (this.audioContext.state === "suspended") {
        const resumeCtx = () => {
          this.audioContext?.resume().catch(() => {});
          audioElement.removeEventListener("play", resumeCtx);
        };
        audioElement.addEventListener("play", resumeCtx);
      }

      // Check if element is already bound or create media element source
      if (!this.sourceNode) {
        try {
          this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
        } catch (err) {
          // If already connected by browser, do not crash
          console.warn("createMediaElementSource note:", err);
          return;
        }
      }

      // Construct the 7-band BiquadFilterNode chain
      this.filterNodes = EQ_FREQUENCIES.map((freq, index) => {
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = 1.4; // standard bandwidth for 7-band EQ
        filter.gain.value = this.currentGains[index] ?? 0;
        return filter;
      });

      // Connect source -> filter0 -> filter1 -> ... -> filter6 -> destination
      let prevNode: AudioNode = this.sourceNode;
      for (const filter of this.filterNodes) {
        prevNode.connect(filter);
        prevNode = filter;
      }
      prevNode.connect(this.audioContext.destination);
    } catch (e) {
      console.warn("Error initializing Equalizer Web Audio pipeline:", e);
    }
  }

  public setGain(index: number, value: number): void {
    if (index < 0 || index >= this.currentGains.length) return;
    const clamped = Math.max(-12, Math.min(12, value));
    this.currentGains[index] = clamped;

    if (this.filterNodes[index] && this.audioContext) {
      try {
        const param = this.filterNodes[index].gain;
        param.cancelScheduledValues?.(this.audioContext.currentTime);
        param.setTargetAtTime?.(clamped, this.audioContext.currentTime, 0.015);
      } catch {
        this.filterNodes[index].gain.value = clamped;
      }
    }

    // Determine if preset still matches
    let matchedPreset = "Custom";
    for (const [name, presetGains] of Object.entries(EQ_PRESETS)) {
      if (presetGains.every((g, i) => Math.abs(g - this.currentGains[i]) < 0.1)) {
        matchedPreset = name;
        break;
      }
    }
    this.currentPreset = matchedPreset;

    saveEQState(this.getState());
    this.notify();
  }

  public setPreset(presetName: string): void {
    const presetGains = EQ_PRESETS[presetName];
    if (!presetGains) return;

    this.currentPreset = presetName;
    this.currentGains = [...presetGains];

    this.currentGains.forEach((gain, index) => {
      if (this.filterNodes[index] && this.audioContext) {
        try {
          const param = this.filterNodes[index].gain;
          param.cancelScheduledValues?.(this.audioContext.currentTime);
          param.setTargetAtTime?.(gain, this.audioContext.currentTime, 0.02);
        } catch {
          this.filterNodes[index].gain.value = gain;
        }
      }
    });

    saveEQState(this.getState());
    this.notify();
  }

  public reset(): void {
    this.setPreset("Flat");
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(() => {});
    }
  }
}

export const equalizerManager = new EqualizerManager();
