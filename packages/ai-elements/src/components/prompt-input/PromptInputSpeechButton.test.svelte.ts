import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
} from '../speech-input/SpeechInput.svelte';
import SpeechButtonHost from './PromptInputSpeechButton.test-host.svelte';

class RecognitionStub extends EventTarget implements SpeechRecognitionLike {
  static latest: RecognitionStub | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  stop = vi.fn(() => this.onend?.(new Event('end')));

  constructor() {
    super();
    RecognitionStub.latest = this;
  }

  start(): void {
    this.onstart?.(new Event('start'));
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, 'SpeechRecognition');
  RecognitionStub.latest = null;
});

describe('PromptInputSpeechButton', () => {
  it('appends final transcripts to the current prompt and stops explicitly', async () => {
    Object.defineProperty(globalThis, 'SpeechRecognition', {
      configurable: true,
      value: RecognitionStub,
    });
    const ontranscriptionchange = vi.fn();
    const view = render(SpeechButtonHost, {
      value: 'Existing draft',
      ontranscriptionchange,
    });
    const start = view.getByRole('button', { name: 'Start speech input' });
    await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(start);

    const result = { 0: { transcript: 'spoken text' }, isFinal: true, length: 1 };
    RecognitionStub.latest?.onresult?.(Object.assign(new Event('result'), {
      resultIndex: 0,
      results: { 0: result, length: 1 },
    }) as SpeechRecognitionEventLike);

    await waitFor(() => expect(
      (view.getByRole('textbox', { name: 'Speech prompt' }) as HTMLTextAreaElement).value,
    ).toBe('Existing draft spoken text'));
    expect(ontranscriptionchange).toHaveBeenCalledWith('spoken text');

    await fireEvent.click(view.getByRole('button', { name: 'Stop speech input' }));
    expect(RecognitionStub.latest?.stop).toHaveBeenCalledOnce();
  });

  it('detaches recognition before unmounting', async () => {
    Object.defineProperty(globalThis, 'SpeechRecognition', {
      configurable: true,
      value: RecognitionStub,
    });
    const view = render(SpeechButtonHost);
    const start = view.getByRole('button', { name: 'Start speech input' });
    await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(start);
    const recognition = RecognitionStub.latest;

    view.unmount();

    expect(recognition?.stop).toHaveBeenCalledOnce();
    expect(recognition?.onresult).toBeNull();
  });
});
