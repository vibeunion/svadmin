import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { useAudioAlert, playAudioAlert } from './useAudioAlert.svelte.js';
import AudioFeedbackProvider from './AudioFeedbackProvider.svelte';

describe('useAudioAlert and AudioFeedbackProvider suite', () => {
  it('initializes hook with volume and mute options', () => {
    const audio = useAudioAlert({
      volume: 0.5,
      muted: false,
    });

    expect(audio.volume).toBe(0.5);
    expect(audio.isMuted).toBe(false);

    audio.setMuted(true);
    expect(audio.isMuted).toBe(true);

    audio.setVolume(0.9);
    expect(audio.volume).toBe(0.9);
  });

  it('safely handles playAudioAlert in mock environment without throwing', () => {
    expect(() => {
      playAudioAlert('success');
      playAudioAlert('error');
      playAudioAlert('warning');
      playAudioAlert('beep');
      playAudioAlert('notify');
    }).not.toThrow();
  });

  it('renders AudioFeedbackProvider with controls and children', async () => {
    const view = render(AudioFeedbackProvider, {
      showControls: true,
      defaultVolume: 0.8,
    });

    expect(view.container.querySelector('[role="region"]')).toBeTruthy();

    const muteBtn = view.container.querySelector('button[aria-label="Mute sounds"]');
    expect(muteBtn).toBeTruthy();
    if (muteBtn) {
      await fireEvent.click(muteBtn);
      expect(view.container.querySelector('button[aria-label="Unmute sounds"]')).toBeTruthy();
    }
  });
});
