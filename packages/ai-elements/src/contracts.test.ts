import { describe, expect, it, vi } from 'vitest';
import type { ChatMessagePart, ChatProvider } from './contracts.js';
import {
  consumeTextResponse,
  createMessage,
  isChatProviderStream,
  messageText,
  normalizeMessagePart,
  normalizeMessageParts,
  partsToText,
  textPart,
} from './contracts.js';

describe('AI element contracts', () => {
  it('normalizes text while preserving structured parts', () => {
    const source = { type: 'source', source: { title: 'Docs', url: 'https://example.test' } } satisfies ChatMessagePart;

    expect(textPart('hello')).toEqual({ type: 'text', text: 'hello' });
    expect(normalizeMessagePart('hello')).toEqual({ type: 'text', text: 'hello' });
    expect(normalizeMessagePart(source)).toBe(source);
    expect(normalizeMessageParts([source])).toEqual([source]);
    expect(normalizeMessageParts('hello')).toEqual([{ type: 'text', text: 'hello' }]);
  });

  it('extracts only visible text parts', () => {
    const parts: ChatMessagePart[] = [
      { type: 'text', text: 'first ' },
      { type: 'reasoning', text: 'hidden' },
      { type: 'text', text: 'second' },
    ];
    const message = createMessage('assistant', parts, 'assistant-1');

    expect(partsToText(parts)).toBe('first second');
    expect(messageText(message)).toBe('first second');
    expect(message).toMatchObject({ id: 'assistant-1', role: 'assistant', status: 'complete' });
    expect(Number.isFinite(message.createdAt)).toBe(true);
  });

  it('consumes a resolved string response once', async () => {
    const updates = vi.fn();
    const response = Promise.resolve('complete response');

    await expect(consumeTextResponse(response, updates)).resolves.toBe('complete response');
    expect(updates).toHaveBeenCalledOnce();
    expect(updates).toHaveBeenCalledWith('complete response');
  });

  it('extracts text from a resolved structured response', async () => {
    const response = Promise.resolve<ChatMessagePart[]>([
      { type: 'reasoning', text: 'thinking' },
      { type: 'text', text: 'answer' },
      { type: 'source', source: { title: 'Reference' } },
    ]);

    await expect(consumeTextResponse(response)).resolves.toBe('answer');
  });

  it('streams accumulated text and ignores non-text parts', async () => {
    const updates = vi.fn();
    const response = (async function* () {
      yield 'one';
      yield { type: 'reasoning', text: 'hidden' } satisfies ChatMessagePart;
      yield { type: 'text', text: ' two' } satisfies ChatMessagePart;
    })();

    expect(isChatProviderStream(response)).toBe(true);
    await expect(consumeTextResponse(response, updates)).resolves.toBe('one two');
    expect(updates.mock.calls.map(([text]) => text)).toEqual(['one', 'one two']);
  });

  it('recognizes promise and generator provider responses', () => {
    const provider: ChatProvider = {
      sendMessage: () => Promise.resolve('ok'),
    };
    const promiseResponse = provider.sendMessage([]);
    const streamResponse = (async function* () { yield 'ok'; })();

    expect(isChatProviderStream(promiseResponse)).toBe(false);
    expect(isChatProviderStream(streamResponse)).toBe(true);
  });
});
