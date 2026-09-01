import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AudioPlayerHost from './AudioPlayer.test-host.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function getAudio(container: HTMLElement): HTMLAudioElement {
  const audio = container.querySelector<HTMLAudioElement>('audio');
  if (!audio) throw new Error('Expected AudioPlayer to render an audio element.');
  return audio;
}

describe('AudioPlayer', () => {
  it('uses one custom control bar and synchronizes bound media state', async () => {
    const player = render(AudioPlayerHost);
    const audio = getAudio(player.container);
    const play = vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    const pause = vi.spyOn(audio, 'pause').mockImplementation(() => undefined);

    expect(audio.hasAttribute('controls')).toBe(false);
    expect(audio.currentTime).toBe(5);
    expect(audio.volume).toBe(0.5);

    await fireEvent.click(player.getByRole('button', { name: 'Set time' }));
    await waitFor(() => expect(audio.currentTime).toBe(12));

    await fireEvent.click(player.getByRole('button', { name: 'Set volume' }));
    await waitFor(() => expect(audio.volume).toBe(0.25));

    await fireEvent.click(player.getByRole('button', { name: 'Start externally' }));
    await waitFor(() => expect(play).toHaveBeenCalledOnce());

    await fireEvent(audio, new Event('play'));
    expect(player.getByRole('button', { name: 'Pause audio' })).not.toBeNull();

    await fireEvent.click(player.getByRole('button', { name: 'Stop externally' }));
    await waitFor(() => expect(pause).toHaveBeenCalledOnce());

    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 18 });
    await fireEvent(audio, new Event('timeupdate'));
    expect(player.getByRole('status', { name: 'Audio state' }).textContent).toContain('18|');

    Object.defineProperty(audio, 'volume', { configurable: true, writable: true, value: 0.75 });
    await fireEvent(audio, new Event('volumechange'));
    expect(player.getByRole('status', { name: 'Audio state' }).textContent).toContain('|0.75|');
  });

  it('reloads changed sources and uses metadata duration for seeking', async () => {
    const player = render(AudioPlayerHost);
    const audio = getAudio(player.container);
    const load = vi.spyOn(audio, 'load').mockImplementation(() => undefined);

    await fireEvent.click(player.getByRole('button', { name: 'Change source' }));
    await waitFor(() => expect(load).toHaveBeenCalledOnce());
    expect(player.container.querySelector('source')?.getAttribute('src')).toBe('/second.mp3');

    Object.defineProperty(audio, 'duration', { configurable: true, value: 20 });
    await fireEvent(audio, new Event('loadedmetadata'));
    const seek = player.getByRole('slider', { name: 'Audio position' }) as HTMLInputElement;
    expect(seek.max).toBe('20');

    await fireEvent.input(seek, { target: { value: '15' } });
    expect(audio.currentTime).toBe(15);
  });

  it.each(['NotAllowedError', 'AbortError'])('recovers from %s playback rejection', async (playbackErrorName) => {
    const onerror = vi.fn();
    const player = render(AudioPlayerHost, { onerror });
    const audio = getAudio(player.container);
    const play = vi.spyOn(audio, 'play').mockRejectedValue(new DOMException('Playback interrupted', playbackErrorName));

    await fireEvent.click(player.getByRole('button', { name: 'Start externally' }));

    await waitFor(() => {
      expect(play).toHaveBeenCalledOnce();
    });
    await Promise.resolve();
    expect(player.getByRole('status', { name: 'Audio state' }).textContent).toContain('|false');
    expect(onerror).not.toHaveBeenCalled();
    expect(player.queryByRole('alert')).toBeNull();
  });

  it.each([
    new DOMException('Unsupported audio', 'NotSupportedError'),
    new Error('Playback pipeline failed'),
  ])('reports unexpected playback rejection: $name', async (playbackError) => {
    const onerror = vi.fn();
    const player = render(AudioPlayerHost, { onerror });
    const audio = getAudio(player.container);
    vi.spyOn(audio, 'play').mockRejectedValue(playbackError);

    await fireEvent.click(player.getByRole('button', { name: 'Start externally' }));

    await waitFor(() => expect(onerror).toHaveBeenCalledOnce());
    const event = onerror.mock.calls[0]?.[0] as ErrorEvent;
    expect(event.error).toBe(playbackError);
    expect(player.getByRole('alert')).not.toBeNull();
  });
});
