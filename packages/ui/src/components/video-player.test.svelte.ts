import { cleanup, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('vidstack/player', () => ({}));
vi.mock('vidstack/player/layouts/default', () => ({}));
vi.mock('vidstack/player/styles/default/theme.css', () => ({}));
vi.mock('vidstack/player/styles/default/layouts/video.css', () => ({}));

import VideoPlayer from './VideoPlayer.svelte';

afterEach(() => cleanup());

describe('VideoPlayer', () => {
  it('loads the full player with poster and tracks', async () => {
    const onready = vi.fn();
    const view = render(VideoPlayer, {
      src: 'https://cdn.example.com/movie.m3u8',
      poster: 'https://cdn.example.com/movie.jpg',
      title: 'Movie',
      tracks: [{ src: 'https://cdn.example.com/sub.vtt', kind: 'subtitles', label: 'English', language: 'en', default: true }],
      onready,
    });
    await waitFor(() => expect(view.container.querySelector('media-player')).not.toBeNull());
    const player = view.container.querySelector('media-player');
    expect(player?.getAttribute('src')).toBe('https://cdn.example.com/movie.m3u8');
    expect(player?.getAttribute('title')).toBe('Movie');
    expect(view.container.querySelector('media-poster')?.getAttribute('src')).toBe('https://cdn.example.com/movie.jpg');
    expect(view.container.querySelector('track')?.getAttribute('src')).toBe('https://cdn.example.com/sub.vtt');
    expect(view.container.querySelector('media-video-layout')).not.toBeNull();
    await waitFor(() => expect(onready).toHaveBeenCalled());
  });

  it('renders an audio layout for audio sources', async () => {
    const view = render(VideoPlayer, { src: 'https://cdn.example.com/audio.mp3', media: 'audio', title: 'Audio' });
    await waitFor(() => expect(view.container.querySelector('media-audio-layout')).not.toBeNull());
    expect(view.container.querySelector('media-video-layout')).toBeNull();
  });
});
