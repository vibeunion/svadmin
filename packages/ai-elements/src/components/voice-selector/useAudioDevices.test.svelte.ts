import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AudioDevicesState } from './useAudioDevices.svelte.js';
import AudioDevicesHost from './useAudioDevices.test-host.svelte';

interface Deferred<T> {
  promise: Promise<T>;
  resolve(resolvedValue: T): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function createAudioInput(label: string): MediaDeviceInfo {
  return {
    deviceId: label.toLowerCase().replaceAll(' ', '-'),
    groupId: 'audio-inputs',
    kind: 'audioinput',
    label,
    toJSON: () => ({}),
  };
}

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

function installMediaDevices(mediaDevices: Partial<MediaDevices>): void {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
});

describe('useAudioDevices lifecycle', () => {
  it('keeps the newest request result when an older enumeration finishes late', async () => {
    const initialRequest = createDeferred<MediaDeviceInfo[]>();
    const permissionRequest = createDeferred<MediaDeviceInfo[]>();
    const enumerateDevices = vi.fn()
      .mockImplementationOnce(() => initialRequest.promise)
      .mockImplementationOnce(() => permissionRequest.promise);
    installMediaDevices({
      enumerateDevices,
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    });

    let audioDevices!: AudioDevicesState;
    const view = render(AudioDevicesHost, { capture: (state) => { audioDevices = state; } });
    await waitFor(() => expect(enumerateDevices).toHaveBeenCalledOnce());
    await fireEvent.click(view.getByRole('button', { name: 'Request permission' }));
    await waitFor(() => expect(enumerateDevices).toHaveBeenCalledTimes(2));

    permissionRequest.resolve([createAudioInput('Current microphone')]);
    await permissionRequest.promise;
    await waitFor(() => expect(audioDevices.devices[0]?.label).toBe('Current microphone'));

    initialRequest.resolve([createAudioInput('Stale microphone')]);
    await initialRequest.promise;
    await Promise.resolve();
    expect(audioDevices.devices.map((device) => device.label)).toEqual(['Current microphone']);
    expect(audioDevices.hasPermission).toBe(true);
    expect(audioDevices.loading).toBe(false);
  });

  it('ignores an enumeration result that arrives after unmount', async () => {
    const pendingRequest = createDeferred<MediaDeviceInfo[]>();
    const enumerateDevices = vi.fn(() => pendingRequest.promise);
    installMediaDevices({ enumerateDevices });

    let audioDevices!: AudioDevicesState;
    const view = render(AudioDevicesHost, { capture: (state) => { audioDevices = state; } });
    await waitFor(() => expect(enumerateDevices).toHaveBeenCalledOnce());
    view.unmount();

    pendingRequest.resolve([createAudioInput('Late microphone')]);
    await pendingRequest.promise;
    await Promise.resolve();
    expect(audioDevices.devices).toEqual([]);
    expect(audioDevices.error).toBeNull();
    expect(audioDevices.loading).toBe(true);
  });
});
