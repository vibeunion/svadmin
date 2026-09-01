// Headless AI contracts. Rendering lives in @svadmin/ai-elements.

export type ToolState =
  | 'input-streaming'
  | 'input-available'
  | 'approval-requested'
  | 'approval-responded'
  | 'output-available'
  | 'output-denied'
  | 'output-error';

export type MessageStatus = 'submitted' | 'streaming' | 'complete' | 'aborted' | 'error';

export interface ChatAttachment {
  id: string;
  name: string;
  mediaType?: string;
  url?: string;
  size?: number;
  /** 原始浏览器文件，供上传适配器直接读取；持久化恢复时不会保留。 */
  file?: File;
}

export interface ChatSource {
  id?: string;
  title: string;
  url?: string;
  quote?: string;
  description?: string;
}

export type ChatMessagePart =
  | { id?: string; type: 'text'; text: string }
  | { id?: string; type: 'reasoning'; text: string; streaming?: boolean }
  | { id?: string; type: 'tool-call'; tool: string; input: unknown; state: ToolState; callId?: string }
  | { id?: string; type: 'tool-result'; tool: string; output: unknown; error?: string; callId?: string }
  | { id?: string; type: 'source'; source: ChatSource }
  | { id?: string; type: 'image'; src: string; alt?: string; width?: number; height?: number }
  | { id?: string; type: 'file'; file: ChatAttachment }
  | {
      id?: string;
      type: 'approval';
      approvalId: string;
      tool: string;
      input: Record<string, unknown>;
      description: string;
      approved?: boolean;
    }
  | { id?: string; type: 'component'; name: string; props: Record<string, unknown> };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: ChatMessagePart[];
  status?: MessageStatus;
  createdAt: number;
  attachments?: ChatAttachment[];
}

/** Admin context passed separately from untrusted conversation messages. */
export interface ChatContext {
  currentResource?: string;
  selectedRecordId?: string | number;
  currentView?: 'list' | 'edit' | 'create' | 'show' | string;
  pathname?: string;
  metadata?: Record<string, unknown>;
}

/**
 * ChatProvider interface for integrating AI chat into admin panels.
 * Implement `sendMessage` to connect to any AI backend (OpenAI, self-hosted, etc.)
 *
 * Return text or structured parts for non-streaming responses. For streaming
 * transports, yield text chunks and/or structured parts from an async generator.
 */
export interface ChatProvider {
  sendMessage(
    messages: ChatMessage[],
    options?: { signal?: AbortSignal; context?: ChatContext },
  ): Promise<ChatMessagePart[] | string> | AsyncGenerator<ChatMessagePart | string, void, unknown>;
}

// ─── Agent Provider (extends ChatProvider concept) ─────────────
//
// An AgentProvider emits typed events instead of raw strings, enabling:
//   • Tool calling — Agent invokes admin operations (CRUD, custom)
//   • Approval gates — Dangerous tools require user confirmation before execution
//   • Generative UI — Agent returns component name + props for dynamic rendering

/** JSON-Schema-compatible parameter definition for an admin tool. */
export interface AdminToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  enum?: string[];
  required?: boolean;
}

/**
 * A tool that the Agent can invoke within the admin panel.
 *
 * @example
 * ```ts
 * const deletePostTool: AdminTool = {
 *   name: 'deletePosts',
 *   description: 'Delete posts matching a filter',
 *   parameters: {
 *     status: { type: 'string', description: 'Filter by status', enum: ['draft', 'archived'] },
 *   },
 *   needsApproval: true,
 *   execute: async (params) => {
 *     const result = await dataProvider.deleteMany({ resource: 'posts', ids: params.ids });
 *     return { success: true, data: result };
 *   },
 * };
 * ```
 */
export interface AdminTool {
  /** Unique tool name (e.g. 'getList', 'deleteRecords', 'generateReport') */
  name: string;
  /** Human-readable description for LLM tool-use prompting */
  description: string;
  /** JSON-Schema-style parameter definitions */
  parameters: Record<string, AdminToolParameter>;
  /**
   * When `true`, execution is paused until the user explicitly approves.
   * The agent emits an `approval_request` event and waits for `approveToolCall()`.
   */
  needsApproval?: boolean;
  /** 显式声明是否为只读操作（只读操作可并发执行，无副作用） */
  readOnly?: boolean;
  /** 显式声明是否为破坏性/高风险操作（默认触发 Approval Gate） */
  destructive?: boolean;
  /** 显式声明是否支持并发调用 */
  concurrent?: boolean;
  /** Execute the tool with the given arguments. */
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

/** Result returned by a tool execution. */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** Discriminated union of events emitted by an AgentProvider. */
export type AgentEvent =
  /** Streaming text chunk */
  | { type: 'text'; content: string }
  /** Streaming reasoning chunk */
  | { type: 'reasoning'; content: string; streaming?: boolean }
  /** Agent wants to call a tool (informational — execution is handled internally) */
  | { type: 'tool_call'; tool: string; args: Record<string, unknown>; callId?: string }
  /** Agent wants to call a tool that requires user approval before execution */
  | { type: 'approval_request'; id: string; tool: string; args: Record<string, unknown>; description: string }
  /** Tool execution completed */
  | { type: 'tool_result'; tool: string; result: ToolResult; callId?: string }
  /** Source attribution emitted by a retrieval step */
  | { type: 'source'; source: ChatSource }
  /** Agent wants to render a named component (Generative UI) */
  | { type: 'component'; name: string; props: Record<string, unknown> }
  /** Stream finished */
  | { type: 'done' };

/** Options passed to AgentProvider.chat() */
export interface AgentOptions {
  signal?: AbortSignal;
  /** Admin context is injected automatically by the framework */
  context?: ChatContext;
}

/**
 * Cancellation signal supplied while an approval decision is being submitted.
 * Providers must stop before committing tool execution when this signal aborts.
 */
export interface ApprovalResponseOptions {
  signal: AbortSignal;
}

/**
 * AgentProvider — advanced AI integration with tool calling and approval gates.
 *
 * Implement this interface to connect to agentic AI backends that support
 * function calling (OpenAI, Anthropic, Google Gemini, etc.).
 *
 * For simpler chat-only use cases, use `ChatProvider` instead.
 *
 * @example
 * ```ts
 * const agentProvider: AgentProvider = {
 *   tools: [deletePostTool, getStatsTool],
 *   async *chat(messages, options) {
 *     // Stream events from your AI backend
 *     yield { type: 'text', content: 'Looking up draft posts...' };
 *     yield { type: 'tool_call', tool: 'getList', args: { resource: 'posts', filter: { status: 'draft' } } };
 *     yield { type: 'approval_request', id: 'req-1', tool: 'deletePosts', args: { ids: ['1', '2'] }, description: 'Delete 2 draft posts' };
 *     yield { type: 'done' };
 *   },
 * };
 * ```
 */
export interface AgentProvider {
  tools?: AdminTool[];
  chat(
    messages: ChatMessage[],
    options?: AgentOptions,
  ): AsyncGenerator<AgentEvent, void, unknown>;
  approveToolCall?(
    id: string,
    approved: boolean,
    options: ApprovalResponseOptions,
  ): void | Promise<void>;
}

// ─── Chat Provider singleton ───────────────────────────────────

let chatProvider: ChatProvider | null = $state(null);

export function setChatProvider(provider: ChatProvider): void {
  chatProvider = provider;
}

export function getChatProvider(): ChatProvider | null {
  return chatProvider;
}

// ─── Agent Provider singleton ──────────────────────────────────

let agentProvider: AgentProvider | null = $state(null);

export function setAgentProvider(provider: AgentProvider): void {
  agentProvider = provider;
}

export function getAgentProvider(): AgentProvider | null {
  return agentProvider;
}

// ─── Tool Approval ─────────────────────────────────────────────

interface ApprovalCallback {
  (approved: boolean): void;
}
interface ApprovalEntry { id: string; callback: ApprovalCallback }
let pendingApprovals = $state<ApprovalEntry[]>([]);

export function registerApproval(id: string, callback: ApprovalCallback): void {
  if (pendingApprovals.some(e => e.id === id)) return;
  pendingApprovals = [...pendingApprovals, { id, callback }];
}

export function resolveApproval(id: string, approved: boolean): boolean {
  const entry = pendingApprovals.find(e => e.id === id);
  if (!entry) return false;
  pendingApprovals = pendingApprovals.filter(e => e.id !== id);
  try {
    const result: unknown = entry.callback(approved);
    if (result && typeof result === 'object' && 'then' in result) {
      (result as Promise<unknown>).catch((err) => console.error('[svadmin] Approval callback error:', err));
    }
  } catch (err) {
    console.error('[svadmin] Approval callback error:', err);
  }
  return true;
}

export function hasPendingApprovals(): boolean {
  return pendingApprovals.length > 0;
}

// ─── Chat Context singleton ────────────────────────────────────

let chatContext = $state<ChatContext>({});

export function setChatContext(ctx: ChatContext): void {
  chatContext = ctx;
}

export function getChatContext(): ChatContext {
  return chatContext;
}

/**
 * 将 AdminTool 投影为发给 LLM / MCP 客户端的白名单 Schema。
 * 剥离底层执行逻辑（execute）与宿主私有状态，保留 name、description、parameters 及并发/安全声明。
 */
export function projectAdminToolSchema(tool: AdminTool): {
  name: string;
  description: string;
  parameters: Record<string, AdminToolParameter>;
  readOnly?: boolean;
  destructive?: boolean;
  concurrent?: boolean;
  needsApproval?: boolean;
} {
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

export function resetChatProvider(): void {
  chatProvider = null;
  agentProvider = null;
  for (const entry of pendingApprovals) {
    try { entry.callback(false); } catch { /* noop */ }
  }
  pendingApprovals = [];
  chatContext = {};
}
