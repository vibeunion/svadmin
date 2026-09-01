import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import VoiceSelectorCompoundHost from './VoiceSelector.compound.test-host.svelte';
import VoiceSelector from './VoiceSelectorRoot.svelte';

class UtteranceStub extends EventTarget {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: SpeechSynthesisEvent) => void) | null = null;
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;

  constructor(readonly text: string) {
    super();
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VoiceSelector preview isolation', () => {
  it('cancels only its private speech queue when stopped and destroyed', async () => {
    const hostCancel = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: hostCancel },
    });

    const privateCancel = vi.fn();
    const privateSpeak = vi.fn((utterance: UtteranceStub) => utterance.onstart?.(new Event('start')));
    const privateSynthesis = {
      cancel: privateCancel,
      getVoices: vi.fn(() => []),
      speak: privateSpeak,
    };
    const append = document.body.append.bind(document.body);
    vi.spyOn(document.body, 'append').mockImplementation((...nodes: (Node | string)[]) => {
      append(...nodes);
      for (const node of nodes) {
        if (!(node instanceof HTMLIFrameElement) || !node.contentWindow) continue;
        Object.defineProperty(node.contentWindow, 'speechSynthesis', { configurable: true, value: privateSynthesis });
        Object.defineProperty(node.contentWindow, 'SpeechSynthesisUtterance', { configurable: true, value: UtteranceStub });
      }
    });

    const selector = render(VoiceSelector, {
      voices: [{ id: 'voice-1', name: 'Voice one', language: 'en-US' }],
      value: 'voice-1',
      discoverSystemVoices: false,
    });

    await fireEvent.click(selector.getByRole('button', { name: 'Preview selected voice' }));
    expect(privateSpeak).toHaveBeenCalledOnce();
    expect(hostCancel).not.toHaveBeenCalled();

    await fireEvent.click(selector.getByRole('button', { name: 'Stop voice preview' }));
    expect(privateCancel).toHaveBeenCalledOnce();
    expect(hostCancel).not.toHaveBeenCalled();

    await fireEvent.click(selector.getByRole('button', { name: 'Preview selected voice' }));
    selector.unmount();
    expect(privateCancel).toHaveBeenCalledTimes(2);
    expect(hostCancel).not.toHaveBeenCalled();
  });
});

describe('VoiceSelector compound exports', () => {
  it('provides context through VoiceSelectorParts.Root', async () => {
    const selector = render(VoiceSelectorCompoundHost);

    await fireEvent.click(selector.getByRole('button', { name: 'Select voice' }));
    await fireEvent.click(selector.getByRole('option', { name: 'Verse' }));

    expect(selector.getByLabelText('Selected compound voice').textContent).toBe('verse');
  });
});
