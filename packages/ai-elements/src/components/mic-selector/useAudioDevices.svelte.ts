import { onMount } from 'svelte';

export interface AudioDevicesState {
  readonly devices: MediaDeviceInfo[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly hasPermission: boolean;
  loadDevices(): Promise<void>;
}

export function useAudioDevices(): AudioDevicesState {
  let devices = $state<MediaDeviceInfo[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let hasPermission = $state(false);
  let requestEpoch = 0;
  let destroyed = false;

  async function refresh(requestPermission: boolean): Promise<void> {
    const epoch = ++requestEpoch;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      if (!destroyed && epoch === requestEpoch) {
        devices = [];
        loading = false;
        error = 'Microphone access is unavailable in this browser.';
      }
      return;
    }

    loading = true;
    error = null;
    try {
      if (requestPermission) {
        if (!navigator.mediaDevices.getUserMedia) {
          throw new Error('Microphone permission requests are unavailable in this browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        for (const track of stream.getTracks()) track.stop();
      }

      const nextDevices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audioinput');
      if (destroyed || epoch !== requestEpoch) return;
      devices = nextDevices;
      if (requestPermission) hasPermission = true;
    } catch (caughtError) {
      if (destroyed || epoch !== requestEpoch) return;
      error = caughtError instanceof Error
        ? caughtError.message
        : 'Unable to enumerate microphones.';
    } finally {
      if (!destroyed && epoch === requestEpoch) loading = false;
    }
  }

  async function loadDevices(): Promise<void> {
    await refresh(true);
  }

  onMount(() => {
    void refresh(false);
    const handleDeviceChange = (): void => {
      void refresh(hasPermission);
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      destroyed = true;
      requestEpoch += 1;
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  });

  return {
    get devices() { return devices; },
    get loading() { return loading; },
    get error() { return error; },
    get hasPermission() { return hasPermission; },
    loadDevices,
  };
}
