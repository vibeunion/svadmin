// Unit tests for ChatProvider types and ChatContext logic
// Since chatProvider.svelte.ts uses $state runes (requires Svelte compiler),
// we test the pure type shapes and serialization here — matching the project's
// pattern in i18n.test.ts of testing extracted logic.

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect } from 'bun:test';

/** Mirror of ChatAction from chatProvider.svelte.ts */
interface ChatAction {
  label: string;
  variant?: 'default' | 'destructive' | 'outline';
  payload?: Record<string, unknown>;
}

/** Mirror of ChatMessage from chatProvider.svelte.ts */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actions?: ChatAction[];
}

/** Mirror of ChatContext from chatProvider.svelte.ts */
interface ChatContext {
  currentResource?: string;
  selectedRecordId?: string;
  currentView?: 'list' | 'edit' | 'create' | 'show';
  pathname?: string;
}

/** Build context system message (mirrors logic in ChatDialog.svelte) */
function buildContextSystemMessage(ctx: ChatContext): ChatMessage | null {
  if (!ctx.currentResource) return null;

  const parts: string[] = [];
  parts.push(`Resource: ${ctx.currentResource}`);
  if (ctx.currentView) parts.push(`View: ${ctx.currentView}`);
  if (ctx.selectedRecordId) parts.push(`Selected Record ID: ${ctx.selectedRecordId}`);
  if (ctx.pathname) parts.push(`Path: ${ctx.pathname}`);

  return {
    id: 'ctx-system',
    role: 'system',
    content: `[Admin Context] ${parts.join(' | ')}`,
    timestamp: Date.now(),
  };
}

describe('ChatMessage with actions', () => {
  test('message with actions serializes to JSON and back', () => {
    const actions: ChatAction[] = [
      { label: 'Delete Record', variant: 'destructive', payload: { id: '42' } },
      { label: 'View Details' },
    ];
    const msg: ChatMessage = {
      id: 'msg-1',
      role: 'assistant',
      content: 'I found a record to delete.',
      timestamp: 1711500000000,
      actions,
    };

    const serialized = JSON.stringify(msg);
    const deserialized = JSON.parse(serialized) as ChatMessage;

    expect(deserialized.actions).toHaveLength(2);
    expect(deserialized.actions![0].label).toBe('Delete Record');
    expect(deserialized.actions![0].variant).toBe('destructive');
    expect(deserialized.actions![0].payload).toEqual({ id: '42' });
    expect(deserialized.actions![1].variant).toBeUndefined();
  });

  test('message without actions has undefined actions', () => {
    const msg: ChatMessage = {
      id: 'msg-2',
      role: 'user',
      content: 'Hello',
      timestamp: 1711500000000,
    };
    expect(msg.actions).toBeUndefined();
  });

  test('system message persists correctly', () => {
    const msg: ChatMessage = {
      id: 'ctx-1',
      role: 'system',
      content: '[Admin Context] Resource: posts | View: edit',
      timestamp: 1711500000000,
    };
    const parsed = JSON.parse(JSON.stringify(msg)) as ChatMessage;
    expect(parsed.role).toBe('system');
    expect(parsed.content).toContain('posts');
  });
});

describe('buildContextSystemMessage', () => {
  test('returns null when no resource', () => {
    expect(buildContextSystemMessage({})).toBeNull();
  });

  test('builds message with resource only', () => {
    const msg = buildContextSystemMessage({ currentResource: 'users' });
    expect(msg).not.toBeNull();
    expect(msg!.role).toBe('system');
    expect(msg!.content).toContain('Resource: users');
  });

  test('includes all context fields', () => {
    const msg = buildContextSystemMessage({
      currentResource: 'posts',
      currentView: 'edit',
      selectedRecordId: '42',
      pathname: '/posts/edit/42',
    });
    expect(msg!.content).toContain('Resource: posts');
    expect(msg!.content).toContain('View: edit');
    expect(msg!.content).toContain('Selected Record ID: 42');
    expect(msg!.content).toContain('Path: /posts/edit/42');
  });

  test('omits undefined fields', () => {
    const msg = buildContextSystemMessage({
      currentResource: 'users',
      currentView: 'list',
    });
    expect(msg!.content).not.toContain('Selected Record ID');
    expect(msg!.content).not.toContain('Path');
  });
});

describe('ChatContext shape', () => {
  test('empty context is valid', () => {
    const ctx: ChatContext = {};
    expect(ctx.currentResource).toBeUndefined();
  });

  test('full context preserves all fields', () => {
    const ctx: ChatContext = {
      currentResource: 'orders',
      selectedRecordId: '99',
      currentView: 'show',
      pathname: '/orders/show/99',
    };
    expect(ctx.currentResource).toBe('orders');
    expect(ctx.selectedRecordId).toBe('99');
    expect(ctx.currentView).toBe('show');
    expect(ctx.pathname).toBe('/orders/show/99');
  });
});

describe('localStorage persistence simulation', () => {
  test('messages array round-trips through JSON', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: 1000 },
      {
        id: '2', role: 'assistant', content: 'Hi!', timestamp: 1001,
        actions: [{ label: 'Create Post', variant: 'default', payload: { resource: 'posts' } }],
      },
    ];
    const json = JSON.stringify(messages);
    const restored = JSON.parse(json) as ChatMessage[];

    expect(restored).toHaveLength(2);
    expect(restored[0].role).toBe('user');
    expect(restored[1].actions![0].label).toBe('Create Post');
  });
});

// ─── AgentProvider Types ───────────────────────────────────────

/** Mirror of AdminToolParameter from chatProvider.svelte.ts */
interface AdminToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  required?: boolean;
}

/** Mirror of AdminTool from chatProvider.svelte.ts */
interface AdminTool {
  name: string;
  description: string;
  parameters: Record<string, AdminToolParameter>;
  needsApproval?: boolean;
  execute(args: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }>;
}

/** Mirror of AgentEvent from chatProvider.svelte.ts */
type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown> }
  | { type: 'approval_request'; id: string; tool: string; args: Record<string, unknown>; description: string }
  | { type: 'tool_result'; tool: string; result: { success: boolean; data?: unknown; error?: string } }
  | { type: 'component'; name: string; props: Record<string, unknown> }
  | { type: 'done' };

describe('AdminTool shape', () => {
  test('tool with needsApproval serializes correctly', () => {
    const tool: AdminTool = {
      name: 'deletePosts',
      description: 'Delete posts matching a filter',
      parameters: {
        status: { type: 'string', description: 'Filter by status', enum: ['draft', 'archived'] },
      },
      needsApproval: true,
      execute: async (args) => ({ success: true, data: { deleted: args.ids } }),
    };

    expect(tool.name).toBe('deletePosts');
    expect(tool.needsApproval).toBe(true);
    expect(tool.parameters.status.enum).toEqual(['draft', 'archived']);
  });

  test('tool without approval defaults to undefined', () => {
    const tool: AdminTool = {
      name: 'getStats',
      description: 'Fetch dashboard statistics',
      parameters: {},
      execute: async () => ({ success: true, data: { users: 100 } }),
    };

    expect(tool.needsApproval).toBeUndefined();
  });

  test('tool execute returns ToolResult', async () => {
    const tool: AdminTool = {
      name: 'createPost',
      description: 'Create a new post',
      parameters: {
        title: { type: 'string', required: true },
      },
      execute: async (args) => ({
        success: true,
        data: { id: '1', title: args.title },
      }),
    };

    const result = await tool.execute({ title: 'Hello World' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: '1', title: 'Hello World' });
  });

  test('tool execute can return error', async () => {
    const tool: AdminTool = {
      name: 'failingTool',
      description: 'A tool that fails',
      parameters: {},
      execute: async () => ({
        success: false,
        error: 'Permission denied',
      }),
    };

    const result = await tool.execute({});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});

describe('AgentEvent stream', () => {
  test('events can be collected from async generator', async () => {
    async function* mockAgent(): AsyncGenerator<AgentEvent, void, unknown> {
      yield { type: 'text', content: 'Searching...' };
      yield { type: 'tool_call', tool: 'getList', args: { resource: 'posts' } };
      yield { type: 'tool_result', tool: 'getList', result: { success: true, data: [{ id: 1 }] } };
      yield { type: 'text', content: 'Found 1 post.' };
      yield { type: 'done' };
    }

    const events: AgentEvent[] = [];
    for await (const event of mockAgent()) {
      events.push(event);
    }

    expect(events).toHaveLength(5);
    expect(events[0].type).toBe('text');
    expect(events[1].type).toBe('tool_call');
    expect(events[2].type).toBe('tool_result');
    expect(events[4].type).toBe('done');
  });

  test('approval_request event serializes correctly', () => {
    const event: AgentEvent = {
      type: 'approval_request',
      id: 'req-42',
      tool: 'deletePosts',
      args: { ids: ['1', '2', '3'] },
      description: 'Delete 3 draft posts',
    };

    const serialized = JSON.stringify(event);
    const parsed = JSON.parse(serialized) as AgentEvent;

    expect(parsed.type).toBe('approval_request');
    if (parsed.type === 'approval_request') {
      expect(parsed.id).toBe('req-42');
      expect(parsed.tool).toBe('deletePosts');
      expect(parsed.description).toBe('Delete 3 draft posts');
    }
  });

  test('component event carries name and props', () => {
    const event: AgentEvent = {
      type: 'component',
      name: 'SalesChart',
      props: { period: 'monthly', data: [100, 200, 150] },
    };

    expect(event.type).toBe('component');
    if (event.type === 'component') {
      expect(event.name).toBe('SalesChart');
      expect(event.props.period).toBe('monthly');
    }
  });
});

describe('Approval flow', () => {
  test('registerApproval and resolveApproval work together', () => {
    // Simulate the approval flow without importing rune-based module
    const pending = new Map<string, (approved: boolean) => void>();

    function register(id: string, cb: (approved: boolean) => void) {
      pending.set(id, cb);
    }

    function resolve(id: string, approved: boolean): boolean {
      const cb = pending.get(id);
      if (!cb) return false;
      cb(approved);
      pending.delete(id);
      return true;
    }

    let approvalResult = false;

    register('req-1', (approved) => {
      approvalResult = approved;
    });

    expect(pending.size).toBe(1);

    // Resolve with approval
    const resolved = resolve('req-1', true);
    expect(resolved).toBe(true);
    expect(approvalResult).toEqual(true);
    expect(pending.size).toBe(0);
  });

  test('resolveApproval returns false for unknown id', () => {
    const pending = new Map<string, (approved: boolean) => void>();

    function resolve(id: string, approved: boolean): boolean {
      const cb = pending.get(id);
      if (!cb) return false;
      cb(approved);
      pending.delete(id);
      return true;
    }

    expect(resolve('nonexistent', true)).toBe(false);
  });

  test('rejection flow works', () => {
    const pending = new Map<string, (approved: boolean) => void>();

    function register(id: string, cb: (approved: boolean) => void) {
      pending.set(id, cb);
    }

    function resolve(id: string, approved: boolean): boolean {
      const cb = pending.get(id);
      if (!cb) return false;
      cb(approved);
      pending.delete(id);
      return true;
    }

    let wasApproved = true;

    register('req-2', (approved) => {
      wasApproved = approved;
    });

    resolve('req-2', false);
    expect(wasApproved).toEqual(false);
  });
});

describe("projectAdminToolSchema", () => {
  function projectAdminToolSchema(tool: {
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

  test("projects tool whitelist and strips execution implementation", () => {
    const rawTool = {
      name: "deleteUser",
      description: "Delete a user by id",
      parameters: { id: { type: "string" as const, required: true } },
      readOnly: false,
      destructive: true,
      concurrent: false,
      needsApproval: true,
      execute: async () => ({ success: true }),
      internalState: "secret",
    };

    const projected = projectAdminToolSchema(rawTool);
    expect(projected.name).toBe("deleteUser");
    expect(projected.readOnly).toBe(false);
    expect(projected.destructive).toBe(true);
    expect(projected.concurrent).toBe(false);
    expect(projected.needsApproval).toBe(true);
    expect((projected as Record<string, unknown>).execute).toBeUndefined();
    expect((projected as Record<string, unknown>).internalState).toBeUndefined();
  });

  test("read-only tool projection preserves concurrency flag", () => {
    const rawTool = {
      name: "getUser",
      description: "Fetch a user by id",
      parameters: { id: { type: "string" as const } },
      readOnly: true,
      concurrent: true,
      destructive: false,
    };

    const projected = projectAdminToolSchema(rawTool);
    expect(projected.readOnly).toBe(true);
    expect(projected.concurrent).toBe(true);
    expect(projected.destructive).toBe(false);
    expect(projected.needsApproval).toBeUndefined();
  });
});
