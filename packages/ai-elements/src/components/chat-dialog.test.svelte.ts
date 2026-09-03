import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/svelte';
import { Type } from '@sinclair/typebox';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentProvider, ChatMessage, ChatProvider } from '@svadmin/core';
import ChatDialogHost from './chat-dialog.test-host.svelte';
import GeneratedInventory from './chat-dialog.generated-component.test-host.svelte';
import ThrowingGeneratedComponent from './chat-dialog.throwing-component.test-host.svelte';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

async function openChat(container: HTMLElement) {
  const chat = container.querySelector<HTMLElement>('[data-svadmin-chat-scope]');
  expect(chat).not.toBeNull();
  if (!chat) throw new Error('Expected ChatDialog to render its chat scope.');
  await fireEvent.click(within(chat).getByRole('button', { name: 'Open AI assistant' }));
  return chat;
}

async function submitText(chat: HTMLElement, text: string): Promise<HTMLTextAreaElement> {
  const input = await within(chat).findByRole('textbox') as HTMLTextAreaElement;
  await fireEvent.input(input, { target: { value: text } });
  await fireEvent.keyDown(input, { key: 'Enter' });
  return input;
}

describe('ChatDialog', () => {
  it('streams structured parts and filters unsafe source links', async () => {
    const sendMessage = vi.fn((..._args: Parameters<ChatProvider['sendMessage']>) => (async function* () {
      yield { type: 'reasoning' as const, text: 'Checking records.', streaming: true };
      yield { type: 'text' as const, text: 'Found two records.' };
      yield { type: 'source' as const, source: { title: 'Unsafe source', url: 'javascript:alert(1)' } };
    })());
    const view = render(ChatDialogHost, { chatProvider: { sendMessage } });
    const chat = await openChat(view.container);

    await submitText(chat, 'find records');

    expect(await within(chat).findByText('Checking records.')).not.toBeNull();
    expect(await within(chat).findByText('Found two records.')).not.toBeNull();
    await fireEvent.click(within(chat).getByText('Sources'));
    const source = await within(chat).findByText('Unsafe source');
    expect(source.closest('a')).toBeNull();
    await waitFor(() => expect(within(chat).getAllByText('complete').length).toBeGreaterThan(0));
  });

  it('passes admin context separately without elevating it to a system message', async () => {
    const sendMessage = vi.fn<ChatProvider['sendMessage']>(async () => 'Context received.');
    const view = render(ChatDialogHost, { chatProvider: { sendMessage } });
    const chat = await openChat(view.container);

    await submitText(chat, 'inspect current product');

    await waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
    const [outboundMessages, options] = sendMessage.mock.calls[0] ?? [];
    expect(outboundMessages?.every((message) => message.role !== 'system')).toBe(true);
    expect(options?.context).toEqual({
      currentResource: 'products',
      selectedRecordId: '42',
      currentView: 'edit',
      pathname: '/products/42/edit',
    });
  });

  it('does not persist history unless a user-isolated key is provided', async () => {
    const view = render(ChatDialogHost, {
      chatProvider: { sendMessage: async () => 'Private reply.' },
    });
    const chat = await openChat(view.container);

    await submitText(chat, 'private question');

    expect(await within(chat).findByText('Private reply.')).not.toBeNull();
    await new Promise<void>((resolve) => { setTimeout(resolve, 350); });
    expect(localStorage.length).toBe(0);
  });

  it('submits an attachment without text and preserves the original File', async () => {
    const sendMessage = vi.fn<ChatProvider['sendMessage']>(async () => 'File received.');
    const view = render(ChatDialogHost, { chatProvider: { sendMessage } });
    const chat = await openChat(view.container);
    const file = new File(['inventory'], 'inventory.csv', { type: 'text/csv' });
    const fileInput = chat.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    if (!fileInput) throw new Error('Expected ChatDialog to render a file input.');

    await fireEvent.change(fileInput, { target: { files: [file] } });
    await fireEvent.click(within(chat).getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
    const outbound = sendMessage.mock.calls[0]?.[0] ?? [];
    const userMessage = outbound.find((message) => message.role === 'user');
    const filePart = userMessage?.parts.find((part) => part.type === 'file');
    expect(filePart?.type === 'file' ? filePart.file.file : undefined).toBe(file);
    expect(await within(chat).findByText('File received.')).not.toBeNull();
  });

  it('marks a stopped response as aborted and ignores late chunks', async () => {
    let releaseStream!: () => void;
    const streamGate = new Promise<void>((resolve) => { releaseStream = resolve; });
    const sendMessage = vi.fn((..._args: Parameters<ChatProvider['sendMessage']>) => (async function* () {
      yield 'Durable chunk.';
      await streamGate;
      yield 'Late chunk.';
    })());
    const view = render(ChatDialogHost, { chatProvider: { sendMessage } });
    const chat = await openChat(view.container);

    await submitText(chat, 'start stream');
    expect(await within(chat).findByText('Durable chunk.')).not.toBeNull();
    await fireEvent.click(within(chat).getByRole('button', { name: 'Stop' }));

    expect(sendMessage.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(await within(chat).findByText('aborted')).not.toBeNull();
    releaseStream();
    await tick();
    await tick();
    expect(within(chat).queryByText('Late chunk.')).toBeNull();
  });

  it('accepts a new message after clearing a provider that ignores abort', async () => {
    let resolveFirst!: (value: string) => void;
    const firstReply = new Promise<string>((resolve) => { resolveFirst = resolve; });
    const sendMessage = vi.fn<ChatProvider['sendMessage']>()
      .mockImplementationOnce(() => firstReply)
      .mockResolvedValueOnce('Fresh reply.');
    const view = render(ChatDialogHost, { chatProvider: { sendMessage } });
    const chat = await openChat(view.container);

    const input = await submitText(chat, 'first request');
    await waitFor(() => expect(sendMessage).toHaveBeenCalledOnce());
    await fireEvent.click(within(chat).getByRole('button', { name: 'Clear conversation' }));
    expect(sendMessage.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

    await fireEvent.input(input, { target: { value: 'fresh request' } });
    await fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(2));
    expect(await within(chat).findByText('Fresh reply.')).not.toBeNull();
    resolveFirst('Stale reply.');
    await firstReply;
    await tick();
    expect(within(chat).queryByText('Stale reply.')).toBeNull();
  });

  it('minimizes and restores the conversation panel', async () => {
    const view = render(ChatDialogHost, {
      chatProvider: { sendMessage: async () => 'Reply.' },
    });
    const chat = await openChat(view.container);

    const minimize = within(chat).getByRole('button', { name: 'Minimize AI assistant' });
    expect(minimize.getAttribute('aria-expanded')).toBe('true');
    await fireEvent.click(minimize);

    expect(within(chat).getByRole('button', { name: 'Expand AI assistant' })).not.toBeNull();
    expect(within(chat).queryByRole('textbox')).toBeNull();

    await fireEvent.click(within(chat).getByRole('button', { name: 'Expand AI assistant' }));
    expect(within(chat).getByRole('button', { name: 'Minimize AI assistant' })).not.toBeNull();
    expect(within(chat).getByRole('textbox')).not.toBeNull();
  });

  it('closes the conversation panel and restores the launcher', async () => {
    const view = render(ChatDialogHost, {
      chatProvider: { sendMessage: async () => 'Reply.' },
    });
    const chat = await openChat(view.container);

    await fireEvent.click(within(chat).getByRole('button', { name: 'Close AI assistant' }));

    expect(chat.querySelector('section[aria-label="AI assistant"]')).toBeNull();
    expect(within(chat).getByRole('button', { name: 'Open AI assistant' })).not.toBeNull();
  });

  it('keeps approvals scoped to the active agent instance', async () => {
    const approveToolCall = vi.fn();
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield {
        type: 'approval_request' as const,
        id: 'approval-1',
        tool: 'archiveRecords',
        args: { recordIds: ['record-1', 'record-2'], mode: 'archive' },
        description: 'Archive two records',
      };
      yield { type: 'done' as const };
    })());
    const view = render(ChatDialogHost, {
      agentProvider: { chat, approveToolCall },
    });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'archive records');
    const approvalArguments = await within(chatRoot).findByLabelText('Arguments for archiveRecords');
    expect(approvalArguments.textContent).toContain('record-1');
    expect(approvalArguments.textContent).toContain('mode');
    await fireEvent.click(await within(chatRoot).findByRole('button', { name: 'Approve: Archive two records' }));

    expect(approveToolCall).toHaveBeenCalledWith(
      'approval-1',
      true,
      { signal: expect.any(AbortSignal) },
    );
    expect(await within(chatRoot).findByText("User approved execution of tool 'archiveRecords'")).not.toBeNull();
  });

  it('treats done as the terminal event and closes the agent iterator', async () => {
    let iteratorClosed = false;
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      try {
        yield { type: 'text' as const, content: 'Before done.' };
        yield { type: 'done' as const };
        yield { type: 'text' as const, content: 'After done.' };
      } finally {
        iteratorClosed = true;
      }
    })());
    const view = render(ChatDialogHost, { agentProvider: { chat } });
    const chatRoot = await openChat(view.container);

    const input = await submitText(chatRoot, 'finish promptly');

    expect(await within(chatRoot).findByText('Before done.')).not.toBeNull();
    await waitFor(() => expect(input.disabled).toBe(false));
    expect(iteratorClosed).toBe(true);
    expect(within(chatRoot).queryByText('After done.')).toBeNull();
  });

  it('marks an active provider AbortError as aborted and removes pending approvals', async () => {
    const abortError = new Error('Transport aborted the stream');
    abortError.name = 'AbortError';
    const approveToolCall = vi.fn();
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield {
        type: 'approval_request' as const,
        id: 'transport-abort-approval',
        tool: 'archiveRecords',
        args: { recordIds: ['record-1'] },
        description: 'Archive one record',
      };
      throw abortError;
    })());
    const view = render(ChatDialogHost, {
      agentProvider: { chat, approveToolCall },
    });
    const chatRoot = await openChat(view.container);

    const input = await submitText(chatRoot, 'abort transport');

    expect(await within(chatRoot).findByText('aborted')).not.toBeNull();
    await waitFor(() => expect(input.disabled).toBe(false));
    expect(within(chatRoot).queryByRole('button', { name: 'Approve: Archive one record' })).toBeNull();
    expect(within(chatRoot).queryByText('Sorry, something went wrong. Please try again.')).toBeNull();
    expect(approveToolCall).not.toHaveBeenCalled();
  });

  it('keeps a failed approval pending and allows a successful retry', async () => {
    const approveToolCall = vi.fn()
      .mockImplementationOnce(() => { throw new Error('Approval service unavailable'); })
      .mockImplementationOnce(() => undefined);
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield {
        type: 'approval_request' as const,
        id: 'approval-retry',
        tool: 'archiveRecords',
        args: {},
        description: 'Archive retry records',
      };
    })());
    const view = render(ChatDialogHost, {
      agentProvider: { chat, approveToolCall },
    });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'archive retry records');
    const approveButton = await within(chatRoot).findByRole('button', {
      name: 'Approve: Archive retry records',
    });
    await fireEvent.click(approveButton);

    expect((await within(chatRoot).findByRole('alert')).textContent).toContain(
      'Approval failed: Approval service unavailable',
    );
    expect(within(chatRoot).queryByText("User approved execution of tool 'archiveRecords'")).toBeNull();
    expect((approveButton as HTMLButtonElement).disabled).toBe(false);

    await fireEvent.click(approveButton);

    await waitFor(() => expect(approveToolCall).toHaveBeenCalledTimes(2));
    expect(await within(chatRoot).findByText("User approved execution of tool 'archiveRecords'")).not.toBeNull();
    expect(within(chatRoot).queryByRole('alert')).toBeNull();
  });

  it('aborts an in-flight approval response when the conversation is cleared', async () => {
    let approvalSignal: AbortSignal | undefined;
    let chatSignal: AbortSignal | undefined;
    const approveToolCall = vi.fn((
      _id: string,
      _approved: boolean,
      options: { signal: AbortSignal },
    ) => new Promise<void>((_resolve, reject) => {
      approvalSignal = options.signal;
      options.signal.addEventListener('abort', () => {
        reject(new DOMException('Approval aborted', 'AbortError'));
      }, { once: true });
    }));
    const chat = vi.fn((...args: Parameters<AgentProvider['chat']>) => {
      chatSignal = args[1]?.signal;
      return (async function* () {
        yield {
          type: 'approval_request' as const,
          id: 'approval-clear',
          tool: 'archiveRecords',
          args: {},
          description: 'Archive records before clear',
        };
        yield { type: 'done' as const };
      })();
    });
    const view = render(ChatDialogHost, { agentProvider: { chat, approveToolCall } });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'archive records before clear');
    await fireEvent.click(await within(chatRoot).findByRole('button', {
      name: 'Approve: Archive records before clear',
    }));
    await waitFor(() => expect(approveToolCall).toHaveBeenCalledOnce());
    await fireEvent.click(within(chatRoot).getByRole('button', { name: 'Clear conversation' }));

    expect(approvalSignal?.aborted).toBe(true);
    expect(chatSignal?.aborted).toBe(true);
    expect(within(chatRoot).queryByText("User approved execution of tool 'archiveRecords'")).toBeNull();
    expect(within(chatRoot).queryByRole('alert')).toBeNull();
  });

  it('fails closed when an agent reuses an approval id in the same run', async () => {
    const approveToolCall = vi.fn();
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield {
        type: 'approval_request' as const,
        id: 'duplicate-approval',
        tool: 'archiveRecords',
        args: { recordIds: ['record-1'] },
        description: 'Archive one record',
      };
      yield {
        type: 'approval_request' as const,
        id: 'duplicate-approval',
        tool: 'deleteRecords',
        args: { recordIds: ['record-2'] },
        description: 'Delete another record',
      };
    })());
    const view = render(ChatDialogHost, { agentProvider: { chat, approveToolCall } });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'run duplicate approvals');

    expect(await within(chatRoot).findByText('Sorry, something went wrong. Please try again.')).not.toBeNull();
    expect(within(chatRoot).queryByRole('button', { name: /Approve:/ })).toBeNull();
    expect(approveToolCall).not.toHaveBeenCalled();
  });

  it('removes pending approvals when the owning agent stream fails', async () => {
    let failStream!: () => void;
    const failureGate = new Promise<void>((resolve) => { failStream = resolve; });
    const approveToolCall = vi.fn();
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield {
        type: 'approval_request' as const,
        id: 'approval-failed-stream',
        tool: 'archiveRecords',
        args: {},
        description: 'Archive records after failure',
      };
      await failureGate;
      throw new Error('Agent stream failed');
    })());
    const view = render(ChatDialogHost, {
      agentProvider: { chat, approveToolCall },
    });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'archive records after failure');
    expect(await within(chatRoot).findByRole('button', {
      name: 'Approve: Archive records after failure',
    })).not.toBeNull();

    failStream();

    expect(await within(chatRoot).findByText('Sorry, something went wrong. Please try again.')).not.toBeNull();
    await waitFor(() => expect(within(chatRoot).queryByRole('button', {
      name: 'Approve: Archive records after failure',
    })).toBeNull());
    expect(approveToolCall).not.toHaveBeenCalled();
  });

  it('renders only registered generated components and forwards their props', async () => {
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield {
        type: 'component' as const,
        name: 'InventorySummary',
        props: { warehouse: 'north', count: 2 },
      };
      yield {
        type: 'component' as const,
        name: 'UnknownWidget',
        props: { secret: 'ignored' },
      };
      yield { type: 'done' as const };
    })());
    const view = render(ChatDialogHost, {
      agentProvider: { chat },
      componentRegistry: {
        InventorySummary: {
          component: GeneratedInventory,
          schema: Type.Object({
            warehouse: Type.String(),
            count: Type.Number(),
          }, { additionalProperties: false }),
        },
      },
    });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'show inventory');

    expect((await within(chatRoot).findByTestId('generated-inventory')).textContent).toContain('north: 2');
    expect(await within(chatRoot).findByText('Component unavailable: UnknownWidget')).not.toBeNull();
    expect(within(chatRoot).queryByText('ignored')).toBeNull();
  });

  it('rejects invalid generated component props without interrupting later parts', async () => {
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield {
        type: 'component' as const,
        name: 'InventorySummary',
        props: { warehouse: 42 },
      };
      yield { type: 'text' as const, content: 'The rest of the response is available.' };
      yield { type: 'done' as const };
    })());
    const view = render(ChatDialogHost, {
      agentProvider: { chat },
      componentRegistry: {
        InventorySummary: {
          component: GeneratedInventory,
          schema: Type.Object({
            warehouse: Type.String(),
            count: Type.Number(),
          }, { additionalProperties: false }),
        },
      },
    });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'show invalid inventory');

    expect(await within(chatRoot).findByText('Component invalid: InventorySummary')).not.toBeNull();
    expect(await within(chatRoot).findByText('The rest of the response is available.')).not.toBeNull();
    expect(within(chatRoot).queryByTestId('generated-inventory')).toBeNull();
  });

  it('isolates a throwing generated component from the surrounding response', async () => {
    const chat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield { type: 'component' as const, name: 'ThrowingWidget', props: {} };
      yield { type: 'text' as const, content: 'Response continues after the component.' };
      yield { type: 'done' as const };
    })());
    const view = render(ChatDialogHost, {
      agentProvider: { chat },
      componentRegistry: {
        ThrowingWidget: {
          component: ThrowingGeneratedComponent,
          schema: Type.Object({}, { additionalProperties: false }),
        },
      },
    });
    const chatRoot = await openChat(view.container);

    await submitText(chatRoot, 'show throwing component');

    expect(await within(chatRoot).findByText('Component failed: ThrowingWidget')).not.toBeNull();
    expect(await within(chatRoot).findByText('Response continues after the component.')).not.toBeNull();
  });

  it('aborts an unresolved approval when a new message starts', async () => {
    const signals: AbortSignal[] = [];
    let invocation = 0;
    const chat = vi.fn((...args: Parameters<AgentProvider['chat']>) => {
      if (args[1]?.signal) signals.push(args[1].signal);
      invocation += 1;
      const currentInvocation = invocation;
      return (async function* () {
        if (currentInvocation === 1) {
          yield {
            type: 'approval_request' as const,
            id: 'approval-next-message',
            tool: 'archiveRecords',
            args: {},
            description: 'Archive before next message',
          };
        } else {
          yield { type: 'text' as const, content: 'Second response.' };
        }
        yield { type: 'done' as const };
      })();
    });
    const view = render(ChatDialogHost, { agentProvider: { chat } });
    const chatRoot = await openChat(view.container);

    const input = await submitText(chatRoot, 'first request');
    expect(await within(chatRoot).findByRole('button', {
      name: 'Approve: Archive before next message',
    })).not.toBeNull();
    await waitFor(() => expect(input.disabled).toBe(false));
    await submitText(chatRoot, 'second request');

    expect(signals[0]?.aborted).toBe(true);
    expect(await within(chatRoot).findByText('Second response.')).not.toBeNull();
    expect(within(chatRoot).queryByRole('button', {
      name: 'Approve: Archive before next message',
    })).toBeNull();
  });

  it('aborts an unresolved approval when the agent provider changes', async () => {
    let firstSignal: AbortSignal | undefined;
    const firstChat = vi.fn((...args: Parameters<AgentProvider['chat']>) => {
      firstSignal = args[1]?.signal;
      return (async function* () {
        yield {
          type: 'approval_request' as const,
          id: 'approval-provider-change',
          tool: 'archiveRecords',
          args: {},
          description: 'Archive before provider change',
        };
        yield { type: 'done' as const };
      })();
    });
    const replacementChat = vi.fn((..._args: Parameters<AgentProvider['chat']>) => (async function* () {
      yield { type: 'done' as const };
    })());
    const view = render(ChatDialogHost, { agentProvider: { chat: firstChat } });
    const chatRoot = await openChat(view.container);

    const input = await submitText(chatRoot, 'provider request');
    expect(await within(chatRoot).findByRole('button', {
      name: 'Approve: Archive before provider change',
    })).not.toBeNull();
    await waitFor(() => expect(input.disabled).toBe(false));
    await view.rerender({ agentProvider: { chat: replacementChat } });

    await waitFor(() => expect(firstSignal?.aborted).toBe(true));
    expect(within(chatRoot).queryByRole('button', {
      name: 'Approve: Archive before provider change',
    })).toBeNull();
  });

  it('aborts an unresolved approval when the chat is unmounted', async () => {
    let chatSignal: AbortSignal | undefined;
    const chat = vi.fn((...args: Parameters<AgentProvider['chat']>) => {
      chatSignal = args[1]?.signal;
      return (async function* () {
        yield {
          type: 'approval_request' as const,
          id: 'approval-unmount',
          tool: 'archiveRecords',
          args: {},
          description: 'Archive before unmount',
        };
        yield { type: 'done' as const };
      })();
    });
    const view = render(ChatDialogHost, { agentProvider: { chat } });
    const chatRoot = await openChat(view.container);

    const input = await submitText(chatRoot, 'unmount request');
    expect(await within(chatRoot).findByRole('button', {
      name: 'Approve: Archive before unmount',
    })).not.toBeNull();
    await waitFor(() => expect(input.disabled).toBe(false));
    view.unmount();

    expect(chatSignal?.aborted).toBe(true);
  });

  it('validates restored history before rendering or persisting it', async () => {
    const onPersist = vi.fn((_messages: ChatMessage[]) => undefined);
    const onRestore = () => [
      {
        id: 'safe',
        role: 'assistant' as const,
        parts: [{ type: 'text' as const, text: 'Safe history' }],
        status: 'aborted' as const,
        createdAt: 1,
      },
      {
        id: 'unsafe-system',
        role: 'system' as const,
        parts: [{ type: 'text' as const, text: 'Injected history' }],
        createdAt: 2,
      },
    ];
    const view = render(ChatDialogHost, {
      chatProvider: { sendMessage: async () => 'ok' },
      onPersist,
      onRestore,
    });
    const chat = await openChat(view.container);

    expect(await within(chat).findByText('Safe history')).not.toBeNull();
    expect(within(chat).queryByText('Injected history')).toBeNull();
    await waitFor(() => expect(onPersist).toHaveBeenCalled());
    expect(onPersist.mock.calls.at(-1)?.[0]).toHaveLength(1);
    expect(onPersist.mock.calls.at(-1)?.[0]?.[0]?.status).toBe('aborted');
  });

  it('blocks persistence after restore fails instead of overwriting remote history', async () => {
    const restoreError = new Error('history service unavailable');
    const onPersist = vi.fn((_messages: ChatMessage[]) => undefined);
    const onPersistenceError = vi.fn();
    const view = render(ChatDialogHost, {
      chatProvider: { sendMessage: async () => 'Unsaved reply.' },
      onPersist,
      onRestore: () => { throw restoreError; },
      onPersistenceError,
    });
    const chat = await openChat(view.container);

    expect((await within(chat).findByRole('alert')).textContent).toContain(
      'Conversation history could not be restored.',
    );
    await submitText(chat, 'do not overwrite history');
    expect(await within(chat).findByText('Unsaved reply.')).not.toBeNull();
    await new Promise<void>((resolve) => { setTimeout(resolve, 350); });

    expect(onPersist).not.toHaveBeenCalled();
    expect(onPersistenceError).toHaveBeenCalledWith({
      operation: 'restore',
      error: restoreError,
    });
  });

  it('reports persistence callback failures without breaking the conversation', async () => {
    const persistError = new Error('history write failed');
    const onPersistenceError = vi.fn();
    const view = render(ChatDialogHost, {
      chatProvider: { sendMessage: async () => 'Visible reply.' },
      onPersist: () => { throw persistError; },
      onPersistenceError,
    });
    const chat = await openChat(view.container);

    await submitText(chat, 'persist this');
    expect(await within(chat).findByText('Visible reply.')).not.toBeNull();
    expect((await within(chat).findByRole('alert')).textContent).toContain(
      'Conversation history could not be saved.',
    );
    expect(onPersistenceError).toHaveBeenCalledWith({
      operation: 'persist',
      error: persistError,
    });
  });
});
