export type AudioAlertType = 'success' | 'error' | 'warning' | 'beep' | 'notify';

export interface AudioAlertOptions {
  volume?: number | undefined;
  muted?: boolean | undefined;
}

// Global singleton audio state shared across the app
let globalAudioCtx: AudioContext | null = null;
let isMutedState = false;
let globalVolume = 0.7;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!globalAudioCtx) {
    globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx.state === 'suspended') {
    void globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

function playTone(
  freqs: number[],
  durationSeconds: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.3,
) {
  if (isMutedState || globalVolume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(globalVolume * gainPeak, now);
  masterGain.connect(ctx.destination);

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    noteGain.gain.setValueAtTime(1, now + idx * 0.08);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + durationSeconds);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + durationSeconds);
  });
}

export function playAudioAlert(alertType: AudioAlertType): void {
  switch (alertType) {
    case 'success':
      // C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
      playTone([523.25, 659.25, 783.99], 0.22, 'sine', 0.25);
      break;
    case 'error':
      // Low punchy buzz: 180Hz -> 130Hz sawtooth
      playTone([180, 130], 0.18, 'sawtooth', 0.3);
      break;
    case 'warning':
      // Double pulse: 440Hz -> 880Hz
      playTone([440, 880], 0.15, 'triangle', 0.25);
      break;
    case 'beep':
      // Standard 1000Hz scanner chirp (80ms)
      playTone([1000], 0.08, 'sine', 0.2);
      break;
    case 'notify':
      // Gentle marimba chord: 880Hz -> 1174.66Hz (A5 -> D6)
      playTone([880, 1174.66], 0.18, 'sine', 0.2);
      break;
  }
}

export function useAudioAlert(options: AudioAlertOptions = {}) {
  let muted = $state(options.muted ?? false);
  let volume = $state(options.volume ?? 0.7);

  isMutedState = options.muted ?? false;
  globalVolume = options.volume ?? 0.7;

  return {
    get isMuted() {
      return muted;
    },
    get volume() {
      return volume;
    },
    setMuted: (val: boolean) => {
      muted = val;
      isMutedState = val;
    },
    setVolume: (val: number) => {
      volume = Math.max(0, Math.min(1, val));
      globalVolume = volume;
    },
    play: (type: AudioAlertType) => {
      playAudioAlert(type);
    },
  };
}
