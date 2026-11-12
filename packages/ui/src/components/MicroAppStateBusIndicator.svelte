<script lang="ts">
  import { untrack } from 'svelte';
  import {
    Radio,
    Send,
    Activity,
    CheckCircle2,
    Trash2,
    Share2,
  } from '@lucide/svelte';
  import { cn } from '../utils.js';
  import { Button } from './ui/button/index.js';
  import { useMicroAppState, type MicroAppStateMessage } from './useMicroAppState.svelte.js';

  export interface MicroAppStateBusIndicatorProps {
    channel?: string | undefined;
    appId?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    class?: string | undefined;
    onBroadcast?: ((msg: MicroAppStateMessage) => void) | undefined;
  }

  let {
    channel = 'svadmin_microapp_global_bus',
    appId = 'host_admin_root',
    title = '微前端全局响应式状态总线 (MicroApp State Bus)',
    description = '跨技术栈父子应用双向状态同步、租户上下文广播与事件流转中枢',
    class: className = '',
    onBroadcast,
  }: MicroAppStateBusIndicatorProps = $props();

  const bus = useMicroAppState({ channel: untrack(() => channel), appId: untrack(() => appId) });

  let broadcastType = $state('tenant:context:change');
  let broadcastPayload = $state('{"tenantId": "tenant-east-02", "name": "华东大区创新科技中心"}');

  function handleSend() {
    try {
      const parsed = JSON.parse(broadcastPayload);
      const msg = bus.broadcast(broadcastType, parsed);
      onBroadcast?.(msg);
    } catch {
      const msg = bus.broadcast(broadcastType, broadcastPayload);
      onBroadcast?.(msg);
    }
  }

  function formatTime(ts: number) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }
</script>

<div
  class={cn('w-full rounded-2xl border border-border bg-card text-foreground shadow-sm flex flex-col overflow-hidden', className)}
  data-svadmin-component="micro-app-state-bus"
>
  <!-- 头部控制栏 -->
  <div class="p-5 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2">
        <Radio class="w-5 h-5 text-primary" />
        <h3 class="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      </div>
      <p class="text-xs text-muted-foreground mt-1">{description}</p>
    </div>

    <!-- 运行状态指示 -->
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs">
        <Share2 class="w-3.5 h-3.5 text-primary" />
        <span class="text-muted-foreground">频道:</span>
        <span class="font-mono font-medium text-foreground">{channel}</span>
      </div>

      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/20 bg-success/10 text-xs">
        <CheckCircle2 class="w-3.5 h-3.5 text-success" />
        <span class="text-success font-medium">3 个子应用已连接</span>
      </div>
    </div>
  </div>

  <!-- 广播发送工具栏 -->
  <div class="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center gap-2.5">
    <div class="w-full sm:w-56 shrink-0">
      <input
        type="text"
        bind:value={broadcastType}
        placeholder="事件类型 (e.g. auth:token:refresh)"
        class="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>

    <div class="w-full sm:flex-1">
      <input
        type="text"
        bind:value={broadcastPayload}
        placeholder="JSON 载荷 (Payload)"
        class="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>

    <Button
      variant="default"
      size="sm"
      class="h-8 gap-1.5 text-xs bg-primary text-primary-foreground shrink-0 w-full sm:w-auto"
      onclick={handleSend}
    >
      <Send class="w-3.5 h-3.5" />
      <span>广播状态变更</span>
    </Button>
  </div>

  <!-- 最近接收到的跨应用状态消息流 -->
  <div class="p-4 space-y-2">
    <div class="flex items-center justify-between text-xs font-semibold text-foreground mb-1">
      <div class="flex items-center gap-1.5">
        <Activity class="w-4 h-4 text-primary" />
        <span>跨端状态消息流 (Message Stream)</span>
      </div>

      {#if bus.messages.length > 0}
        <button
          type="button"
          class="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
          onclick={() => bus.clearMessages()}
        >
          <Trash2 class="w-3 h-3" />
          <span>清空流</span>
        </button>
      {/if}
    </div>

    <div class="space-y-2 max-h-60 overflow-y-auto">
      {#if bus.messages.length === 0}
        <div class="p-4 rounded-xl border border-dashed border-border bg-muted/10 text-center text-xs text-muted-foreground">
          暂无跨端广播消息，点击上方按钮模拟向子应用广播全局状态
        </div>
      {:else}
        {#each bus.messages as msg (msg.timestamp)}
          <div class="p-2.5 rounded-xl border border-border bg-card flex flex-col gap-1 text-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-primary font-mono">{msg.type}</span>
                <span class="text-[10px] text-muted-foreground">来自: {msg.senderAppId}</span>
              </div>
              <span class="text-[10px] text-muted-foreground font-mono">
                {formatTime(msg.timestamp)}
              </span>
            </div>

            <pre class="p-2 rounded bg-muted/40 text-[11px] font-mono text-foreground overflow-x-auto">{JSON.stringify(msg.payload, null, 2)}</pre>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
