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

export const OBLIVION_EQ_PRESETS_KEY = "OBLIVION_EQ_PRESETS";
const STORAGE_KEY = OBLIVION_EQ_PRESETS_KEY;
const LEGACY_STORAGE_KEY = "oblivion_eq_settings";

export interface EQState {
  preset: string;
  gains: number[];
}

export function loadSavedEQState(): EQState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
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
    const val = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, val);
    localStorage.setItem(LEGACY_STORAGE_KEY, val);
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
    if (!audioElement) return;

    // 1. Ensure crossOrigin = "anonymous" to prevent CORS blocking
    try {
      if (audioElement.crossOrigin !== "anonymous") {
        audioElement.crossOrigin = "anonymous";
      }
    } catch {}

    // 2. createMediaElementSource(audioRef) can only be called ONCE per HTMLMediaElement instance.
    // If sourceNode already exists, reuse it instead of instantiating a new MediaElementSourceNode
    if (this.attachedElement === audioElement && this.sourceNode) {
      return;
    }
    this.attachedElement = audioElement;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioContext || this.audioContext.state === "closed") {
        try {
          this.audioContext = new AudioContextClass({ latencyHint: "interactive" });
        } catch {
          this.audioContext = new AudioContextClass();
        }
      }

      // 4. Handle browser autoplay restrictions by automatically calling audioCtx.resume()
      // whenever playback starts (play/seeking/seeked actions) if audioCtx.state === 'suspended'.
      const handleResume = async () => {
        if (this.audioContext && this.audioContext.state === "suspended") {
          try {
            await this.audioContext.resume();
          } catch {}
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

      // Check if element is already bound or create media element source once
      if (!this.sourceNode) {
        try {
          this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
        } catch (err) {
          console.warn("createMediaElementSource note:", err);
          return;
        }
      }

      // Construct the 7-band BiquadFilterNode chain if not already built
      if (this.filterNodes.length !== EQ_FREQUENCIES.length) {
        this.filterNodes = EQ_FREQUENCIES.map((freq, index) => {
          const filter = this.audioContext!.createBiquadFilter();
          filter.type = "peaking";
          filter.frequency.value = freq;
          filter.Q.value = 1.4; // standard bandwidth for 7-band EQ
          filter.gain.value = this.currentGains[index] ?? 0;
          return filter;
        });

        // 1. Route the node chain:
        // <audio> -> MediaElementSourceNode -> Filter 1 (60Hz) -> Filter 2 (150Hz) -> ... -> Filter 7 (15kHz) -> AudioContext.destination
        let prevNode: AudioNode = this.sourceNode;
        for (const filter of this.filterNodes) {
          prevNode.connect(filter);
          prevNode = filter;
        }
        prevNode.connect(this.audioContext.destination);
      }
    } catch (e) {
      console.warn("Error initializing Equalizer Web Audio pipeline:", e);
    }
  }

  // 3. Live Slider Gain Updates: directly update target BiquadFilterNode gain
  public setGain(index: number, value: number): void {
    if (index < 0 || index >= this.currentGains.length) return;
    const clamped = Math.max(-12, Math.min(12, value));
    this.currentGains[index] = clamped;

    if (this.filterNodes[index]) {
      if (this.audioContext) {
        try {
          this.filterNodes[index].gain.setTargetAtTime(clamped, this.audioContext.currentTime, 0.01);
        } catch {
          this.filterNodes[index].gain.value = clamped;
        }
      } else {
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

  // 3. Changing presets updates all 7 filterNode.gain.value properties in real time
  public setPreset(presetName: string): void {
    const presetGains = EQ_PRESETS[presetName];
    if (!presetGains) return;

    this.currentPreset = presetName;
    this.currentGains = [...presetGains];

    this.currentGains.forEach((gain, index) => {
      if (this.filterNodes[index]) {
        if (this.audioContext) {
          try {
            this.filterNodes[index].gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
          } catch {
            this.filterNodes[index].gain.value = gain;
          }
        } else {
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
