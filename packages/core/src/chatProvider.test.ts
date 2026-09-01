import { describe, expect, test } from 'bun:test';
import type {
  AdminTool,
  AdminToolParameter,
  AgentEvent,
  ChatMessage,
  ChatMessagePart,
} from './chatProvider.svelte';

function textPart(text: string): ChatMessagePart {
  return { type: 'text', text };
}

function messageText(message: ChatMessage): string {
  return message.parts
    .filter((part): part is Extract<ChatMessagePart, { type: 'text' }> => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

describe('ChatMessage parts', () => {
  test('round-trips every supported part through JSON', () => {
    const message: ChatMessage = {
      id: 'message-1',
      role: 'assistant',
      createdAt: 1_711_500_000_000,
      status: 'complete',
      parts: [
        textPart('Inventory review complete.'),
        { type: 'reasoning', text: 'Compared stock with reorder thresholds.', streaming: false },
        { type: 'tool-call', tool: 'getInventory', input: { warehouse: 'north' }, state: 'input-available', callId: 'call-1' },
        { type: 'tool-result', tool: 'getInventory', output: { lowStock: 3 }, callId: 'call-1' },
        { type: 'source', source: { id: 'source-1', title: 'Inventory policy', url: 'https://example.test/policy' } },
        { type: 'image', src: 'https://example.test/chart.png', alt: 'Inventory chart' },
        { type: 'file', file: { id: 'file-1', name: 'inventory.csv', mediaType: 'text/csv' } },
        {
          type: 'approval',
          approvalId: 'approval-1',
          tool: 'applyReorderChanges',
          input: { productIds: ['product-1'] },
          description: 'Apply reorder changes',
        },
        { type: 'component', name: 'InventoryChart', props: { warehouse: 'north' } },
      ],
    };

    const restored = JSON.parse(JSON.stringify(message)) as ChatMessage;

    expect(restored.parts).toHaveLength(9);
    expect(messageText(restored)).toBe('Inventory review complete.');
    expect(restored.parts[7]).toEqual({
      type: 'approval',
      approvalId: 'approval-1',
      tool: 'applyReorderChanges',
      input: { productIds: ['product-1'] },
      description: 'Apply reorder changes',
    });
  });

  test('keeps attachments and message state serializable', () => {
    const message: ChatMessage = {
      id: 'message-2',
      role: 'user',
      parts: [textPart('Review this file')],
      createdAt: 1_711_500_000_001,
      status: 'submitted',
      attachments: [{ id: 'file-1', name: 'report.pdf', size: 1024 }],
    };

    expect(JSON.parse(JSON.stringify(message))).toEqual(message);
  });
});

describe('AdminTool', () => {
  test('executes with declared safety metadata', async () => {
    const tool: AdminTool = {
      name: 'deletePosts',
      description: 'Delete posts matching a filter',
      parameters: {
        ids: { type: 'array', description: 'Post ids', required: true },
      },
      needsApproval: true,
      destructive: true,
      execute: async (args) => ({ success: true, data: { deleted: args.ids } }),
    };

    expect(await tool.execute({ ids: ['1', '2'] })).toEqual({
      success: true,
      data: { deleted: ['1', '2'] },
    });
  });

  test('returns an explicit tool error', async () => {
    const tool: AdminTool = {
      name: 'failingTool',
      description: 'A tool that fails',
      parameters: {},
      execute: async () => ({ success: false, error: 'Permission denied' }),
    };

    expect(await tool.execute({})).toEqual({ success: false, error: 'Permission denied' });
  });
});

describe('AgentEvent stream', () => {
  test('collects text, reasoning, tools, sources, components, and completion', async () => {
    async function* mockAgent(): AsyncGenerator<AgentEvent, void, unknown> {
      yield { type: 'reasoning', content: 'Checking inventory.', streaming: true };
      yield { type: 'tool_call', tool: 'getList', args: { resource: 'products' }, callId: 'call-1' };
      yield { type: 'tool_result', tool: 'getList', result: { success: true, data: [{ id: 1 }] }, callId: 'call-1' };
      yield { type: 'source', source: { title: 'Inventory policy' } };
      yield { type: 'component', name: 'InventoryChart', props: { count: 1 } };
      yield { type: 'text', content: 'Found one product.' };
      yield { type: 'done' };
    }

    const eventTypes: AgentEvent['type'][] = [];
    for await (const event of mockAgent()) eventTypes.push(event.type);

    expect(eventTypes).toEqual([
      'reasoning',
      'tool_call',
      'tool_result',
      'source',
      'component',
      'text',
      'done',
    ]);
  });

  test('serializes approval requests', () => {
    const event: AgentEvent = {
      type: 'approval_request',
      id: 'approval-42',
      tool: 'deletePosts',
      args: { ids: ['1', '2', '3'] },
      description: 'Delete three draft posts',
    };

    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
  });
});

describe('approval flow', () => {
  test('resolves each registered approval once', () => {
    const pending = new Map<string, (approved: boolean) => void>();
    let approved: boolean | undefined;
    pending.set('approval-1', (nextApproval) => { approved = nextApproval; });

    const callback = pending.get('approval-1');
    expect(callback).toBeDefined();
    callback?.(true);
    pending.delete('approval-1');

    expect(approved).toBe(true);
    expect(pending.has('approval-1')).toBe(false);
  });
});

describe('projectAdminToolSchema shape', () => {
  function projectTool(tool: {
    name: string;
    description: string;
    parameters: Record<string, AdminToolParameter>;
    readOnly?: boolean;
    destructive?: boolean;
    concurrent?: boolean;
    needsApproval?: boolean;
    execute?: (args: Record<string, unknown>) => Promise<unknown>;
  }) {
    return {
      name: tool.name,
      description: tool.description,
      parameters: { ...tool.parameters },
      ...(tool.readOnly !== undefined ? { readOnly: tool.readOnly } : {}),
      ...(tool.destructive !== undefined ? { destructive: tool.destructive } : {}),
      ...(tool.concurrent !== undefined ? { concurrent: tool.concurrent } : {}),
      ...(tool.needsApproval !== undefined ? { needsApproval: tool.needsApproval } : {}),
    };
  }

  test('keeps only the public schema', () => {
    const projected = projectTool({
      name: 'deleteUser',
      description: 'Delete a user by id',
      parameters: { id: { type: 'string', required: true } },
      readOnly: false,
      destructive: true,
      concurrent: false,
      needsApproval: true,
      execute: async () => ({ success: true }),
    });

    expect(projected).toEqual({
      name: 'deleteUser',
      description: 'Delete a user by id',
      parameters: { id: { type: 'string', required: true } },
      readOnly: false,
      destructive: true,
      concurrent: false,
      needsApproval: true,
    });
  });
});
