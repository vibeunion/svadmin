<script lang="ts">
/* eslint-disable no-undef, svelte/no-at-html-tags */
  import { getChatProvider, getChatContext, setChatContext, getAgentProvider, registerApproval, resolveApproval } from '@svadmin/core';
  import type { ChatMessage, ChatAction } from '@svadmin/core';
  import { useTranslation } from '@svadmin/core/i18n';

  import { useParsed } from '@svadmin/core';
  import { fly, fade, scale } from 'svelte/transition';
  import { Button } from './ui/button/index.js';
  import TooltipButton from './TooltipButton.svelte';
  import { MessageCircle, X, Minus, Send, Loader2, Bot, Trash2 } from '@lucide/svelte';

  const i18n = useTranslation();

  interface Props {
    /** Render the launcher inside a layout toolbar instead of as a floating action button. */
    docked?: boolean;
    /** localStorage key for chat history persistence. Set to '' to disable. */
    persistKey?: string;
    /** Custom persistence callback — called when messages change */
    onPersist?: (messages: ChatMessage[]) => void;
    /** Custom restore callback — called on mount to load history */
    onRestore?: () => ChatMessage[];
    /** Callback when user clicks an action button in an assistant message */
    onAction?: (action: ChatAction, message: ChatMessage) => void;
  }

  const {
    docked = false,
    persistKey = 'svadmin-chat',
    onPersist,
    onRestore,
    onAction,
  }: Props = $props();

  let open = $state(false);
  let minimized = $state(false);
  let inputValue = $state('');
  let messages = $state<ChatMessage[]>([]);
  let isStreaming = $state(false);
  let messagesContainer: HTMLDivElement | undefined = $state();
  let abortController: AbortController | null = null;
  let messageIdCounter = $state(0);
  let initialized = $state(false);

  const provider = $derived(getChatProvider());
  const agent = $derived(getAgentProvider());
  const parsed = useParsed();

  /** Track pending approval requests for UI rendering */
  let pendingApprovalIds = $state<string[]>([]);

  // ─── Auto-update ChatContext from current route ─────────────
  $effect(() => {
    setChatContext({
      currentResource: parsed.resource,
      selectedRecordId: parsed.id,
      currentView: parsed.action as 'list' | 'edit' | 'create' | 'show' | undefined,
      pathname: `/${parsed.resource ?? ''}${parsed.action ? '/' + parsed.action : ''}${parsed.id ? '/' + parsed.id : ''}`,
    });
  });

  // ─── Listen for cross-component triggers ─────────────────────
  $effect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: CustomEvent<string>) => {
      open = true;
      minimized = false;
      inputValue = e.detail;
      sendMessage();
    };
    window.addEventListener('svadmin:ask-ai', handler as EventListener);
    return () => window.removeEventListener('svadmin:ask-ai', handler as EventListener);
  });

  // ─── Restore persisted history on mount ─────────────────────
  $effect(() => {
    if (initialized) return;
    initialized = true;
    if (onRestore) {
      messages = onRestore();
    } else if (persistKey) {
      try {
        const stored = localStorage.getItem(persistKey);
        if (stored) {
          const parsed = JSON.parse(stored) as ChatMessage[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            messages = parsed;
          }
        }
      } catch {
        // ignore corrupt data
      }
    }
  });

  // ─── Persist on change (debounced) ──────────────────────────
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPersistSnapshot: ChatMessage[] | null = null;

  function flushPersist(snapshot: ChatMessage[]) {
    if (onPersist) {
      onPersist(snapshot);
    } else if (persistKey) {
      try {
        localStorage.setItem(persistKey, JSON.stringify(snapshot));
      } catch {
        // storage full or unavailable
      }
    }
  }

  $effect(() => {
    const snapshot = messages;
    if (!initialized) return;

    if (persistTimer) clearTimeout(persistTimer);
    lastPersistSnapshot = snapshot;
    persistTimer = setTimeout(() => {
      persistTimer = null;
      flushPersist(snapshot);
    }, 300);

    return () => {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
    };
  });

  $effect(() => {
    return () => {
      if (lastPersistSnapshot != null) {
        flushPersist(lastPersistSnapshot);
      }
    };
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
    const ctx = getChatContext();
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

    messages = [...messages, userMsg];
    inputValue = '';
    doSend();
  }

  async function doSend() {
    if (isStreaming || (!provider && !agent)) return;
    
    scrollToBottom();

    // Create placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: genId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    messages = [...messages, assistantMsg];
    isStreaming = true;
    scrollToBottom();

    abortController = new AbortController();

    try {
      // Build message list with context system message prepended
      const contextMsg = buildContextSystemMessage();
      const allMessages = messages.filter((m) => m.content);
      const messagesToSend = contextMsg ? [contextMsg, ...allMessages] : allMessages;

      if (agent) {
        // ─── AgentProvider path: typed event stream ─────────
        const stream = agent.chat(messagesToSend, {
          signal: abortController.signal,
          context: getChatContext(),
        });

        const collectedActions: ChatAction[] = [];

        for await (const event of stream) {
          if (!isStreaming) break;
          switch (event.type) {
            case 'text':
              assistantMsg.content += event.content;
              messages = [...messages.slice(0, -1), { ...assistantMsg }];
              scrollToBottom();
              break;

            case 'tool_call':
              assistantMsg.content += `\n🔧 *${event.tool}*(${JSON.stringify(event.args)})`;
              messages = [...messages.slice(0, -1), { ...assistantMsg }];
              scrollToBottom();
              break;

            case 'tool_result':
              if (event.result.success) {
                assistantMsg.content += `\n✅ ${event.tool} completed`;
              } else {
                assistantMsg.content += `\n❌ ${event.tool} failed: ${event.result.error ?? 'Unknown error'}`;
              }
              messages = [...messages.slice(0, -1), { ...assistantMsg }];
              scrollToBottom();
              break;

            case 'approval_request': {
              const reqId = event.id;
              pendingApprovalIds = [...pendingApprovalIds, reqId];
              
              registerApproval(reqId, (approved) => {
                messages = [...messages, {
                  id: genId(),
                  role: 'user',
                  content: approved ? `User approved execution of tool '${event.tool}'` : `User rejected execution of tool '${event.tool}'`,
                  timestamp: Date.now()
                }];
                if (agent?.approveToolCall) {
                  agent.approveToolCall(reqId, approved);
                }
              });

              collectedActions.push(
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
              );

              assistantMsg.content += `\n⚠️ **${i18n.t('chat.approvalRequired') || 'Approval required'}**: ${event.description}`;
              assistantMsg.actions = [...collectedActions];
              messages = [...messages.slice(0, -1), { ...assistantMsg }];
              scrollToBottom();
              break;
            }

            case 'component':
              assistantMsg.content += `\n📊 [${event.name}]`;
              messages = [...messages.slice(0, -1), { ...assistantMsg }];
              scrollToBottom();
              break;

            case 'done':
              break;
          }
        }
      } else if (provider) {
        // ─── ChatProvider path: raw text stream ─────────────
        const result = provider.sendMessage(
          messagesToSend,
          { signal: abortController.signal },
        );

        if (result && typeof result === 'object' && Symbol.asyncIterator in result) {
          for await (const chunk of result as AsyncGenerator<string>) {
            if (!isStreaming) break;
            assistantMsg.content += chunk;
            messages = [...messages.slice(0, -1), { ...assistantMsg }];
            scrollToBottom();
          }
        } else {
          const text = await (result as Promise<string>);
          assistantMsg.content = text;
          messages = [...messages.slice(0, -1), { ...assistantMsg }];
          scrollToBottom();
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      assistantMsg.content = i18n.t('chat.error') || 'Sorry, something went wrong. Please try again.';
      messages = [...messages.slice(0, -1), { ...assistantMsg }];
    } finally {
      isStreaming = false;
      abortController = null;
      scrollToBottom();
    }
  }

  function stopStreaming() {
    if (abortController) {
      abortController.abort();
      isStreaming = false;
      abortController = null;
    }
  }

  function clearChat() {
    messages = [];
    isStreaming = false;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    // Also clear persisted data
    if (persistKey) {
      try { localStorage.removeItem(persistKey); } catch { /* noop */ }
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
      resolveApproval(id, approved);
      pendingApprovalIds = pendingApprovalIds.filter(pid => pid !== id);
      // Remove action buttons after resolution
      msg.actions = undefined;
      messages = [...messages];
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
{/if}

