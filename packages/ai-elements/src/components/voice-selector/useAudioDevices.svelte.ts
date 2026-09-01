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

  function isCurrentRequest(epoch: number): boolean {
    return !destroyed && epoch === requestEpoch;
  }

  async function enumerate(requestPermission: boolean): Promise<void> {
    const epoch = ++requestEpoch;
    if (destroyed) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      if (isCurrentRequest(epoch)) {
        loading = false;
        error = 'Audio devices are unavailable in this browser.';
      }
      return;
    }
    loading = true; error = null;
    try {
      if (requestPermission && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        if (!isCurrentRequest(epoch)) return;
        hasPermission = true;
      }
      const nextDevices = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === 'audioinput');
      if (!isCurrentRequest(epoch)) return;
      devices = nextDevices;
    } catch (caught) {
      if (!isCurrentRequest(epoch)) return;
      error = caught instanceof Error ? caught.message : 'Failed to get audio devices';
    } finally {
      if (isCurrentRequest(epoch)) loading = false;
    }
  }

  $effect(() => {
    void enumerate(false);
    const changed = () => { void enumerate(hasPermission); };
    navigator.mediaDevices?.addEventListener?.('devicechange', changed);
    return () => {
      destroyed = true;
      requestEpoch += 1;
      navigator.mediaDevices?.removeEventListener?.('devicechange', changed);
    };
  });

  return {
    get devices() { return devices; }, get loading() { return loading; }, get error() { return error; },
    get hasPermission() { return hasPermission; }, loadDevices: () => enumerate(true),
  };
}
