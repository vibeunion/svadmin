import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  instances: [] as Array<{ url: string; media: HTMLVideoElement | null; destroyed: boolean }>,
  supported: true,
}));

vi.mock('hls.js', () => {
  class FakeHls {
    static Events = { ERROR: 'hlsError' };
    static isSupported = () => harness.supported;
    static instances = harness.instances;
    url = '';
    media: HTMLVideoElement | null = null;
    destroyed = false;
    constructor(_config: unknown) { harness.instances.push(this); }
    loadSource(url: string) { this.url = url; }
    attachMedia(media: HTMLVideoElement) { this.media = media; }
    on() {}
    destroy() { this.destroyed = true; }
  }
  return { default: FakeHls };
});

import MediaPlayer from './MediaPlayer.svelte';

const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;

beforeEach(() => {
  harness.instances.length = 0;
  harness.supported = true;
  HTMLMediaElement.prototype.canPlayType = () => '';
});

afterEach(() => {
  cleanup();
  HTMLMediaElement.prototype.canPlayType = originalCanPlayType;
});

describe('MediaPlayer HLS', () => {
  it('attaches hls.js for m3u8 sources and destroys it on unmount', async () => {
    const view = render(MediaPlayer, { src: 'https://cdn.example.com/live.m3u8', format: 'hls' });
    await waitFor(() => expect(harness.instances).toHaveLength(1));
    expect(harness.instances[0]?.url).toBe('https://cdn.example.com/live.m3u8');
    expect(harness.instances[0]?.media).toBe(view.container.querySelector('video'));
    expect(view.container.querySelector('video')?.getAttribute('src')).toBeNull();
    view.unmount();
    expect(harness.instances[0]?.destroyed).toBe(true);
  });

  it('uses native HLS when the browser supports it', async () => {
    HTMLMediaElement.prototype.canPlayType = (type: string) =>
      type === 'application/vnd.apple.mpegurl' ? 'probably' : '';
    const view = render(MediaPlayer, { src: 'https://cdn.example.com/live.m3u8' });
    await waitFor(() => expect(view.container.querySelector('video')?.getAttribute('src')).toBe('https://cdn.example.com/live.m3u8'));
    expect(harness.instances).toHaveLength(0);
  });

  it('reports unsupported MSE and leaves native sources untouched', async () => {
    harness.supported = false;
    const view = render(MediaPlayer, { src: 'https://cdn.example.com/live.m3u8' });
    expect((await view.findByRole('alert')).textContent).toContain('HLS is not supported');
    expect(view.container.querySelector('video')?.getAttribute('src')).toBeNull();

    const native = render(MediaPlayer, { src: 'https://cdn.example.com/clip.mp4' });
    expect(native.container.querySelector('video')?.getAttribute('src')).toBe('https://cdn.example.com/clip.mp4');
  });
});
