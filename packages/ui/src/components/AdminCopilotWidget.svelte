<script lang="ts">
  import { untrack } from 'svelte';
  import { Sparkles, X, Send, Bot, User, Check, ArrowRight, Loader2 } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface CopilotFilterSuggestion {
    field: string;
    operator: string;
    value: string | number;
    label: string;
  }

  export interface CopilotMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    suggestedFilter?: CopilotFilterSuggestion | undefined;
    timestamp?: string | undefined;
  }

  export interface AdminCopilotWidgetProps {
    /** 浮窗卡片主标题 */
    title?: string | undefined;
    /** 机器人助手名称，默认 "SVAdmin Copilot" */
    botName?: string | undefined;
    /** 输入框占位提示文本 */
    placeholder?: string | undefined;
    /** 快捷预设提示词气泡列表 */
    suggestedPrompts?: string[] | undefined;
    /** 是否默认展开浮窗 */
    defaultOpen?: boolean | undefined;
    /** 点击应用推荐筛选条件到当前页面的回调 */
    onapplyfilter?: ((filter: CopilotFilterSuggestion) => void) | undefined;
    /** 发送提问消息回调，支持返回回复文本或完整消息对象 */
    onsendmessage?: ((query: string) => Promise<string | CopilotMessage> | string | CopilotMessage) | undefined;
    class?: string | undefined;
  }

  let {
    title = '智能业务表格副驾驶',
    botName = 'SVAdmin Copilot',
    placeholder = '输入自然语言，例如：“筛选华东大区大额已支付订单”...',
    suggestedPrompts = [
      '筛选出本周华东大区大额订单',
      '有哪些高危待复核的异常单据？',
      '帮我汇总当月各团队销售达成率',
    ],
    defaultOpen = false,
    onapplyfilter,
    onsendmessage,
    class: className = '',
  }: AdminCopilotWidgetProps = $props();

  let isOpen = $state(untrack(() => defaultOpen));
  let inputQuery = $state('');
  let isThinking = $state(false);
  let appliedFilterIds = $state<string[]>([]);

  let messages = $state<CopilotMessage[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: '你好。可以询问报表洞察，或用自然语言过滤表格数据。',
      timestamp: '刚刚',
    },
  ]);

  function makeId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  async function handleSend() {
    const q = inputQuery.trim();
    if (!q || isThinking) return;

    const userMsg: CopilotMessage = {
      id: makeId(),
      role: 'user',
      content: q,
      timestamp: '刚刚',
    };
    messages = [...messages, userMsg];
    inputQuery = '';
    isThinking = true;

    try {
      if (onsendmessage) {
        const resp = await onsendmessage(q);
        if (typeof resp === 'string') {
          messages = [
            ...messages,
            { id: makeId(), role: 'assistant', content: resp, timestamp: '刚刚' },
          ];
        } else {
          messages = [...messages, resp];
        }
      } else {
        // Built-in intelligent simulation with auto filter extraction
        await new Promise((r) => setTimeout(r, 650));
        let replyContent = `已检索并分析关于“${q}”的数据记录。`;
        let filterSuggestion: CopilotFilterSuggestion | undefined;

        if (q.includes('华东') || q.includes('大额') || q.includes('筛选') || q.includes('订单')) {
          replyContent = `已根据这条指令分析业务规则：建议对当前表格应用复合过滤【所属大区 = 华东大区 且 订单金额 >= ¥50,000】。`;
          filterSuggestion = {
            field: 'region',
            operator: '=',
            value: '华东大区',
            label: '大区 = 华东大区 (大额)',
          };
        } else if (q.includes('高危') || q.includes('异常')) {
          replyContent = `已定位到高危审计日志：建议对表格应用【风险级别 = HIGH】过滤。`;
          filterSuggestion = {
            field: 'risk_level',
            operator: '=',
            value: 'HIGH',
            label: '风险等级 = HIGH',
          };
        }

        messages = [
          ...messages,
          {
            id: makeId(),
            role: 'assistant',
            content: replyContent,
            suggestedFilter: filterSuggestion,
            timestamp: '刚刚',
          },
        ];
      }
    } catch {
      messages = [
        ...messages,
        {
          id: makeId(),
          role: 'assistant',
          content: '连接智能副驾驶引擎出现波动，请稍后重试。',
          timestamp: '刚刚',
        },
      ];
    } finally {
      isThinking = false;
    }
  }

  function applyFilter(msgId: string, filter: CopilotFilterSuggestion) {
    appliedFilterIds = [...appliedFilterIds, msgId];
    onapplyfilter?.(filter);
  }

  function handlePromptClick(p: string) {
    inputQuery = p;
    handleSend();
  }
</script>

<div
  class={cn('fixed bottom-6 right-6 z-50 font-sans select-none', className)}
  data-svadmin-component="AdminCopilotWidget"
  data-open={isOpen ? 'true' : 'false'}
>
  {#if !isOpen}
    <!-- Floating Circular Action Trigger Button -->
    <button
      type="button"
      class="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer relative group"
      onclick={() => (isOpen = true)}
      aria-label="Open AI Copilot"
    >
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-30"></span>
      <Sparkles class="h-6 w-6 relative z-10 transition-transform group-hover:rotate-12" />
    </button>
  {:else}
    <!-- Open Window Card -->
    <div
      class="w-[380px] sm:w-[420px] h-[520px] max-h-[85vh] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <header class="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30 shrink-0">
        <div class="flex items-center gap-2">
          <div class="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles class="h-4 w-4" />
          </div>
          <div>
            <h3 class="font-bold text-xs text-foreground flex items-center gap-1.5">
              <span>{botName}</span>
              <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
            </h3>
            <p class="text-[10px] text-muted-foreground">{title}</p>
          </div>
        </div>

        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          onclick={() => (isOpen = false)}
          aria-label="Close Copilot"
        >
          <X class="h-4 w-4" />
        </button>
      </header>

      <!-- Messages Body -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {#each messages as msg (msg.id)}
          <div class={cn('flex gap-2.5 items-start', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div
              class={cn(
                'h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground border border-border'
              )}
            >
              {#if msg.role === 'user'}
                <User class="h-3.5 w-3.5" />
              {:else}
                <Bot class="h-3.5 w-3.5 text-primary" />
              {/if}
            </div>

            <div class={cn('space-y-1.5 max-w-[82%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                class={cn(
                  'p-3 rounded-2xl text-xs leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted/40 border border-border/80 text-foreground rounded-tl-none shadow-2xs'
                )}
              >
                <p class="whitespace-pre-wrap">{msg.content}</p>
              </div>

              <!-- Suggested Filter Card Action -->
              {#if msg.suggestedFilter}
                {@const isApplied = appliedFilterIds.includes(msg.id)}
                <div class="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1.5 text-[11px] font-mono">
                  <span class="text-muted-foreground font-sans block text-[10px]">💡 识别到表格筛选条件：</span>
                  <div class="font-bold text-primary truncate">
                    {msg.suggestedFilter.label}
                  </div>
                  <button
                    type="button"
                    class={cn(
                      'inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-sans font-semibold transition-all cursor-pointer shadow-2xs',
                      isApplied
                        ? 'bg-success/10 text-success border border-success/30 cursor-default'
                        : 'bg-primary text-primary-foreground hover:opacity-90'
                    )}
                    onclick={() => !isApplied && msg.suggestedFilter && applyFilter(msg.id, msg.suggestedFilter)}
                    disabled={isApplied}
                  >
                    {#if isApplied}
                      <Check class="h-3 w-3" />
                      <span>已应用到当前表格</span>
                    {:else}
                      <ArrowRight class="h-3 w-3" />
                      <span>一键应用此筛选</span>
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/each}

        {#if isThinking}
          <div class="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/20 w-fit">
            <Loader2 class="h-3.5 w-3.5 animate-spin text-primary" />
            <span class="font-mono text-[11px]">正在解析业务意图并检索数据…</span>
          </div>
        {/if}
      </div>

      <!-- Suggested Quick Prompts -->
      {#if messages.length <= 3 && suggestedPrompts.length > 0}
        <div class="px-4 py-2 border-t border-border/60 bg-muted/10 flex flex-wrap gap-1.5 shrink-0">
          {#each suggestedPrompts as prompt (prompt)}
            <button
              type="button"
              class="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer truncate max-w-[280px]"
              onclick={() => handlePromptClick(prompt)}
            >
              {prompt}
            </button>
          {/each}
        </div>
      {/if}

      <!-- Input Footer -->
      <footer class="p-3 border-t border-border bg-background shrink-0">
        <form
          class="flex items-center gap-1.5 rounded-xl border border-input bg-muted/20 px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/40 focus-within:bg-background transition-all"
          onsubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <input
            type="text"
            class="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            bind:value={inputQuery}
            {placeholder}
            disabled={isThinking}
          />
          <button
            type="submit"
            class="rounded-lg p-1.5 bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
            disabled={!inputQuery.trim() || isThinking}
            aria-label="Send query"
          >
            <Send class="h-3.5 w-3.5" />
          </button>
        </form>
      </footer>
    </div>
  {/if}
</div>
