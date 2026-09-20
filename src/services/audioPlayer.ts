// Singleton AudioContext & Filter Pipeline Service
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

export interface EqualizerSettings {
  preset: string;
  gains: number[];
}

export function loadSavedEQPresets(): EqualizerSettings {
  try {
    const raw = localStorage.getItem(OBLIVION_EQ_PRESETS_KEY) || localStorage.getItem("oblivion_eq_settings");
    if (raw) {
      const parsed = JSON.parse(raw);
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

export function saveEQPresets(settings: EqualizerSettings): void {
  try {
    const payload = JSON.stringify(settings);
    localStorage.setItem(OBLIVION_EQ_PRESETS_KEY, payload);
    localStorage.setItem("oblivion_eq_settings", payload);
  } catch {}
}

export class AudioPlayerService {
  private audioElement: HTMLAudioElement | null = null;
  public audioCtx: AudioContext | null = null;
  public sourceNode: MediaElementAudioSourceNode | null = null;
  public filters: BiquadFilterNode[] = [];
  private currentGains: number[] = [0, 0, 0, 0, 0, 0, 0];
  private currentPreset: string = "Flat";
  private listeners: Set<(settings: EqualizerSettings) => void> = new Set();
  private attachedElementSet: WeakSet<HTMLAudioElement> = new WeakSet();

  constructor() {
    const initial = loadSavedEQPresets();
    this.currentGains = [...initial.gains];
    this.currentPreset = initial.preset;
  }

  public getElement(): HTMLAudioElement | null {
    return this.audioElement;
  }

  public getSettings(): EqualizerSettings {
    return {
      preset: this.currentPreset,
      gains: [...this.currentGains],
    };
  }

  public subscribe(cb: (settings: EqualizerSettings) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const settings = this.getSettings();
    this.listeners.forEach((cb) => cb(settings));
  }

  public setWebAudioPipeline(audioCtx: AudioContext, filters: BiquadFilterNode[], sourceNode?: MediaElementAudioSourceNode): void {
    this.audioCtx = audioCtx;
    this.filters = filters;
    if (sourceNode) {
      this.sourceNode = sourceNode;
    }
  }

  /**
   * Connects the master HTML5 Audio element to the Web Audio pipeline ONCE.
   * Prevents "InvalidStateError" on track changes by reusing the initialized nodes.
   */
  public attachAudioElement(element: HTMLAudioElement): void {
    if (!element) return;
    this.audioElement = element;

    // A. CORS SETTING:
    // BEFORE setting audioElement.src or connecting, explicitly set crossOrigin = "anonymous"
    try {
      if (element.crossOrigin !== "anonymous") {
        element.crossOrigin = "anonymous";
      }
    } catch {}

    // B. SINGLETON NODE INITIALIZATION:
    // Initialize the AudioContext and MediaElementAudioSourceNode ONCE to avoid "InvalidStateError" on track changes
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.audioCtx = new AudioCtxClass();
    }

    if (!this.sourceNode && !this.attachedElementSet.has(element)) {
      try {
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
        this.attachedElementSet.add(element);
        this.setupEqualizerFilters();
      } catch (err) {
        console.warn("[audioPlayer] createMediaElementSource note:", err);
      }
    }

    // Attach play & seek listeners to auto-resume suspended context
    const handleInteractionResume = () => {
      this.resumeContext();
    };

    element.removeEventListener("play", handleInteractionResume);
    element.removeEventListener("playing", handleInteractionResume);
    element.removeEventListener("seeking", handleInteractionResume);
    element.removeEventListener("seeked", handleInteractionResume);

    element.addEventListener("play", handleInteractionResume);
    element.addEventListener("playing", handleInteractionResume);
    element.addEventListener("seeking", handleInteractionResume);
    element.addEventListener("seeked", handleInteractionResume);
  }

  /**
   * C. 7-BAND BIQUAD FILTER NODE CHAINING:
   * Instantiate 7 BiquadFilterNode instances for the frequencies:
   * 60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 6kHz, and 15kHz.
   * Connect linearly:
   * sourceNode -> filter[0] -> filter[1] -> filter[2] -> filter[3] -> filter[4] -> filter[5] -> filter[6] -> audioCtx.destination
   */
  private setupEqualizerFilters(): void {
    if (!this.audioCtx || !this.sourceNode) return;

    if (this.filters.length !== EQ_FREQUENCIES.length) {
      this.filters = EQ_FREQUENCIES.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
        filter.gain.value = this.currentGains[index] ?? 0;
        return filter;
      });

      let prevNode: AudioNode = this.sourceNode;
      for (const filter of this.filters) {
        prevNode.connect(filter);
        prevNode = filter;
      }
      prevNode.connect(this.audioCtx.destination);
    }
  }

  /**
   * Sets audio source URL ensuring crossOrigin is anonymous BEFORE assignment.
   */
  public setSource(srcUrl: string): void {
    if (!this.audioElement) return;
    // A. CORS SETTING: BEFORE setting audioElement.src, explicitly set:
    this.audioElement.crossOrigin = "anonymous";
    if (this.audioElement.src !== srcUrl) {
      this.audioElement.src = srcUrl;
      this.audioElement.load();
    }
  }

  /**
   * D. RESUME CONTEXT ON PLAY:
   * On playback start (play() method), execute context resume check.
   */
  public async play(): Promise<void> {
    await this.resumeContext();
    if (this.audioElement) {
      return this.audioElement.play();
    }
  }

  public pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public async resumeContext(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn("[audioPlayer] audioCtx resume failed:", err);
      }
    }
  }

  /**
   * 2. REAL-TIME GAIN SLIDER BINDING:
   * When any EQ slider value changes, dynamically apply gain adjustments to the corresponding filter node in real-time:
   * this.filters[bandIndex].gain.setTargetAtTime(gainValueInDb, this.audioCtx.currentTime, 0.01);
   * Persist equalizer gains locally under key OBLIVION_EQ_PRESETS in localStorage.
   */
  public setBandGain(bandIndex: number, gainValueInDb: number): void {
    if (bandIndex < 0 || bandIndex >= EQ_FREQUENCIES.length) return;
    const clampedGain = Math.max(-12, Math.min(12, gainValueInDb));
    this.currentGains[bandIndex] = clampedGain;

    if (this.filters[bandIndex]) {
      if (this.audioCtx) {
        try {
          this.filters[bandIndex].gain.setTargetAtTime(
            clampedGain,
            this.audioCtx.currentTime,
            0.01
          );
        } catch {
          this.filters[bandIndex].gain.value = clampedGain;
        }
      } else {
        this.filters[bandIndex].gain.value = clampedGain;
      }
    }

    // Determine matching preset
    let matched = "Custom";
    for (const [name, presetGains] of Object.entries(EQ_PRESETS)) {
      if (presetGains.every((g, idx) => Math.abs(g - this.currentGains[idx]) < 0.1)) {
        matched = name;
        break;
      }
    }
    this.currentPreset = matched;

    saveEQPresets(this.getSettings());
    this.notify();
  }

  public setPreset(presetName: string): void {
    const presetGains = EQ_PRESETS[presetName];
    if (!presetGains) return;

    this.currentPreset = presetName;
    this.currentGains = [...presetGains];

    this.currentGains.forEach((gain, index) => {
      if (this.filters[index]) {
        if (this.audioCtx) {
          try {
            this.filters[index].gain.setTargetAtTime(
              gain,
              this.audioCtx.currentTime,
              0.01
            );
          } catch {
            this.filters[index].gain.value = gain;
          }
        } else {
          this.filters[index].gain.value = gain;
        }
      }
    });

    saveEQPresets(this.getSettings());
    this.notify();
  }

  public resetEQ(): void {
    this.setPreset("Flat");
  }
}

export const audioPlayer = new AudioPlayerService();
export default audioPlayer;
