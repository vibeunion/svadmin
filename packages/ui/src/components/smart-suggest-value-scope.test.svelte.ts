import { fireEvent, render, within } from '@testing-library/svelte';
import { resetContext, type ChatProvider } from '@svadmin/core';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SmartSuggestValueScopeHost from './smart-suggest-value-scope.test-host.svelte';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function createPromiseProvider(reply: Deferred<string>) {
  const signals: AbortSignal[] = [];
  const sendMessage = vi.fn((_, options) => {
    if (options?.signal) signals.push(options.signal);
    return reply.promise;
  });
  return { provider: { sendMessage } as ChatProvider, sendMessage, signals };
}

function createControlledStream() {
  const chunk = createDeferred<string>();
  const finalized = createDeferred<void>();

  async function* generate() {
    try {
      yield await chunk.promise;
    } finally {
      finalized.resolve();
    }
  }

  return { generator: generate(), chunk, finalized: finalized.promise };
}

function renderSuggest(provider: ChatProvider) {
  return render(SmartSuggestValueScopeHost, {
    props: {
      chatProvider: provider,
      tenant: { tenantId: 'tenant-shared' },
      context: 'shared context',
    },
  });
}

async function startPrediction(container: HTMLElement) {
  await fireEvent.input(within(container).getByRole('textbox'), { target: { value: 'old' } });
  await tick();
}

function capturePredictionTimer() {
  const nativeSetTimeout = globalThis.setTimeout;
  let predictionCallback: (() => void) | null = null;

  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (delay === 500 && typeof handler === 'function') {
      predictionCallback = () => handler(...args);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }
    return nativeSetTimeout(handler, delay, ...args);
  }) as typeof setTimeout);

  return () => {
    if (!predictionCallback) throw new Error('Expected the SmartSuggest debounce timer');
    const callback = predictionCallback;
    predictionCallback = null;
    callback();
  };
}

afterEach(() => {
  resetContext();
  vi.restoreAllMocks();
});

describe('SmartSuggest bindable value scope', () => {
  it('rejects a late Promise after the parent changes value in the same provider scope', async () => {
    const runPrediction = capturePredictionTimer();
    const staleReply = createDeferred<string>();
    const provider = createPromiseProvider(staleReply);
    const view = renderSuggest(provider.provider);

    await startPrediction(view.container);
    runPrediction();
    await tick();
    expect(provider.sendMessage).toHaveBeenCalledTimes(1);
    expect(provider.signals[0]?.aborted).toBe(false);
    await fireEvent.click(view.getByRole('button', { name: 'Set parent value' }));
    expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('fresh');
    staleReply.resolve('fresh stale-promise');
    await staleReply.promise;
    await tick();

    expect(provider.signals[0]?.aborted).toBe(true);
    expect(view.queryByText(' stale-promise')).toBeNull();
  });

  it('rejects a late iterator chunk after the parent changes value in the same provider scope', async () => {
    const runPrediction = capturePredictionTimer();
    const stream = createControlledStream();
    const signals: AbortSignal[] = [];
    const sendMessage = vi.fn((_, options) => {
      if (options?.signal) signals.push(options.signal);
      return stream.generator;
    });
    const provider = { sendMessage } as ChatProvider;
    const view = renderSuggest(provider);

    await startPrediction(view.container);
    runPrediction();
    await tick();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(signals[0]?.aborted).toBe(false);
    await fireEvent.click(view.getByRole('button', { name: 'Set parent value' }));
    expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('fresh');
    stream.chunk.resolve('fresh stale-stream');
    await stream.finalized;
    await tick();

    expect(signals[0]?.aborted).toBe(true);
    expect(view.queryByText(' stale-stream')).toBeNull();
  });
});
