import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Host from './AudioPlayer.compound.test-host.svelte';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AudioPlayer compound API', () => {
  it('controls one registered audio element', async () => {
    const player = render(Host); const audio = player.getByLabelText('Compound audio') as HTMLAudioElement;
    const play = vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    await fireEvent.click(player.getByRole('button', { name: 'Play audio' }));
    expect(play).toHaveBeenCalledOnce();
    Object.defineProperty(audio, 'currentTime', { configurable: true, writable: true, value: 5 });
    await fireEvent(audio, new Event('timeupdate'));
    await fireEvent.click(player.getByRole('button', { name: 'Seek forward 10 seconds' }));
    expect(audio.currentTime).toBe(15);
    await fireEvent.click(player.getByRole('button', { name: 'Mute audio' }));
    await waitFor(() => expect(audio.muted).toBe(true));
  });
});
