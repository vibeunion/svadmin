<script lang="ts">
  import { captureAdminContext, useParsed } from '@svadmin/core';
  import { Bot, Maximize2, MessageCircle, Minus, Trash2, X } from '@lucide/svelte';
  import { onDestroy, tick, untrack, type Component } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import type {
    AgentEvent,
    AgentProvider,
    ChatAttachment,
    ChatContext,
    ChatMessage,
    ChatMessagePart,
    ChatProvider,
    ChatSource,
    ToolState,
  } from '../contracts.js';
  import Conversation from './Conversation.svelte';
  import ConversationContent from './ConversationContent.svelte';
  import ConversationEmptyState from './ConversationEmptyState.svelte';
  import Message from './Message.svelte';
  import MessageContent from './MessageContent.svelte';
  import MessageToolbar from './MessageToolbar.svelte';
  import PromptInput from './prompt-input/PromptInput.svelte';
  import Reasoning from './Reasoning.svelte';
  import Response from './Response.svelte';
  import Sources from './Sources.svelte';
  import Tool from './Tool.svelte';
  import { formatToolValue } from './tool/status.js';
  import { cn, safeResourceUrl } from '../utils.js';
  import {
    decodeGeneratedComponentProps,
    type GeneratedComponentProps as GeneratedProps,
    type GeneratedComponentRegistry as ComponentRegistry,
  } from '../generated-components.js';

  export type {
    GeneratedComponentDefinition,
    GeneratedComponentProps,
    GeneratedComponentRegistry,
  } from '../generated-components.js';

  export type ChatPersistenceOperation = 'restore' | 'persist';

  export interface ChatPersistenceErrorDetail {
    operation: ChatPersistenceOperation;
    error: unknown;
  }

  type ResolvedGeneratedComponent = {
    component: Component<GeneratedProps>;
    props: GeneratedProps;
  };

  type Props = {
    /** 在布局工具栏内渲染紧凑启动按钮。 */
    docked?: boolean;
    /** 启用 localStorage 的隔离键。必须包含稳定用户身份；未传或空字符串时不持久化。 */
    persistKey?: string;
    onPersist?: (messages: ChatMessage[]) => void;
    onRestore?: () => ChatMessage[];
    onPersistenceError?: (detail: ChatPersistenceErrorDetail) => void;
    /** 定向接收 `svadmin:ask-ai` 事件的稳定作用域。 */
    scope?: string;
    /** 所属 Layout 作用域，用于仲裁全局快捷键。 */
    ownerScope?: string;
    /** Agent 可渲染的受控组件注册表。未注册名称不会动态加载。 */
    componentRegistry?: ComponentRegistry;
    class?: string;
  };

  type AskAIEventDetail = {
    query: string;
    scope?: string;
    target?: string;
  };

  type PersistSnapshot = {
    key: string;
    messages: ChatMessage[];
    errorHandler?: (detail: ChatPersistenceErrorDetail) => void;
  } & (
    | { sink: 'callback'; callback: (messages: ChatMessage[]) => void }
    | { sink: 'storage'; storage: Storage | null }
  );

  type RestoreResult =
    | { ok: true; messages: ChatMessage[] }
    | { ok: false; error: unknown };

  type ApprovalEntry = {
    agent: AgentProvider;
    controller: AbortController;
    epoch: number;
    messageId: string;
    partId: string;
    tool: string;
  };

  type PendingApprovalEntry = {
    entry: ApprovalEntry;
    controller: AbortController;
  };

  type ApprovalDecision = 'approved' | 'rejected';

  let {
    docked = false,
    persistKey,
    onPersist,
    onRestore,
    onPersistenceError,
    scope,
    ownerScope,
    componentRegistry = {},
    class: className = '',
  }: Props = $props();

  const generatedId = $props.id();
  const componentScope = $derived(scope ?? `svadmin-ai-chat-${generatedId}`);
  const panelId = `${generatedId}-panel`;
  const adminContext = captureAdminContext();
  const parsed = useParsed();
  const provider = $derived(adminContext.chatProvider);
  const agent = $derived(adminContext.agentProvider);
  const chatContext = $derived.by((): ChatContext => ({
    currentResource: parsed.resource,
    selectedRecordId: parsed.id,
    currentView: parsed.action as ChatContext['currentView'],
    pathname: adminContext.currentPath(),
  }));

  let open = $state(false);
  let minimized = $state(false);
  let inputValue = $state('');
  let inputAttachments = $state<ChatAttachment[]>([]);
  let messages = $state<ChatMessage[]>([]);
  let isStreaming = $state(false);
  let chatRoot = $state<HTMLElement | null>(null);
  let launcherButton = $state<HTMLButtonElement | null>(null);
  let abortController: AbortController | null = null;
  let runEpoch = 0;
  let idCounter = 0;

  const approvalEntries = new Map<string, ApprovalEntry>();
  const approvalIds = new Set<string>();
  const approvalErrors = new SvelteMap<string, string>();
  const pendingApprovalEntries = new SvelteMap<string, PendingApprovalEntry>();
  const toolStates = new Set<ToolState>([
    'input-streaming',
    'input-available',
    'approval-requested',
    'approval-responded',
    'output-available',
    'output-denied',
    'output-error',
  ]);

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPersistSnapshot: PersistSnapshot | null = null;
  let restoredHistoryScope = $state<string | null>(null);
  let restoredPersistKey = $state<string | null>(null);
  let restoredCallback: Props['onRestore'];
  let previousPersistCallback: Props['onPersist'];
  let hasPersistCallbackSnapshot = false;
  let persistBlockedScope: string | null = null;
  let persistenceError = $state<string | null>(null);
  let statusAnnouncement = $state('');

  const historyScopeToken = $derived.by(() => {
    let apiUrl = 'unconfigured';
    try {
      apiUrl = adminContext.getDataProvider().getApiUrl();
    } catch {
      // 允许仅配置 AI provider 的独立使用场景。
    }
    const tenantIdentity = adminContext.tenantCacheKey?.__svadminTenant;
    const typedTenant = tenantIdentity === undefined
      ? null
      : [typeof tenantIdentity, String(tenantIdentity)];
    const baseKey = `svadmin-chat:${encodeURIComponent(JSON.stringify([apiUrl, typedTenant]))}`;
    return `${baseKey}:${encodeURIComponent(JSON.stringify(persistKey ?? 'session'))}`;
  });
  const resolvedPersistKey = $derived(persistKey ? historyScopeToken : '');

  let previousRunScope: {
    tenantIdentity: string | number | undefined;
    chatProvider: ChatProvider | null;
    agentProvider: AgentProvider | null;
  } | undefined;

  const suggestions = [
    'How do I create a new resource?',
    'Explain the current data model',
    'Help me write a filter query',
  ];

  function createId(prefix: string): string {
    idCounter += 1;
    return `${prefix}-${Date.now()}-${generatedId}-${idCounter}`;
  }

  function ensurePartId(part: ChatMessagePart, fallbackId = createId('part')): ChatMessagePart {
    return part.id ? part : { ...part, id: fallbackId } as ChatMessagePart;
  }

  function textPart(text: string): ChatMessagePart {
    return { id: createId('part'), type: 'text', text };
  }

  function appendPart(message: ChatMessage, incoming: ChatMessagePart): ChatMessage {
    const part = ensurePartId(incoming);
    const parts = [...message.parts];
    const previous = parts.at(-1);

    if (part.type === 'text' && previous?.type === 'text') {
      parts[parts.length - 1] = { ...previous, text: previous.text + part.text };
    } else if (part.type === 'reasoning' && previous?.type === 'reasoning') {
      parts[parts.length - 1] = {
        ...previous,
        text: previous.text + part.text,
        streaming: part.streaming ?? previous.streaming,
      };
    } else {
      parts.push(part);
    }
    return { ...message, parts };
  }

  function resolveGeneratedComponent(
    name: string,
    props: Record<string, unknown>,
  ): ResolvedGeneratedComponent | { error: 'unavailable' | 'invalid' } {
    if (!Object.prototype.hasOwnProperty.call(componentRegistry, name)) return { error: 'unavailable' };
    const definition = componentRegistry[name];
    try {
      const parsedProps = decodeGeneratedComponentProps(definition, props);
      return {
        component: definition.component as unknown as Component<GeneratedProps>,
        props: parsedProps,
      };
    } catch {
      return { error: 'invalid' };
    }
  }

  function cloneMessages(nextMessages: ChatMessage[]): ChatMessage[] {
    return nextMessages.map((message) => ({
      ...message,
      parts: message.parts.map((part) => {
        if (part.type !== 'file') return { ...part } as ChatMessagePart;
        const { file: _rawFile, ...persistedFile } = part.file;
        return { ...part, file: persistedFile };
      }),
      ...(message.attachments
        ? {
            attachments: message.attachments.map((attachment) => {
              const { file: _rawFile, ...persistedAttachment } = attachment;
              return persistedAttachment;
            }),
          }
        : {}),
    }));
  }

  function getConversationLog(): HTMLElement | null {
    return chatRoot?.querySelector<HTMLElement>('[role="log"]') ?? null;
  }

  function shouldStickToBottom(): boolean {
    const log = getConversationLog();
    if (!log) return true;
    return log.scrollHeight - log.scrollTop - log.clientHeight <= 64;
  }

  function scrollToBottomAfterUpdate(shouldScroll: boolean): void {
    if (!shouldScroll || typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const log = getConversationLog();
      log?.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
    });
  }

  function getChatStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  }

  function reportPersistenceError(
    operation: ChatPersistenceOperation,
    error: unknown,
    errorHandler = onPersistenceError,
  ): void {
    persistenceError = operation === 'restore'
      ? 'Conversation history could not be restored. New messages will not be saved until restoration succeeds.'
      : 'Conversation history could not be saved.';
    statusAnnouncement = persistenceError;
    errorHandler?.({ operation, error });
  }

  function flushPersist(snapshot: PersistSnapshot): void {
    try {
      if (snapshot.sink === 'callback') {
        snapshot.callback(snapshot.messages);
      } else if (snapshot.key) {
        snapshot.storage?.setItem(snapshot.key, JSON.stringify(snapshot.messages));
      }
    } catch (error) {
      reportPersistenceError('persist', error, snapshot.errorHandler);
    }
  }

  function flushPendingPersist(): void {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (!lastPersistSnapshot) return;
    const snapshot = lastPersistSnapshot;
    lastPersistSnapshot = null;
    flushPersist(snapshot);
  }

  function cancelPendingPersist(): void {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    lastPersistSnapshot = null;
  }

  function schedulePersist(nextMessages: ChatMessage[]): void {
    if (persistBlockedScope === historyScopeToken) return;
    const persistedMessages = cloneMessages(nextMessages);
    const callback = onPersist;
    let snapshot: PersistSnapshot;

    if (callback) {
      snapshot = {
        sink: 'callback',
        key: restoredPersistKey ?? resolvedPersistKey,
        messages: persistedMessages,
        callback,
        errorHandler: onPersistenceError,
      };
    } else {
      const key = restoredPersistKey;
      if (key === null || !key || key !== resolvedPersistKey) return;
      let storage: Storage | null;
      try {
        storage = getChatStorage();
      } catch (error) {
        reportPersistenceError('persist', error);
        return;
      }
      snapshot = {
        sink: 'storage',
        key,
        messages: persistedMessages,
        storage,
        errorHandler: onPersistenceError,
      };
    }

    if (persistTimer) clearTimeout(persistTimer);
    lastPersistSnapshot = snapshot;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      if (!lastPersistSnapshot) return;
      const pending = lastPersistSnapshot;
      lastPersistSnapshot = null;
      flushPersist(pending);
    }, 300);
  }

  function replaceMessages(nextMessages: ChatMessage[], persist = true): void {
    const shouldScroll = shouldStickToBottom();
    messages = nextMessages;
    if (persist) schedulePersist(nextMessages);
    scrollToBottomAfterUpdate(shouldScroll);
  }

  function updateMessageById(
    messageId: string,
    update: (message: ChatMessage) => ChatMessage,
  ): boolean {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return false;
    const nextMessages = [...messages];
    nextMessages[index] = update(messages[index]);
    replaceMessages(nextMessages);
    return true;
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }

  function isToolState(value: unknown): value is ToolState {
    return typeof value === 'string' && toolStates.has(value as ToolState);
  }

  function parseStoredSource(value: unknown): ChatSource | null {
    if (!isRecord(value) || typeof value.title !== 'string') return null;
    const url = typeof value.url === 'string' ? safeResourceUrl(value.url) : undefined;
    return {
      ...(typeof value.id === 'string' ? { id: value.id } : {}),
      title: value.title,
      ...(url ? { url } : {}),
      ...(typeof value.quote === 'string' ? { quote: value.quote } : {}),
      ...(typeof value.description === 'string' ? { description: value.description } : {}),
    };
  }

  function parseStoredAttachment(value: unknown): ChatAttachment | null {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
    const url = typeof value.url === 'string' ? safeResourceUrl(value.url) : undefined;
    return {
      id: value.id,
      name: value.name,
      ...(typeof value.mediaType === 'string' ? { mediaType: value.mediaType } : {}),
      ...(url ? { url } : {}),
      ...(typeof value.size === 'number' && Number.isFinite(value.size) ? { size: value.size } : {}),
    };
  }

  function parseStoredPart(value: unknown, fallbackId: string): ChatMessagePart | null {
    if (!isRecord(value) || typeof value.type !== 'string') return null;
    const id = typeof value.id === 'string' && value.id ? value.id : fallbackId;
    switch (value.type) {
      case 'text':
        return typeof value.text === 'string' ? { id, type: 'text', text: value.text } : null;
      case 'reasoning':
        return typeof value.text === 'string'
          ? { id, type: 'reasoning', text: value.text, streaming: false }
          : null;
      case 'tool-call':
        return typeof value.tool === 'string' && isToolState(value.state)
          ? {
              id,
              type: 'tool-call',
              tool: value.tool,
              input: value.input,
              state: value.state,
              ...(typeof value.callId === 'string' ? { callId: value.callId } : {}),
            }
          : null;
      case 'tool-result':
        return typeof value.tool === 'string'
          ? {
              id,
              type: 'tool-result',
              tool: value.tool,
              output: value.output,
              ...(typeof value.error === 'string' ? { error: value.error } : {}),
              ...(typeof value.callId === 'string' ? { callId: value.callId } : {}),
            }
          : null;
      case 'source': {
        const source = parseStoredSource(value.source);
        return source ? { id, type: 'source', source } : null;
      }
      case 'image': {
        const src = typeof value.src === 'string' ? safeResourceUrl(value.src) : undefined;
        return src
          ? {
              id,
              type: 'image',
              src,
              ...(typeof value.alt === 'string' ? { alt: value.alt } : {}),
              ...(typeof value.width === 'number' && Number.isFinite(value.width) ? { width: value.width } : {}),
              ...(typeof value.height === 'number' && Number.isFinite(value.height) ? { height: value.height } : {}),
            }
          : null;
      }
      case 'file': {
        const file = parseStoredAttachment(value.file);
        return file ? { id, type: 'file', file } : null;
      }
      case 'approval':
        // 审批依赖运行时能力，已处理与未处理状态都不能从存储中复活。
        return null;
      case 'component':
        // generated component 可能承载宿主动作，恢复时按能力状态丢弃。
        return null;
      default:
        return null;
    }
  }

  function parseStoredMessage(value: unknown): ChatMessage | null {
    if (!isRecord(value)) return null;
    if (
      typeof value.id !== 'string'
      || (value.role !== 'user' && value.role !== 'assistant')
      || !Array.isArray(value.parts)
      || typeof value.createdAt !== 'number'
      || !Number.isFinite(value.createdAt)
    ) return null;

    const parts = value.parts
      .map((part, index) => parseStoredPart(part, `${value.id}-part-${index}`))
      .filter((part): part is ChatMessagePart => part !== null);
    if (parts.length === 0) return null;

    const attachments = Array.isArray(value.attachments)
      ? value.attachments
          .map(parseStoredAttachment)
          .filter((attachment): attachment is ChatAttachment => attachment !== null)
      : [];
    return {
      id: value.id,
      role: value.role,
      parts,
      status: value.status === 'error' || value.status === 'aborted' ? value.status : 'complete',
      createdAt: value.createdAt,
      ...(attachments.length > 0 ? { attachments } : {}),
    };
  }

  function parseStoredMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];
    const restored: ChatMessage[] = [];
    const seenIds = new Set<string>();
    for (const candidate of value) {
      const message = parseStoredMessage(candidate);
      if (!message || seenIds.has(message.id)) continue;
      seenIds.add(message.id);
      restored.push(message);
    }
    return restored;
  }

  function readStoredMessages(key: string): RestoreResult {
    if (!key) return { ok: true, messages: [] };
    try {
      const storage = getChatStorage();
      if (!storage) return { ok: true, messages: [] };
      const stored = storage.getItem(key);
      return {
        ok: true,
        messages: stored === null ? [] : parseStoredMessages(JSON.parse(stored) as unknown),
      };
    } catch (error) {
      return { ok: false, error };
    }
  }

  function finishRestore(
    scopeToken: string,
    key: string,
    restoredMessages: ChatMessage[],
    persistRestoredMessages = false,
  ): void {
    if (historyScopeToken !== scopeToken || resolvedPersistKey !== key) return;
    replaceMessages(restoredMessages, false);
    restoredHistoryScope = scopeToken;
    restoredPersistKey = key;
    if (persistRestoredMessages) schedulePersist(restoredMessages);
  }

  function stripPendingApprovals(nextMessages: ChatMessage[]): ChatMessage[] {
    return nextMessages.map((message) => {
      let changed = false;
      const parts: ChatMessagePart[] = [];
      for (const part of message.parts) {
        if (part.type === 'approval' && part.approved === undefined) {
          changed = true;
          continue;
        }
        if (part.type === 'reasoning' && part.streaming) {
          changed = true;
          parts.push({ ...part, streaming: false });
          continue;
        }
        parts.push(part);
      }
      const status = message.status === 'streaming' || message.status === 'submitted'
        ? 'aborted' as const
        : message.status;
      if (status !== message.status) changed = true;
      return changed ? { ...message, parts, status } : message;
    });
  }

  function invalidateRunApprovals(epoch: number, controller: AbortController): void {
    for (const [approvalId, entry] of approvalEntries) {
      if (entry.epoch !== epoch || entry.controller !== controller) continue;
      approvalEntries.delete(approvalId);
      approvalErrors.delete(approvalId);
      const pending = pendingApprovalEntries.get(approvalId);
      if (pending?.entry === entry) {
        pending.controller.abort();
        pendingApprovalEntries.delete(approvalId);
      }
    }
  }

  function invalidateActiveRun({ persist = true }: { persist?: boolean } = {}): void {
    runEpoch += 1;
    const controller = abortController;
    abortController = null;
    isStreaming = false;
    controller?.abort();
    for (const entry of approvalEntries.values()) {
      entry.controller.abort();
    }
    for (const pending of pendingApprovalEntries.values()) pending.controller.abort();
    approvalEntries.clear();
    approvalIds.clear();
    approvalErrors.clear();
    pendingApprovalEntries.clear();

    const nextMessages = stripPendingApprovals(messages);
    const changed = nextMessages.some((message, index) => message !== messages[index]);
    if (changed) replaceMessages(nextMessages, persist);
    if (persist) flushPendingPersist();
  }

  function isCurrentRun(epoch: number, controller: AbortController): boolean {
    return runEpoch === epoch
      && abortController === controller
      && !controller.signal.aborted;
  }

  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string | AskAIEventDetail>).detail;
      if (!detail || typeof detail === 'string') return;
      const target = detail.scope ?? detail.target;
      const query = detail.query?.trim();
      if (!query || target !== componentScope) return;
      open = true;
      minimized = false;
      inputValue = query;
      void sendMessage(query, []);
    };
    window.addEventListener('svadmin:ask-ai', handler);
    return () => window.removeEventListener('svadmin:ask-ai', handler);
  });

  // 延迟快照必须写回创建它时捕获的 callback，不能被 rerender 后的新 callback 接管。
  $effect.pre(() => {
    const callback = onPersist;
    untrack(() => {
      if (!hasPersistCallbackSnapshot) {
        previousPersistCallback = callback;
        hasPersistCallbackSnapshot = true;
        return;
      }
      if (previousPersistCallback === callback) return;
      flushPendingPersist();
      previousPersistCallback = callback;
    });
  });

  // 每个 API + 类型化租户 + 显式用户键拥有独立历史和运行作用域。
  $effect.pre(() => {
    const scopeToken = historyScopeToken;
    const key = resolvedPersistKey;
    const restore = onRestore;
    untrack(() => {
      if (
        restoredHistoryScope === scopeToken
        && restoredPersistKey === key
        && restoredCallback === restore
      ) return;
      if (restoredHistoryScope !== null) flushPendingPersist();
      invalidateActiveRun({ persist: false });
      restoredHistoryScope = null;
      restoredPersistKey = null;
      restoredCallback = restore;
      persistBlockedScope = null;
      persistenceError = null;

      if (restore) {
        try {
          finishRestore(scopeToken, key, parseStoredMessages(restore()), true);
        } catch (error) {
          persistBlockedScope = scopeToken;
          finishRestore(scopeToken, key, []);
          reportPersistenceError('restore', error);
        }
      } else {
        const restored = readStoredMessages(key);
        if (!restored.ok) {
          persistBlockedScope = scopeToken;
          finishRestore(scopeToken, key, []);
          reportPersistenceError('restore', restored.error);
        } else {
          finishRestore(scopeToken, key, restored.messages);
        }
      }
    });
  });

  // provider 身份可以在持久化 key 不变时变化，迟到结果仍必须失效。
  $effect.pre(() => {
    const nextRunScope = {
      tenantIdentity: adminContext.tenantCacheKey?.__svadminTenant,
      chatProvider: provider,
      agentProvider: agent,
    };
    untrack(() => {
      const previous = previousRunScope;
      previousRunScope = nextRunScope;
      if (!previous) return;
      if (
        Object.is(previous.tenantIdentity, nextRunScope.tenantIdentity)
        && previous.chatProvider === nextRunScope.chatProvider
        && previous.agentProvider === nextRunScope.agentProvider
      ) return;
      invalidateActiveRun();
    });
  });

  onDestroy(() => {
    invalidateActiveRun();
    flushPendingPersist();
  });

  function replaceMessage(message: ChatMessage): void {
    updateMessageById(message.id, () => message);
  }

  function isAsyncIterable(value: unknown): value is AsyncIterable<ChatMessagePart | string> {
    return Boolean(
      value
      && (typeof value === 'object' || typeof value === 'function')
      && Symbol.asyncIterator in value
      && typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function',
    );
  }

  function applyAgentEvent(
    message: ChatMessage,
    event: Exclude<AgentEvent, { type: 'done' }>,
    activeAgent: AgentProvider,
    controller: AbortController,
    epoch: number,
  ): ChatMessage {
    switch (event.type) {
      case 'text':
        return appendPart(message, textPart(event.content));
      case 'reasoning':
        return appendPart(message, {
          id: createId('part'),
          type: 'reasoning',
          text: event.content,
          streaming: event.streaming,
        });
      case 'tool_call':
        return appendPart(message, {
          id: createId('part'),
          type: 'tool-call',
          tool: event.tool,
          input: event.args,
          state: 'input-available',
          ...('callId' in event && typeof event.callId === 'string' ? { callId: event.callId } : {}),
        });
      case 'tool_result':
        return appendPart(message, {
          id: createId('part'),
          type: 'tool-result',
          tool: event.tool,
          output: event.result.data ?? event.result.error,
          ...(event.result.error ? { error: event.result.error } : {}),
          ...('callId' in event && typeof event.callId === 'string' ? { callId: event.callId } : {}),
        });
      case 'source':
        return appendPart(message, {
          id: createId('part'),
          type: 'source',
          source: event.source,
        });
      case 'component':
        return appendPart(message, {
          id: createId('part'),
          type: 'component',
          name: event.name,
          props: event.props,
        });
      case 'approval_request': {
        if (approvalIds.has(event.id)) {
          throw new Error(`Duplicate approval id received: ${event.id}`);
        }
        approvalIds.add(event.id);
        const approvalPartId = createId('part');
        const approvalPart: ChatMessagePart = {
          id: approvalPartId,
          type: 'approval',
          approvalId: event.id,
          tool: event.tool,
          input: event.args,
          description: event.description,
        };
        approvalErrors.delete(event.id);
        pendingApprovalEntries.delete(event.id);
        approvalEntries.set(event.id, {
          agent: activeAgent,
          controller,
          epoch,
          messageId: message.id,
          partId: approvalPartId,
          tool: event.tool,
        });
        return appendPart(message, approvalPart);
      }
    }
  }

  async function consumeAgentEvents(
    activeAgent: AgentProvider,
    sentMessages: ChatMessage[],
    assistant: ChatMessage,
    controller: AbortController,
    epoch: number,
  ): Promise<ChatMessage> {
    let current = assistant;
    for await (const event of activeAgent.chat(sentMessages, {
      signal: controller.signal,
      context: chatContext,
    })) {
      if (!isCurrentRun(epoch, controller)) break;
      if (event.type === 'done') break;
      const latest = messages.find((message) => message.id === assistant.id) ?? current;
      current = applyAgentEvent(latest, event, activeAgent, controller, epoch);
      replaceMessage(current);
    }
    return current;
  }

  async function consumeChatResult(
    activeProvider: ChatProvider,
    sentMessages: ChatMessage[],
    assistant: ChatMessage,
    controller: AbortController,
    epoch: number,
  ): Promise<ChatMessage> {
    let current = assistant;
    const response = activeProvider.sendMessage(sentMessages, {
      signal: controller.signal,
      context: chatContext,
    });
    if (isAsyncIterable(response)) {
      for await (const chunk of response) {
        if (!isCurrentRun(epoch, controller)) break;
        const latest = messages.find((message) => message.id === assistant.id) ?? current;
        current = appendPart(latest, typeof chunk === 'string' ? textPart(chunk) : chunk);
        replaceMessage(current);
      }
      return current;
    }

    const resolved = await response;
    if (!isCurrentRun(epoch, controller)) return current;
    const parts = typeof resolved === 'string'
      ? (resolved ? [textPart(resolved)] : [])
      : resolved.map((part) => ensurePartId(part));
    current = { ...current, parts };
    replaceMessage(current);
    return current;
  }

  async function sendMessage(
    rawValue = inputValue,
    attachments = inputAttachments,
  ): Promise<void> {
    const value = rawValue.trim();
    const activeAgent = agent;
    const activeProvider = provider;
    if ((value.length === 0 && attachments.length === 0) || isStreaming || (!activeAgent && !activeProvider)) return;

    // 新运行会撤销上一轮仍未解决的审批能力。
    if (approvalEntries.size > 0 || abortController) invalidateActiveRun();
    approvalIds.clear();

    const submittedAttachments = attachments.map((attachment) => ({ ...attachment }));
    const userParts: ChatMessagePart[] = [
      ...(value ? [textPart(value)] : []),
      ...submittedAttachments.map((file): ChatMessagePart => ({
        id: createId('part'),
        type: 'file',
        file,
      })),
    ];
    const userMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      parts: userParts,
      status: 'complete',
      createdAt: Date.now(),
      ...(submittedAttachments.length > 0 ? { attachments: submittedAttachments } : {}),
    };
    const assistantMessage: ChatMessage = {
      id: createId('assistant'),
      role: 'assistant',
      parts: [],
      status: 'streaming',
      createdAt: Date.now(),
    };
    const nextMessages = [...messages, userMessage, assistantMessage];
    const sentMessages = nextMessages.filter((message) => message.parts.length > 0);

    inputValue = '';
    inputAttachments = [];
    replaceMessages(nextMessages);

    const controller = new AbortController();
    const epoch = ++runEpoch;
    abortController = controller;
    isStreaming = true;
    statusAnnouncement = 'Assistant response started.';

    let outcome: 'complete' | 'aborted' | 'failed' = 'complete';
    try {
      const completed = activeAgent
        ? await consumeAgentEvents(activeAgent, sentMessages, assistantMessage, controller, epoch)
        : activeProvider
          ? await consumeChatResult(activeProvider, sentMessages, assistantMessage, controller, epoch)
          : assistantMessage;
      if (!isCurrentRun(epoch, controller)) return;
      replaceMessage({
        ...completed,
        parts: completed.parts.map((part) => (
          part.type === 'reasoning' ? { ...part, streaming: false } : part
        )),
        status: 'complete',
      });
    } catch (error) {
      if (!isCurrentRun(epoch, controller)) return;
      const current = messages.find((message) => message.id === assistantMessage.id) ?? assistantMessage;
      invalidateRunApprovals(epoch, controller);
      if (error instanceof Error && error.name === 'AbortError') {
        outcome = 'aborted';
        const abortedMessage = stripPendingApprovals([{
          ...current,
          status: 'aborted',
        }])[0] ?? { ...current, parts: [], status: 'aborted' as const };
        replaceMessage(abortedMessage);
        return;
      }
      outcome = 'failed';
      const failedMessage = stripPendingApprovals([{
        ...current,
        status: 'error',
      }])[0] ?? { ...current, parts: [], status: 'error' as const };
      replaceMessage(appendPart(
        failedMessage,
        textPart(`${failedMessage.parts.length > 0 ? '\n\n' : ''}Sorry, something went wrong. Please try again.`),
      ));
    } finally {
      if (isCurrentRun(epoch, controller)) {
        abortController = null;
        isStreaming = false;
        statusAnnouncement = outcome === 'failed'
          ? 'Assistant response failed.'
          : outcome === 'aborted'
            ? 'Assistant response stopped.'
            : 'Assistant response complete.';
        flushPendingPersist();
      }
    }
  }

  function isActiveApproval(approvalId: string, entry: ApprovalEntry): boolean {
    return approvalEntries.get(approvalId) === entry
      && entry.epoch === runEpoch
      && !entry.controller.signal.aborted;
  }

  function approvalErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return `Approval failed: ${error.message}`;
    return 'Approval failed. Please try again.';
  }

  function reportApprovalError(approvalId: string, message: string): void {
    approvalErrors.set(approvalId, message);
    statusAnnouncement = 'Approval response failed.';
  }

  function createApprovalConfirmation(entry: ApprovalEntry, decision: ApprovalDecision): ChatMessage {
    return {
      id: createId('user'),
      role: 'user',
      parts: [textPart(
        `User ${decision} execution of tool '${entry.tool}'`,
      )],
      status: 'complete',
      createdAt: Date.now(),
    };
  }

  function applyApprovalDecision(approvalId: string, entry: ApprovalEntry, decision: ApprovalDecision): void {
    const approved = decision === 'approved';
    const updatedMessages = messages.map((message) => (
      message.id === entry.messageId
        ? {
            ...message,
            parts: message.parts.map((part) => (
              part.type === 'approval' && part.id === entry.partId && part.approvalId === approvalId
                ? { ...part, approved }
                : part
            )),
          }
        : message
    ));
    replaceMessages([...updatedMessages, createApprovalConfirmation(entry, decision)]);
  }

  function commitApprovalDecision(approvalId: string, entry: ApprovalEntry, decision: ApprovalDecision): void {
    approvalEntries.delete(approvalId);
    approvalErrors.delete(approvalId);
    applyApprovalDecision(approvalId, entry, decision);
    statusAnnouncement = decision === 'approved'
      ? 'Tool execution approved.'
      : 'Tool execution rejected.';
  }

  async function respondToApproval(
    approvalId: string,
    partId: string | undefined,
    decision: ApprovalDecision,
  ): Promise<void> {
    const entry = approvalEntries.get(approvalId);
    if (
      !entry
      || entry.partId !== partId
      || pendingApprovalEntries.has(approvalId)
      || !isActiveApproval(approvalId, entry)
    ) return;

    const respond = entry.agent.approveToolCall;
    if (!respond) {
      reportApprovalError(approvalId, 'Approval failed: the agent does not provide an approval handler.');
      return;
    }

    const pending = {
      entry,
      controller: new AbortController(),
    };
    pendingApprovalEntries.set(approvalId, pending);
    approvalErrors.delete(approvalId);

    try {
      await respond.call(entry.agent, approvalId, decision === 'approved', {
        signal: pending.controller.signal,
      });
    } catch (error) {
      if (!pending.controller.signal.aborted && isActiveApproval(approvalId, entry)) {
        reportApprovalError(approvalId, approvalErrorMessage(error));
      }
      return;
    } finally {
      if (pendingApprovalEntries.get(approvalId) === pending) {
        pendingApprovalEntries.delete(approvalId);
      }
    }

    if (pending.controller.signal.aborted || !isActiveApproval(approvalId, entry)) return;
    commitApprovalDecision(approvalId, entry, decision);
  }

  function stopStreaming(): void {
    if (!abortController && !isStreaming) return;
    invalidateActiveRun();
    statusAnnouncement = 'Assistant response stopped.';
    flushPendingPersist();
  }

  function clearChat(): void {
    invalidateActiveRun({ persist: false });
    cancelPendingPersist();
    persistBlockedScope = null;
    persistenceError = null;
    replaceMessages([], false);
    statusAnnouncement = 'Conversation cleared.';
    const key = restoredPersistKey ?? resolvedPersistKey;
    const callback = onPersist;
    if (callback) {
      flushPersist({ sink: 'callback', key, messages: [], callback });
    } else if (key) {
      try {
        getChatStorage()?.removeItem(key);
      } catch (error) {
        reportPersistenceError('persist', error);
      }
    }
  }

  function openDialog(): void {
    open = true;
    minimized = false;
    void tick().then(() => chatRoot?.querySelector<HTMLTextAreaElement>('textarea')?.focus());
  }

  function closeDialog(): void {
    open = false;
    void tick().then(() => launcherButton?.focus());
  }

  function handleGlobalKeydown(event: KeyboardEvent): void {
    if (!provider && !agent) return;
    if (!((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'l')) return;
    const eventTarget = event.target instanceof HTMLElement
      ? event.target
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const eventLayoutScope = eventTarget
      ?.closest<HTMLElement>('[data-svadmin-layout-scope]')
      ?.dataset.svadminLayoutScope;
    const eventChatScope = eventTarget
      ?.closest<HTMLElement>('[data-svadmin-chat-scope]')
      ?.dataset.svadminChatScope;
    const layoutCount = document.querySelectorAll('[data-svadmin-layout-scope]').length;
    const chatCount = document.querySelectorAll('[data-svadmin-chat-scope]').length;
    const ownsShortcut = ownerScope
      ? (eventLayoutScope ? eventLayoutScope === ownerScope : layoutCount === 1)
      : (eventChatScope ? eventChatScope === componentScope : chatCount === 1);
    if (!ownsShortcut) return;

    event.preventDefault();
    if (open && !minimized) {
      closeDialog();
    } else {
      openDialog();
    }
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if provider || agent}
  <div
    bind:this={chatRoot}
    class={cn('svadmin-ai contents', className)}
    data-svadmin-chat-scope={componentScope}
    data-svadmin-chat-visible={open ? 'true' : 'false'}
  >
    {#if !open}
      <button
        bind:this={launcherButton}
        type="button"
        class={cn(
          'svadmin-ai__button z-[9998] shadow-lg',
          docked
            ? 'relative size-9 p-0'
            : 'fixed bottom-4 right-4 size-12 rounded-full p-0 sm:bottom-6 sm:right-6',
        )}
        aria-label="Open AI assistant"
        aria-controls={panelId}
        aria-expanded="false"
        onclick={openDialog}
      >
        <MessageCircle size={20} aria-hidden="true" />
        {#if messages.some((message) => message.role === 'assistant')}
          <span class="svadmin-ai__sr-only">Conversation has replies</span>
        {/if}
      </button>
    {/if}

    {#if open}
      <section
        id={panelId}
        class={cn(
          'svadmin-ai__surface fixed bottom-3 right-3 z-[9998] flex max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden shadow-xl sm:bottom-6 sm:right-6',
          minimized
            ? 'h-auto w-[min(18rem,calc(100vw-1.5rem))]'
            : 'h-[min(42rem,calc(100dvh-1.5rem))] w-[min(42rem,calc(100vw-1.5rem))]',
        )}
        aria-label="AI assistant"
        aria-busy={isStreaming}
      >
        <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-card px-4 py-3 text-card-foreground">
          <div class="flex min-w-0 items-center gap-2">
            <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden="true">
              <Bot size={16} />
            </span>
            <div class="min-w-0">
              <h2 class="truncate text-sm font-semibold">AI assistant</h2>
              <p class="svadmin-ai__muted truncate text-xs" aria-live="polite">
                {isStreaming ? 'Generating response' : (chatContext.currentResource ?? 'Workspace')}
              </p>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            {#if messages.length > 0}
              <button
                type="button"
                class="svadmin-ai__icon-button"
                aria-label="Clear conversation"
                title="Clear conversation"
                onclick={clearChat}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            {/if}
            <button
              type="button"
              class="svadmin-ai__icon-button"
              aria-label={minimized ? 'Expand AI assistant' : 'Minimize AI assistant'}
              title={minimized ? 'Expand AI assistant' : 'Minimize AI assistant'}
              aria-expanded={!minimized}
              onclick={() => { minimized = !minimized; }}
            >
              {#if minimized}
                <Maximize2 size={15} aria-hidden="true" />
              {:else}
                <Minus size={15} aria-hidden="true" />
              {/if}
            </button>
            <button
              type="button"
              class="svadmin-ai__icon-button"
              aria-label="Close AI assistant"
              title="Close AI assistant"
              onclick={closeDialog}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        {#if !minimized}
          {#if persistenceError}
            <div class="border-b border-destructive/25 bg-destructive/10 px-4 py-2 text-xs text-destructive" role="alert">
              {persistenceError}
            </div>
          {/if}
          <Conversation {messages} {isStreaming} class="min-h-0 flex-1 rounded-none border-0">
            <ConversationContent class="gap-2">
              {#if messages.length === 0}
                <ConversationEmptyState>
                  <div class="space-y-1">
                    <h3 class="text-sm font-medium">How can I help?</h3>
                    <p class="svadmin-ai__muted text-sm">Ask about the current resource, record, or workflow.</p>
                  </div>
                  <div class="mt-3 flex w-full max-w-72 flex-col gap-2">
                    {#each suggestions as suggestion (suggestion)}
                      <button
                        type="button"
                        class="svadmin-ai__button svadmin-ai__button--ghost min-h-9 justify-start px-3 text-left text-xs"
                        onclick={() => { inputValue = suggestion; }}
                      >
                        {suggestion}
                      </button>
                    {/each}
                  </div>
                </ConversationEmptyState>
              {/if}

              {#each messages as message (message.id)}
                <Message from={message.role} id={message.id}>
                  <MessageContent class={message.role === 'user' ? 'bg-primary text-primary-foreground' : ''}>
                    {#if message.parts.length === 0 && message.status === 'streaming'}
                      <p class="svadmin-ai__muted text-sm">Thinking...</p>
                    {/if}
                    {#each message.parts as part, partIndex (part.id ?? `${message.id}-part-${partIndex}`)}
                      {#if part.type === 'text'}
                        <Response
                          text={part.text}
                          streaming={message.status === 'streaming' && partIndex === message.parts.length - 1}
                        />
                      {:else if part.type === 'reasoning'}
                        <Reasoning
                          text={part.text}
                          streaming={message.status === 'streaming' && part.streaming !== false}
                          open={message.status === 'streaming' && part.streaming !== false}
                        />
                      {:else if part.type === 'tool-call'}
                        <Tool part={part} />
                      {:else if part.type === 'tool-result'}
                        <Tool
                          name={part.tool}
                          output={part.output ?? part.error}
                          state={part.error ? 'output-error' : 'output-available'}
                          open={Boolean(part.error)}
                        />
                      {:else if part.type === 'source'}
                        <Sources sources={[part.source]} />
                      {:else if part.type === 'image'}
                        {@const imageUrl = safeResourceUrl(part.src)}
                        {#if imageUrl}
                          <img
                            src={imageUrl}
                            alt={part.alt ?? 'Generated image'}
                            class="max-h-80 max-w-full rounded border border-border object-contain"
                            width={part.width}
                            height={part.height}
                            loading="lazy"
                          />
                        {:else}
                          <span class="svadmin-ai__muted text-xs">Image unavailable</span>
                        {/if}
                      {:else if part.type === 'file'}
                        {@const fileUrl = safeResourceUrl(part.file.url)}
                        {#if fileUrl}
                          <a
                            href={fileUrl}
                            class="inline-flex min-h-8 items-center text-primary underline underline-offset-4"
                            download={part.file.name}
                            rel="external"
                          >
                            {part.file.name}
                          </a>
                        {:else}
                          <span class="inline-flex min-h-8 items-center text-sm">{part.file.name}</span>
                        {/if}
                      {:else if part.type === 'approval'}
                        {#if part.approved === undefined}
                          {@const approvalError = approvalErrors.get(part.approvalId)}
                          {@const approvalPending = pendingApprovalEntries.has(part.approvalId)}
                          <div class="svadmin-ai__surface my-2 space-y-3 p-3" role="group" aria-label={part.description}>
                            <div>
                              <p class="text-sm font-medium">Approval required</p>
                              <p class="svadmin-ai__muted mt-1 text-xs">{part.description}</p>
                              <p class="mt-2 text-xs font-medium">Tool: {part.tool}</p>
                              <pre
                                class="mt-2 max-h-48 overflow-auto rounded bg-muted p-2 text-xs"
                                aria-label={`Arguments for ${part.tool}`}
                              >{formatToolValue(part.input)}</pre>
                            </div>
                            <div class="flex flex-wrap gap-2">
                              <button
                                type="button"
                                class="svadmin-ai__button min-h-8 px-3 text-xs"
                                aria-label={`Approve: ${part.description}`}
                                disabled={approvalPending}
                                onclick={() => void respondToApproval(part.approvalId, part.id, 'approved')}
                              >
                                {approvalPending ? 'Submitting...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                class="svadmin-ai__button svadmin-ai__button--danger min-h-8 px-3 text-xs"
                                aria-label={`Reject: ${part.description}`}
                                disabled={approvalPending}
                                onclick={() => void respondToApproval(part.approvalId, part.id, 'rejected')}
                              >
                                Reject
                              </button>
                            </div>
                            {#if approvalError}
                              <p class="text-xs text-destructive" role="alert">{approvalError}</p>
                            {/if}
                          </div>
                        {:else}
                          <Tool
                            name={part.tool}
                            input={part.input}
                            state={part.approved ? 'approval-responded' : 'output-denied'}
                            output={part.approved ? 'Approved' : 'Rejected'}
                            open={true}
                          />
                        {/if}
                      {:else if part.type === 'component'}
                        {@const generated = resolveGeneratedComponent(part.name, part.props)}
                        {#if 'error' in generated && generated.error === 'unavailable'}
                          <div class="rounded border border-border bg-muted p-3 text-xs" role="status">
                            Component unavailable: {part.name}
                          </div>
                        {:else if 'error' in generated}
                          <div class="rounded border border-border bg-muted p-3 text-xs" role="status">
                            Component invalid: {part.name}
                          </div>
                        {:else}
                          <svelte:boundary>
                            <generated.component {...generated.props} />
                            {#snippet failed()}
                              <div class="rounded border border-border bg-muted p-3 text-xs" role="status">
                                Component failed: {part.name}
                              </div>
                            {/snippet}
                          </svelte:boundary>
                        {/if}
                      {/if}
                    {/each}
                  </MessageContent>
                  <MessageToolbar>
                    <span>{message.status ?? 'complete'}</span>
                  </MessageToolbar>
                </Message>
              {/each}
            </ConversationContent>
          </Conversation>

          <footer class="shrink-0 border-t border-border/70 bg-card p-3">
            <PromptInput
              bind:value={inputValue}
              bind:attachments={inputAttachments}
              disabled={isStreaming}
              loading={isStreaming}
              placeholder="Type a message..."
              ariaLabel="Message AI assistant"
              onsubmit={(detail) => { void sendMessage(detail.value, detail.attachments); }}
              onstop={stopStreaming}
            />
          </footer>
        {/if}
      </section>
    {/if}
    <p class="svadmin-ai__sr-only" aria-live="polite">{statusAnnouncement}</p>
  </div>
{/if}
