<script lang="ts">
/* eslint-disable svelte/no-at-html-tags */
  import { captureAdminContext } from '@svadmin/core';
  import type { AgentProvider, ChatMessage, ChatAction, ChatContext, ChatProvider } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { useParsed } from '@svadmin/core';
  import { onDestroy, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { fly, fade, scale } from 'svelte/transition';
  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import { MessageCircle, X, Minus, Send, Loader2, Bot, Trash2 } from '@lucide/svelte';

  const i18n = useTranslation();

  interface Props {
    /** Render the launcher inside a layout toolbar instead of as a floating action button. */
    docked?: boolean;
    /**
     * Panel suffix for chat history persistence. Both default and explicit
     * suffixes are scoped by backend API + typed tenant identity.
     * Set to '' to disable persistence.
     */
    persistKey?: string;
    /** Custom persistence callback — called when messages change */
    onPersist?: (messages: ChatMessage[]) => void;
    /** Custom restore callback — called on mount to load history */
    onRestore?: () => ChatMessage[];
    /** Callback when user clicks an action button in an assistant message */
    onAction?: (action: ChatAction, message: ChatMessage) => void;
    /** Stable target for tree-scoped ask-ai events. */
    scope?: string;
    /** Owning Layout scope used to arbitrate global keyboard shortcuts. */
    ownerScope?: string;
  }

  const {
    docked = false,
    persistKey,
    onPersist,
    onRestore,
    onAction,
    scope,
    ownerScope,
  }: Props = $props();
  const generatedId = $props.id();
  const generatedScope = `svadmin-chat-${generatedId}`;
  const componentScope = $derived(scope ?? generatedScope);

  let open = $state(false);
  let minimized = $state(false);
  let inputValue = $state('');
  let messages = $state<ChatMessage[]>([]);
  let isStreaming = $state(false);
  let messagesContainer: HTMLDivElement | undefined = $state();
  let abortController: AbortController | null = null;
  let runEpoch = 0;
  let messageRevision = 0;
  let messageIdCounter = $state(0);

  const adminContext = captureAdminContext();
  const provider = $derived(adminContext.chatProvider);
  const agent = $derived(adminContext.agentProvider);
  const parsed = useParsed();
  const chatContext = $derived.by((): ChatContext => ({
    currentResource: parsed.resource,
    selectedRecordId: parsed.id,
    currentView: parsed.action as ChatContext['currentView'],
    pathname: `/${parsed.resource ?? ''}${parsed.action ? '/' + parsed.action : ''}${parsed.id ? '/' + parsed.id : ''}`,
  }));

  const approvalCallbacks = new SvelteMap<string, (approved: boolean) => void>();

  function stripApprovalActions(persist: boolean) {
    let changed = false;
    const nextMessages = messages.map((message) => {
      if (!message.actions?.some((action) => (
        action.payload != null
        && Object.prototype.hasOwnProperty.call(action.payload, 'approvalId')
      ))) return message;
      changed = true;
      const remainingActions = message.actions.filter((action) => (
        action.payload == null
        || !Object.prototype.hasOwnProperty.call(action.payload, 'approvalId')
      ));
      return {
        ...message,
        actions: remainingActions.length > 0 ? remainingActions : undefined,
      };
    });
    if (!changed) return;
    replaceMessages(nextMessages, persist);
    if (persist) {
      // User-triggered revocation must survive a remount immediately.
      flushPendingPersist();
    }
  }

  function invalidateActiveRun({
    persistApprovalRevocation = true,
  }: { persistApprovalRevocation?: boolean } = {}) {
    runEpoch++;
    const controller = abortController;
    abortController = null;
    isStreaming = false;
    controller?.abort();
    approvalCallbacks.clear();
    stripApprovalActions(persistApprovalRevocation);
  }

  function isCurrentRun(epoch: number, controller: AbortController) {
    return runEpoch === epoch
      && abortController === controller
      && !controller.signal.aborted;
  }

  let previousRunScope: {
    tenantIdentity: string | number | undefined;
    chatProvider: ChatProvider | null;
    agentProvider: AgentProvider | null;
  } | undefined;

  const historyScopeToken = $derived.by(() => {
    let apiUrl = 'unconfigured';
    try {
      apiUrl = adminContext.getDataProvider().getApiUrl();
    } catch {
      // Standalone legacy consumers may configure chat without a DataProvider.
    }
    const tenantIdentity = adminContext.tenantCacheKey?.__svadminTenant;
    const typedTenant = tenantIdentity === undefined
      ? null
      : [typeof tenantIdentity, String(tenantIdentity)];
    const baseKey = `svadmin-chat:${encodeURIComponent(JSON.stringify([apiUrl, typedTenant]))}`;
    return persistKey === undefined
      ? baseKey
      : `${baseKey}:${encodeURIComponent(JSON.stringify(persistKey))}`;
  });
  const resolvedPersistKey = $derived(persistKey === '' ? '' : historyScopeToken);

  interface AskAIEventDetail {
    query: string;
    /** ChatDialog's data-svadmin-chat-scope value. */
    scope?: string;
    /** Compatibility alias for scope. */
    target?: string;
  }

  // ─── Listen for cross-component triggers ─────────────────────
  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: CustomEvent<string | AskAIEventDetail>) => {
      const detail = event.detail;
      if (typeof detail === 'string') return;
      const query = detail?.query;
      const target = detail?.scope ?? detail?.target;
      if (!query?.trim() || target !== componentScope) return;

      open = true;
      minimized = false;
      inputValue = query;
      void sendMessage();
    };
    window.addEventListener('svadmin:ask-ai', handler as EventListener);
    return () => window.removeEventListener('svadmin:ask-ai', handler as EventListener);
  });

  // ─── Persist on change (debounced) ──────────────────────────
  interface PersistSnapshotBase {
    key: string;
    messages: ChatMessage[];
  }
  type PersistSnapshot = PersistSnapshotBase & (
    | { sink: 'callback'; callback: (messages: ChatMessage[]) => void }
    | { sink: 'storage'; storage: Storage | null }
  );

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPersistSnapshot: PersistSnapshot | null = null;
  let restoredHistoryScope = $state<string | null>(null);
  let restoredPersistKey = $state<string | null>(null);

  function getChatStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  function flushPersist(snapshot: PersistSnapshot) {
    if (snapshot.sink === 'callback') {
      snapshot.callback(snapshot.messages);
    } else if (snapshot.key) {
      try {
        snapshot.storage?.setItem(snapshot.key, JSON.stringify(snapshot.messages));
      } catch {
        // storage full or unavailable
      }
    }
  }

  function flushPendingPersist() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    if (lastPersistSnapshot) {
      const snapshot = lastPersistSnapshot;
      lastPersistSnapshot = null;
      flushPersist(snapshot);
    }
  }

  function cancelPendingPersist() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    lastPersistSnapshot = null;
  }

  function schedulePersist(nextMessages: ChatMessage[]) {
    const callback = onPersist;
    let snapshot: PersistSnapshot;
    if (callback) {
      // Custom persistence owns its lifecycle and must not lose early input
      // while the storage-backed restore path is still becoming ready.
      snapshot = {
        sink: 'callback',
        key: restoredPersistKey ?? resolvedPersistKey,
        messages: nextMessages,
        callback,
      };
    } else {
      const restoredKey = restoredPersistKey;
      if (!restoredKey || restoredKey !== resolvedPersistKey) return;
      snapshot = {
        sink: 'storage',
        key: restoredKey,
        messages: nextMessages,
        storage: getChatStorage(),
      };
    }

    if (persistTimer) clearTimeout(persistTimer);
    lastPersistSnapshot = snapshot;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      if (!lastPersistSnapshot) return;
      const pendingSnapshot = lastPersistSnapshot;
      lastPersistSnapshot = null;
      flushPersist(pendingSnapshot);
    }, 300);
  }

  function replaceMessages(nextMessages: ChatMessage[], persist = true) {
    messageRevision++;
    messages = nextMessages;
    if (persist) schedulePersist(nextMessages);
  }

  function updateMessageById(
    messageId: string,
    update: (current: ChatMessage) => ChatMessage,
  ) {
    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    const nextMessages = [...messages];
    nextMessages[index] = update(messages[index]);
    replaceMessages(nextMessages);
  }

  function parseStoredMessage(value: unknown): ChatMessage | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.id !== 'string'
      || (candidate.role !== 'user' && candidate.role !== 'assistant')
      || typeof candidate.content !== 'string'
      || typeof candidate.timestamp !== 'number'
      || !Number.isFinite(candidate.timestamp)
    ) return null;

    // Persisted actions are capability-bearing UI state. Their callbacks do
    // not survive a reload, so never revive them from mutable localStorage.
    return {
      id: candidate.id,
      role: candidate.role,
      content: candidate.content,
      timestamp: candidate.timestamp,
    };
  }

  function parseStoredMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return [];
    const seenIds = new Set<string>();
    const restoredMessages: ChatMessage[] = [];
    for (const candidate of value) {
      const message = parseStoredMessage(candidate);
      if (!message || seenIds.has(message.id)) continue;
      seenIds.add(message.id);
      restoredMessages.push(message);
    }
    return restoredMessages;
  }

  function readStoredMessages(key: string): { found: boolean; messages: ChatMessage[] } {
    const storage = getChatStorage();
    if (!key || !storage) return { found: false, messages: [] };
    try {
      const stored = storage.getItem(key);
      if (stored === null) return { found: false, messages: [] };
      const restored = JSON.parse(stored) as unknown;
      return {
        found: true,
        messages: parseStoredMessages(restored),
      };
    } catch {
      return { found: true, messages: [] };
    }
  }

  function finishRestore(
    scopeToken: string,
    key: string,
    restoredMessages: ChatMessage[],
    persistRestoredMessages = false,
  ) {
    if (historyScopeToken !== scopeToken || resolvedPersistKey !== key) return;
    replaceMessages(restoredMessages, false);
    restoredHistoryScope = scopeToken;
    restoredPersistKey = key;
    if (persistRestoredMessages) schedulePersist(restoredMessages);
  }

  // ─── Restore persisted history for the current tenant/tree ──
  $effect.pre(() => {
    const scopeToken = historyScopeToken;
    const key = resolvedPersistKey;
    return untrack(() => {
      const previousScope = restoredHistoryScope;
      if (previousScope === scopeToken) return;
      if (previousScope !== null) flushPendingPersist();
      invalidateActiveRun({ persistApprovalRevocation: false });
      restoredHistoryScope = null;
      restoredPersistKey = null;
      if (onRestore) {
        finishRestore(scopeToken, key, onRestore(), true);
        return;
      }

      const current = readStoredMessages(key);
      finishRestore(scopeToken, key, current.messages);
      const legacyKey = persistKey === undefined ? 'svadmin-chat' : persistKey;
      if (
        current.found
        || !key
        || !legacyKey
        || legacyKey === key
        || adminContext.tenantCacheKey !== undefined
      ) return;

      // Defer migration so an immediate unmount cannot persist an empty scoped
      // key. The shared historical default is consumed only by a single dialog;
      // explicit historical keys already identify their panel.
      const initialRevision = messageRevision;
      const migrationTimer = setTimeout(() => {
        if (
          historyScopeToken !== scopeToken
          || resolvedPersistKey !== key
          || restoredHistoryScope !== scopeToken
          || restoredPersistKey !== key
          || messageRevision !== initialRevision
        ) return;
        if (
          persistKey === undefined
          && document.querySelectorAll('[data-svadmin-chat-scope]').length !== 1
        ) return;
        const legacy = readStoredMessages(legacyKey);
        if (!legacy.found || legacy.messages.length === 0) return;
        finishRestore(scopeToken, key, legacy.messages, true);
      }, 0);
      return () => clearTimeout(migrationTimer);
    });
  });

  // Provider identity can change without changing the persistence scope. Keep
  // an in-flight run and its approval capabilities bound to their origin tree.
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

  function genId(): string {
    messageIdCounter++;
    return `msg-${Date.now()}-${messageIdCounter}`;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  }

  /** Build a system message with the current admin context */
  function buildContextSystemMessage(): ChatMessage | null {
    const ctx = chatContext;
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

  async function sendMessage() {
    if (!inputValue.trim() || isStreaming || (!provider && !agent)) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    replaceMessages([...messages, userMsg]);
    inputValue = '';
    doSend();
  }

  async function doSend() {
    const activeAgent = agent;
    const activeChatProvider = provider;
    if (isStreaming || (!activeChatProvider && !activeAgent)) return;
    
    scrollToBottom();

    // Create placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    replaceMessages([...messages, assistantMsg]);
    const epoch = ++runEpoch;
    const controller = new AbortController();
    abortController = controller;
    isStreaming = true;
    scrollToBottom();

    try {
      // Build message list with context system message prepended
      const contextMsg = buildContextSystemMessage();
      const allMessages = messages.filter((m) => m.content);
      const messagesToSend = contextMsg ? [contextMsg, ...allMessages] : allMessages;

      if (activeAgent) {
        // ─── AgentProvider path: typed event stream ─────────
        const stream = activeAgent.chat(messagesToSend, {
          signal: controller.signal,
          context: chatContext,
        });

        for await (const event of stream) {
          if (!isCurrentRun(epoch, controller)) break;
          switch (event.type) {
            case 'text':
              assistantMsg.content += event.content;
              updateMessageById(assistantMsg.id, (current) => ({
                ...current,
                content: assistantMsg.content,
              }));
              scrollToBottom();
              break;

            case 'tool_call':
              assistantMsg.content += `\n🔧 *${event.tool}*(${JSON.stringify(event.args)})`;
              updateMessageById(assistantMsg.id, (current) => ({
                ...current,
                content: assistantMsg.content,
              }));
              scrollToBottom();
              break;

            case 'tool_result':
              if (event.result.success) {
                assistantMsg.content += `\n✅ ${event.tool} completed`;
              } else {
                assistantMsg.content += `\n❌ ${event.tool} failed: ${event.result.error ?? 'Unknown error'}`;
              }
              updateMessageById(assistantMsg.id, (current) => ({
                ...current,
                content: assistantMsg.content,
              }));
              scrollToBottom();
              break;

            case 'approval_request': {
              const reqId = event.id;
              approvalCallbacks.set(reqId, (approved) => {
                replaceMessages([...messages, {
                  id: genId(),
                  role: 'user',
                  content: approved ? `User approved execution of tool '${event.tool}'` : `User rejected execution of tool '${event.tool}'`,
                  timestamp: Date.now()
                }]);
                if (activeAgent.approveToolCall) {
                  activeAgent.approveToolCall(reqId, approved);
                }
              });

              const approvalActions: ChatAction[] = [
                {
                  label: `✅ ${i18n.t('common.confirm') || 'Approve'}: ${event.description}`,
                  variant: 'default',
                  payload: { approvalId: reqId, approved: true },
                },
                {
                  label: `❌ ${i18n.t('common.cancel') || 'Reject'}`,
                  variant: 'destructive',
                  payload: { approvalId: reqId, approved: false },
                },
              ];

              assistantMsg.content += `\n⚠️ **${i18n.t('chat.approvalRequired') || 'Approval required'}**: ${event.description}`;
              updateMessageById(assistantMsg.id, (current) => ({
                ...current,
                content: assistantMsg.content,
                actions: [
                  ...(current.actions ?? []).filter((candidate) => (
                    candidate.payload?.approvalId !== reqId
                  )),
                  ...approvalActions,
                ],
              }));
              scrollToBottom();
              break;
            }

            case 'component':
              assistantMsg.content += `\n📊 [${event.name}]`;
              updateMessageById(assistantMsg.id, (current) => ({
                ...current,
                content: assistantMsg.content,
              }));
              scrollToBottom();
              break;

            case 'done':
              break;
          }
        }
      } else if (activeChatProvider) {
        // ─── ChatProvider path: raw text stream ─────────────
        const result = activeChatProvider.sendMessage(
          messagesToSend,
          { signal: controller.signal },
        );

        if (result && typeof result === 'object' && Symbol.asyncIterator in result) {
          for await (const chunk of result as AsyncGenerator<string>) {
            if (!isCurrentRun(epoch, controller)) break;
            assistantMsg.content += chunk;
            updateMessageById(assistantMsg.id, (current) => ({
              ...current,
              content: assistantMsg.content,
            }));
            scrollToBottom();
          }
        } else {
          const text = await (result as Promise<string>);
          if (!isCurrentRun(epoch, controller)) return;
          assistantMsg.content = text;
          updateMessageById(assistantMsg.id, (current) => ({
            ...current,
            content: assistantMsg.content,
          }));
          scrollToBottom();
        }
      }
    } catch (err: unknown) {
      if (!isCurrentRun(epoch, controller)) return;
      if (err instanceof Error && err.name === 'AbortError') return;
      assistantMsg.content = i18n.t('chat.error') || 'Sorry, something went wrong. Please try again.';
      updateMessageById(assistantMsg.id, (current) => ({
        ...current,
        content: assistantMsg.content,
      }));
    } finally {
      if (isCurrentRun(epoch, controller)) {
        isStreaming = false;
        abortController = null;
        flushPendingPersist();
        scrollToBottom();
      }
    }
  }

  function stopStreaming() {
    if (!abortController && !isStreaming) return;
    invalidateActiveRun();
    flushPendingPersist();
  }

  function clearChat() {
    invalidateActiveRun();
    cancelPendingPersist();
    replaceMessages([], false);
    const key = restoredPersistKey ?? resolvedPersistKey;
    const callback = onPersist;
    if (callback) {
      flushPersist({ sink: 'callback', key, messages: [], callback });
    } else if (key) {
      try { getChatStorage()?.removeItem(key); } catch { /* noop */ }
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleGlobalKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      const eventTarget = e.target instanceof HTMLElement ? e.target : document.activeElement as HTMLElement | null;
      const eventLayoutScope = eventTarget
        ?.closest<HTMLElement>('[data-svadmin-layout-scope]')
        ?.dataset.svadminLayoutScope;
      const layoutCount = document.querySelectorAll('[data-svadmin-layout-scope]').length;
      const activeChatScope = eventTarget
        ?.closest<HTMLElement>('[data-svadmin-chat-scope]')
        ?.dataset.svadminChatScope;
      const chatCount = document.querySelectorAll('[data-svadmin-chat-scope]').length;
      const ownsShortcut = ownerScope
        ? (eventLayoutScope ? eventLayoutScope === ownerScope : layoutCount === 1)
        : (activeChatScope ? activeChatScope === componentScope : chatCount === 1);
      if (!ownsShortcut) return;

      e.preventDefault();
      if (open && !minimized) {
        open = false;
      } else {
        open = true;
        minimized = false;
      }
    }
  }

  function handleAction(action: ChatAction, msg: ChatMessage) {
    // Handle approval actions from AgentProvider
    if (action.payload?.approvalId) {
      const id = action.payload.approvalId as string;
      const approved = action.payload.approved as boolean;
      const resolve = approvalCallbacks.get(id);
      approvalCallbacks.delete(id);
      updateMessageById(msg.id, (current) => {
        const remainingActions = current.actions?.filter((candidate) => (
          candidate.payload?.approvalId !== id
        ));
        return {
          ...current,
          actions: remainingActions?.length ? remainingActions : undefined,
        };
      });
      resolve?.(approved);
      return;
    }
    if (onAction) {
      onAction(action, msg);
    }
  }

  function escapeHtml(unsafe: string) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** Simple markdown→html: bold, italic, code blocks, inline code, line breaks */
  function renderMarkdown(text: string): string {
    const escaped = escapeHtml(text);
    const codeBlocks: string[] = [];
    let processed = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre class="chat-code-block"><code>${code}</code></pre>`);
      return `\x00CODEBLOCK${idx}\x00`;
    });
    processed = processed
      .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    for (let i = 0; i < codeBlocks.length; i++) {
      processed = processed.replace(`\x00CODEBLOCK${i}\x00`, codeBlocks[i]);
    }
    return processed;
  }

  const suggestions = $derived([
    i18n.t('chat.suggestion1') || 'How do I create a new resource?',
    i18n.t('chat.suggestion2') || 'Explain the data model',
    i18n.t('chat.suggestion3') || 'Help me write a filter query',
  ]);
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if provider || agent}
  <div
    class="contents"
    data-svadmin-chat-scope={componentScope}
    data-svadmin-chat-visible={open ? 'true' : 'false'}
  >
  <!-- FAB Button -->
  {#if !open}
    <div transition:scale={{ duration: 200 }}>
      <TooltipButton
        tooltip={i18n.t('chat.title') || 'AI Assistant'}
        variant="default"
        size="icon"
        class="{docked ? 'relative h-9 w-9 rounded-md shadow-sm' : 'fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 sm:bottom-6 sm:right-6'} z-[9998] transition-all bg-primary text-primary-foreground"
        onclick={() => { open = true; minimized = false; }}
      >
        <MessageCircle class="h-5 w-5" />
        {#if messages.length > 0}
          <span class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
            {messages.filter(m => m.role === 'assistant').length}
          </span>
        {/if}
      </TooltipButton>
    </div>
  {/if}

  <!-- Chat Panel -->
  {#if open}
    <div
      class="fixed z-[9998] flex flex-col rounded-2xl border bg-card shadow-2xl overflow-hidden bottom-3 right-3 sm:bottom-6 sm:right-6"
      class:w-[calc(100vw-1.5rem)]={!minimized}
      class:sm:w-[400px]={!minimized}
      class:h-[calc(100dvh-6rem)]={!minimized}
      class:sm:h-[560px]={!minimized}
      class:w-[280px]={minimized}
      class:h-auto={minimized}
      transition:fly={{ y: 300, duration: 250 }}
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="flex items-center justify-center h-7 w-7 rounded-full bg-primary-foreground/20">
            <Bot class="h-4 w-4" />
          </div>
          <div>
            <h3 class="text-sm font-semibold leading-none">
              {i18n.t('chat.title') || 'AI Assistant'}
            </h3>
            {#if isStreaming}
              <p class="text-[10px] opacity-80 mt-0.5">{i18n.t('chat.typing') || 'Typing...'}</p>
            {/if}
          </div>
        </div>
        <div class="flex items-center gap-0.5">
          {#if messages.length > 0}
            <TooltipButton
              tooltip={i18n.t('chat.clear') || 'Clear'}
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onclick={clearChat}
            >
              <Trash2 class="h-3.5 w-3.5" />
            </TooltipButton>
          {/if}
          <TooltipButton
            tooltip={minimized ? (i18n.t('common.expand') || 'Expand') : (i18n.t('common.collapse') || 'Minimize')}
            variant="ghost"
            size="icon"
            class="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onclick={() => minimized = !minimized}
          >
            <Minus class="h-3.5 w-3.5" />
          </TooltipButton>
          <TooltipButton
            tooltip={i18n.t('common.close') || 'Close'}
            variant="ghost"
            size="icon"
            class="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onclick={() => open = false}
          >
            <X class="h-3.5 w-3.5" />
          </TooltipButton>
        </div>
      </div>

      {#if !minimized}
        <!-- Messages -->
        <div
          bind:this={messagesContainer}
          class="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
        >
          {#if messages.length === 0}
            <!-- Welcome state -->
            <div class="flex flex-col items-center justify-center h-full text-center px-4" in:fade={{ duration: 200 }}>
              <div class="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot class="h-6 w-6 text-primary" />
              </div>
              <h4 class="text-sm font-semibold text-foreground mb-1">
                {i18n.t('chat.welcome') || 'How can I help?'}
              </h4>
              <p class="text-xs text-muted-foreground mb-4">
                {i18n.t('chat.welcomeDesc') || 'Ask me anything about your admin panel.'}
              </p>
              <div class="flex flex-col gap-2 w-full max-w-[240px]">
                {#each suggestions as suggestion, _i (_i)}
                  <button
                    class="text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    onclick={() => { inputValue = suggestion; }}
                  >
                    {suggestion}
                  </button>
                {/each}
              </div>
            </div>
          {:else}
            {#each messages as msg (msg.id)}
              <div
                class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}"
                in:fly={{ y: 10, duration: 150 }}
              >
                <div
                  class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed {msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'}"
                >
                  {#if msg.role === 'assistant'}
                    {#if msg.content}
                      <div class="chat-markdown">{@html renderMarkdown(msg.content)}</div>
                      <!-- Action Buttons -->
                      {#if msg.actions && msg.actions.length > 0}
                        <div class="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
                          {#each msg.actions as action, _i (_i)}
                            <Button
                              variant={action.variant ?? 'outline'}
                              size="sm"
                              class="h-7 text-xs"
                              onclick={() => handleAction(action, msg)}
                            >
                              {action.label}
                            </Button>
                          {/each}
                        </div>
                      {/if}
                    {:else}
                      <div class="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 class="h-3.5 w-3.5 animate-spin" />
                        <span class="text-xs">{i18n.t('chat.thinking') || 'Thinking...'}</span>
                      </div>
                    {/if}
                  {:else}
                    {msg.content}
                  {/if}
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <!-- Input area -->
        <div class="shrink-0 border-t bg-card p-3">
          <div class="flex items-end gap-2">
            <textarea
              bind:value={inputValue}
              onkeydown={handleKeydown}
              placeholder={i18n.t('chat.placeholder') || 'Type a message...'}
              rows={1}
              disabled={isStreaming}
              class="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-50 max-h-[100px] min-h-[40px]"
            ></textarea>
            {#if isStreaming}
              <Button
                variant="destructive"
                size="icon"
                class="h-10 w-10 rounded-xl shrink-0"
                onclick={stopStreaming}
              >
                <X class="h-4 w-4" />
              </Button>
            {:else}
              <Button
                variant="default"
                size="icon"
                class="h-10 w-10 rounded-xl shrink-0"
                onclick={sendMessage}
                disabled={!inputValue.trim()}
              >
                <Send class="h-4 w-4" />
              </Button>
            {/if}
          </div>
          <p class="text-[10px] text-muted-foreground mt-1.5 text-center">
            <kbd class="px-1 py-0.5 rounded border border-border bg-muted text-[9px] font-mono">Ctrl+Shift+L</kbd>
            {i18n.t('chat.shortcutHint') || 'to toggle'}
          </p>
        </div>
      {/if}
    </div>
  {/if}
  </div>
{/if}
