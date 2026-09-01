import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import JSXPreview from '../jsx-preview/JSXPreview.svelte';
import { completeJsxTags } from '../jsx-preview/completeJsxTags.js';
import MicSelectorHost from '../mic-selector/MicSelector.test-host.svelte';
import SpeechInput, { type SpeechRecognitionEventLike, type SpeechRecognitionLike } from './SpeechInput.svelte';

const originalMediaDevices = navigator.mediaDevices;

class RecognitionStub extends EventTarget implements SpeechRecognitionLike {
  static latest: RecognitionStub | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  constructor() {
    super();
    RecognitionStub.latest = this;
  }
  start(): void { this.onstart?.(new Event('start')); }
  stop(): void { this.onend?.(new Event('end')); }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, 'SpeechRecognition');
  RecognitionStub.latest = null;
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: originalMediaDevices,
  });
});

describe('interactive AI primitives', () => {
  it('completes streaming JSX and forwards native attributes', async () => {
    expect(completeJsxTags('<section><span>Ready')).toBe('<section><span>Ready</span></section>');

    const onerror = vi.fn();
    const preview = render(JSXPreview, {
      jsx: '<section>',
      'aria-label': 'JSX output',
      'data-testid': 'jsx-preview',
      onerror,
    });

    expect(preview.getByTestId('jsx-preview').getAttribute('aria-label')).toBe('JSX output');
    await waitFor(() => expect(onerror).toHaveBeenCalledOnce());
  });

  it('requests microphone permission only after the first explicit open', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] });
    const enumerateDevices = vi.fn().mockResolvedValue([]);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices,
        getUserMedia,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const selector = render(MicSelectorHost);
    const trigger = selector.getByRole('button', { name: 'Select microphone' });
    await waitFor(() => expect(enumerateDevices).toHaveBeenCalledOnce());
    expect(getUserMedia).not.toHaveBeenCalled();

    await fireEvent.click(trigger);
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
    expect(stop).toHaveBeenCalledOnce();

    await fireEvent.click(trigger);
    await fireEvent.click(trigger);
    expect(getUserMedia).toHaveBeenCalledOnce();
  });

  it('detaches speech recognition callbacks before unmounting', async () => {
    Object.defineProperty(globalThis, 'SpeechRecognition', {
      configurable: true,
      value: RecognitionStub,
    });
    const onend = vi.fn();
    const speech = render(SpeechInput, { onend });
    const button = speech.getByRole('button', { name: 'Start speech input' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(button);
    expect(speech.getByRole('button', { name: 'Stop speech input' })).not.toBeNull();

    speech.unmount();
    expect(onend).not.toHaveBeenCalled();
  });

  it('consumes only recognition results from resultIndex onward', async () => {
    Object.defineProperty(globalThis, 'SpeechRecognition', {
      configurable: true,
      value: RecognitionStub,
    });
    const ontranscriptionchange = vi.fn();
    const speech = render(SpeechInput, { ontranscriptionchange });
    const button = speech.getByRole('button', { name: 'Start speech input' });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(button);

    const first = { 0: { transcript: 'first' }, isFinal: true, length: 1 };
    RecognitionStub.latest?.onresult?.(Object.assign(new Event('result'), {
      resultIndex: 0,
      results: { 0: first, length: 1 },
    }) as SpeechRecognitionEventLike);

    const second = { 0: { transcript: 'second' }, isFinal: true, length: 1 };
    RecognitionStub.latest?.onresult?.(Object.assign(new Event('result'), {
      resultIndex: 1,
      results: { 0: first, 1: second, length: 2 },
    }) as SpeechRecognitionEventLike);

    expect(ontranscriptionchange.mock.calls).toEqual([['first'], ['second']]);
  });
});
