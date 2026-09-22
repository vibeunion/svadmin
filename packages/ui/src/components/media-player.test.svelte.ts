import { cleanup, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import MediaPlayer from './MediaPlayer.svelte';

afterEach(() => cleanup());

describe('MediaPlayer', () => {
  it('renders an accessible video with poster and caption', () => {
    const view = render(MediaPlayer, {
      src: 'https://cdn.example.com/clip.mp4',
      poster: 'https://cdn.example.com/clip.jpg',
      title: 'Quarterly review',
      description: 'Board meeting recording',
    });
    const video = view.container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe('https://cdn.example.com/clip.mp4');
    expect(video?.getAttribute('poster')).toBe('https://cdn.example.com/clip.jpg');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.getAttribute('aria-label')).toBe('Quarterly review');
    expect((video as HTMLVideoElement).playsInline).toBe(true);
    expect(view.getByText('Board meeting recording')).not.toBeNull();
  });

  it('renders an audio element without poster handling', () => {
    const view = render(MediaPlayer, {
      src: 'https://cdn.example.com/track.mp3',
      media: 'audio',
      title: 'Voicemail',
    });
    expect(view.container.querySelector('audio')).not.toBeNull();
    expect(view.container.querySelector('video')).toBeNull();
    expect(view.container.querySelector('.svadmin-media-player')?.getAttribute('data-media')).toBe('audio');
  });

  it('applies autoplay, loop and muted flags', () => {
    const view = render(MediaPlayer, {
      src: 'https://cdn.example.com/loop.mp4',
      autoplay: true,
      loop: true,
      muted: true,
      preload: 'auto',
    });
    const video = view.container.querySelector('video');
    expect(video?.hasAttribute('autoplay')).toBe(true);
    expect(video?.hasAttribute('loop')).toBe(true);
    expect(video?.hasAttribute('muted')).toBe(true);
    expect(video?.getAttribute('preload')).toBe('auto');
  });
});