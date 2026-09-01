<script lang="ts">
  /**
   * LiteChatDialog — SSR-compatible AI Chat Dialog fallback.
   * Relies on standard <form> POST without polling or WebSockets.
   * No client-side JS required.
   */
  import type { ChatMessage } from '@svadmin/core';

  interface Props {
    /** History of messages */
    messages: ChatMessage[];
    /** URL to handle the POST request for new messages */
    actionRoute: string;
    /** If true, shows a "Thinking..." indicator */
    isLoading?: boolean;
    title?: string;
    placeholder?: string;
    submitLabel?: string;
  }

  let {
    messages = [],
    actionRoute,
    isLoading = false,
    title = 'AI Assistant',
    placeholder = 'Type your message...',
    submitLabel = 'Send'
  }: Props = $props();

  function formatDate(ts: number) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function messageText(message: ChatMessage): string {
    return message.parts
      .filter((part): part is Extract<ChatMessage['parts'][number], { type: 'text' }> => part.type === 'text')
      .map((part) => part.text)
      .join('');
  }

  // Auto-scroll anchor logic: pure HTML way to scroll to bottom after page load
  // User should include "#latest-msg" in the form action if possible
</script>

<div class="lite-chat-dialog lite-card" style="display:flex;flex-direction:column;height:560px;padding:0;overflow:hidden;max-width:400px;margin:0 auto;">
  <!-- Header -->
  <div style="background:#0f172a;color:#fff;padding:14px 16px;font-weight:600;flex-shrink:0;display:flex;align-items:center;border-top-left-radius:8px;border-top-right-radius:8px;">
    {title}
  </div>

  <!-- Message History -->
  <div class="lite-chat-history" style="flex:1;overflow-y:auto;padding:16px;background:#f8fafc;">
    {#if messages.length === 0}
      <div style="text-align:center;color:#64748b;margin-top:60px;font-size:14px;">
        How can I help you today?
      </div>
    {/if}

    {#each messages as msg, i (i)}
      {#if msg.role === 'user' || msg.role === 'assistant'}
        <div 
          id={i === messages.length - 1 ? 'latest-msg' : ''}
          style="margin-bottom:16px;display:flex;flex-direction:column;align-items:{msg.role === 'user' ? 'flex-end' : 'flex-start'};"
        >
          <div style="
            max-width:85%;
            padding:10px 14px;
            border-radius:12px;
            font-size:14px;
            line-height:1.5;
            {msg.role === 'user'
              ? 'background:#4f46e5;color:#fff;border-bottom-right-radius:2px;'
              : 'background:#e2e8f0;color:#0f172a;border-bottom-left-radius:2px;'}"
          >
            <div style="white-space:pre-wrap;word-break:break-word;">{messageText(msg)}</div>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
            {msg.role === 'user' ? 'You' : 'Assistant'} · {formatDate(msg.createdAt)}
          </div>
        </div>
      {/if}
    {/each}

    {#if isLoading}
      <div id="latest-msg" style="display:flex;flex-direction:column;align-items:flex-start;margin-bottom:16px;">
        <div style="background:#e2e8f0;color:#64748b;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:13px;font-style:italic;">
          Thinking...
        </div>
      </div>
    {/if}
  </div>

  <!-- Input Form -->
  <form method="POST" action={actionRoute} style="display:flex;padding:12px;background:#fff;border-top:1px solid #e2e8f0;align-items:stretch;margin:0;flex-shrink:0;">
    <textarea
      name="message"
      class="lite-input"
      placeholder={placeholder}
      required
      rows="1"
      style="min-height:40px;resize:none;margin-right:8px;"
    ></textarea>
    <button type="submit" class="lite-btn lite-btn-primary" disabled={isLoading} style="display:flex;align-items:center;padding:0 16px;">
      {submitLabel}
    </button>
  </form>
</div>
