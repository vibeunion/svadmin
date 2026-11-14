import { describe, it, expect, vi } from 'bun:test';
import type { LiveEvent } from '@svadmin/core';
import { createSseLiveProvider, parseSseChunk, type SseParsedMessage } from './sse-live-provider';

describe('@svadmin/sse parseSseChunk', () => {
  it('correctly parses event, data and id from a standard SSE block', () => {
    const messages: SseParsedMessage[] = [];
    const chunk = 'event: created\ndata: {"id": 1, "title": "Hello"}\nid: 101\n\n';

    const remainder = parseSseChunk(chunk, '', (msg) => {
      messages.push(msg);
    });

    expect(remainder).toBe('');
    expect(messages.length).toBe(1);
    expect(messages[0]?.event).toBe('created');
    expect(messages[0]?.data).toBe('{"id": 1, "title": "Hello"}');
    expect(messages[0]?.id).toBe('101');
  });

  it('handles multi-line data fields and ignores comments', () => {
    const messages: SseParsedMessage[] = [];
    const chunk = ': heartbeat comment\nevent: updated\ndata: line 1\ndata: line 2\n\n';

    const remainder = parseSseChunk(chunk, '', (msg) => {
      messages.push(msg);
    });

    expect(remainder).toBe('');
    expect(messages.length).toBe(1);
    expect(messages[0]?.event).toBe('updated');
    expect(messages[0]?.data).toBe('line 1\nline 2');
  });

  it('keeps partial chunk in remainder buffer until next block completes', () => {
    const messages: SseParsedMessage[] = [];
    let buffer = '';

    buffer = parseSseChunk('event: insert\ndata: {"a":', buffer, (msg) => {
      messages.push(msg);
    });
    expect(messages.length).toBe(0);
    expect(buffer).toBe('event: insert\ndata: {"a":');

    buffer = parseSseChunk(' 42}\n\n', buffer, (msg) => {
      messages.push(msg);
    });
    expect(buffer).toBe('');
    expect(messages.length).toBe(1);
    expect(messages[0]?.data).toBe('{"a": 42}');
  });
});

describe('@svadmin/sse LiveProvider adapter', () => {
  it('connects via fetch stream, parses events, and routes to subscriber callback', async () => {
    const streamPayload = 'event: created\ndata: {"id": 10, "resource": "posts", "title": "New Post"}\n\n';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(streamPayload));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: stream,
    });

    const onConnected = vi.fn();
    const liveProvider = createSseLiveProvider({
      url: 'https://api.example.com/sse',
      fetch: mockFetch as unknown as typeof fetch,
      onConnected,
    });

    const receivedEvents: LiveEvent[] = [];
    const unsubscribe = liveProvider.subscribe({
      resource: 'posts',
      callback: (event) => {
        receivedEvents.push(event);
      },
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(onConnected).toHaveBeenCalled();
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0]?.type).toBe('INSERT');
    expect(receivedEvents[0]?.resource).toBe('posts');
    expect(receivedEvents[0]?.payload).toEqual({
      id: 10,
      resource: 'posts',
      title: 'New Post',
    });

    unsubscribe();
  });

  it('passes custom authorization headers to the SSE stream request', async () => {
    let capturedHeaders: HeadersInit | undefined;
    const stream = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      capturedHeaders = init?.headers;
      return Promise.resolve({
        ok: true,
        status: 200,
        body: stream,
      });
    });

    const liveProvider = createSseLiveProvider({
      url: 'https://api.example.com/sse',
      headers: {
        Authorization: 'Bearer sse-secret-token',
        'X-Tenant-Id': 'tenant-42',
      },
      fetch: mockFetch as unknown as typeof fetch,
    });

    const unsubscribe = liveProvider.subscribe({
      resource: 'orders',
      callback: () => {},
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).toHaveBeenCalled();
    expect(capturedHeaders).toMatchObject({
      Authorization: 'Bearer sse-secret-token',
      'X-Tenant-Id': 'tenant-42',
      Accept: 'text/event-stream',
    });

    unsubscribe();
  });

  it('publishes events using POST request when publishUrl is configured', async () => {
    let capturedBody: string | undefined;
    let capturedMethod: string | undefined;

    const mockFetch = vi.fn().mockImplementation((_url, init?: RequestInit) => {
      capturedMethod = init?.method;
      capturedBody = init?.body as string;
      return Promise.resolve({ ok: true, status: 200 });
    });

    const liveProvider = createSseLiveProvider({
      url: 'https://api.example.com/sse',
      publishUrl: 'https://api.example.com/sse/publish',
      fetch: mockFetch as unknown as typeof fetch,
    });

    expect(liveProvider.publish).toBeDefined();
    if (!liveProvider.publish) {
      throw new Error('publish is not defined');
    }

    liveProvider.publish({
      type: 'UPDATE',
      resource: 'users',
      payload: { id: 99, status: 'active' },
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(capturedMethod).toBe('POST');
    expect(capturedBody).toBeDefined();
    if (!capturedBody) {
      throw new Error('capturedBody is undefined');
    }
    const parsed = JSON.parse(capturedBody);
    expect(parsed.type).toBe('UPDATE');
    expect(parsed.resource).toBe('users');
    expect(parsed.payload.id).toBe(99);
  });
});
