<script lang="ts">
  import { untrack } from 'svelte';
  import type { ModerationTicket } from './moderation-utils.js';

  export interface ContentModerationCenterProps {
    tickets?: ModerationTicket[];
    class?: string;
    onApprove?: (ticket: ModerationTicket) => void;
    onReject?: (ticket: ModerationTicket) => void;
    onMaskPublish?: (ticket: ModerationTicket) => void;
  }

  const {
    tickets: initialTickets = [],
    class: className = '',
    onApprove,
    onReject,
    onMaskPublish,
  }: ContentModerationCenterProps = $props();

  let ticketList = $state<ModerationTicket[]>(untrack(() => initialTickets.length > 0
      ? initialTickets.map(t => ({ ...t, matches: [...t.matches] }))
      : [
          {
            id: 'mod-101',
            title: '社区热门发帖审核: 快速理财收益说明',
            sourceModule: '用户社区 / 动态发布',
            author: 'user_alex88',
            submittedAt: '2026-11-15 06:15',
            rawContent: '今天发现一个绝密渠道，保证保本高收益，大家一起冲！',
            status: 'pending',
            riskScore: 92,
            matches: [
              { word: '保本高收益', category: 'spam', action: 'block', severity: 'critical', index: 12, length: 5 },
            ],
          },
          {
            id: 'mod-102',
            title: '商品营销文案审核: 换季大促礼包',
            sourceModule: '商品中心 / 详情编辑',
            author: 'merchant_vendor',
            submittedAt: '2026-11-15 05:40',
            rawContent: '下单立即返利，享高额返现，名额有限先到先得。',
            status: 'pending',
            riskScore: 68,
            matches: [
              { word: '高额返现', category: 'spam', action: 'mask', severity: 'medium', index: 8, length: 4, replacement: '***' },
            ],
          },
          {
            id: 'mod-103',
            title: '客服沟通工单记录抽查',
            sourceModule: '服务台 / 工单回执',
            author: 'agent_sarah',
            submittedAt: '2026-11-14 22:10',
            rawContent: '客户咨询退款政策，已提供正规退换货指引。',
            status: 'approved',
            riskScore: 0,
            matches: [],
          },
        ]));

  let filterStatus = $state<'ALL' | 'pending' | 'approved' | 'rejected'>('pending');

  const filteredTickets = $derived.by(() => {
    return ticketList.filter(t => filterStatus === 'ALL' || t.status === filterStatus);
  });

  function handleApprove(ticket: ModerationTicket) {
    ticket.status = 'approved';
    onApprove?.(ticket);
  }

  function handleReject(ticket: ModerationTicket) {
    ticket.status = 'rejected';
    onReject?.(ticket);
  }

  function handleMaskPublish(ticket: ModerationTicket) {
    ticket.status = 'masked';
    onMaskPublish?.(ticket);
  }
</script>

<div
  class="w-full flex flex-col gap-6 p-6 bg-background text-foreground rounded-xl border border-border shadow-sm {className}"
  data-svadmin-component="ContentModerationCenter"
  data-svadmin-resource="content_moderation_tickets"
>
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <h2 class="text-xl font-bold tracking-tight text-foreground">内容风控与合规审核工作台 (Moderation Workbench)</h2>
        <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
          Risk Review
        </span>
      </div>
      <p class="text-sm text-muted-foreground">
        处理触发敏感词规则的待审核内容，提供风险分值评估、违规词条定位与一键放行、驳回或强制脱敏操作。
      </p>
    </div>

    <div class="flex items-center gap-2">
      <!-- Status Tabs -->
      <div class="inline-flex rounded-lg border border-border p-1 bg-muted/40 text-xs">
        <button
          type="button"
          onclick={() => (filterStatus = 'pending')}
          class="px-3 py-1.5 rounded-md font-medium transition-colors {filterStatus === 'pending' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}"
        >
          待审核 ({ticketList.filter(t => t.status === 'pending').length})
        </button>
        <button
          type="button"
          onclick={() => (filterStatus = 'ALL')}
          class="px-3 py-1.5 rounded-md font-medium transition-colors {filterStatus === 'ALL' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}"
        >
          全部工单
        </button>
      </div>
    </div>
  </div>

  <!-- Ticket Cards List -->
  <div class="flex flex-col gap-3">
    {#if filteredTickets.length === 0}
      <div class="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-border text-muted-foreground text-xs gap-2">
        <span>当前无待处理的风控审核工单</span>
      </div>
    {:else}
      {#each filteredTickets as ticket (ticket.id)}
        <div class="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/40 transition-colors text-xs">
          <div class="flex flex-col gap-2 max-w-2xl">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-bold text-sm text-foreground">{ticket.title}</span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">{ticket.sourceModule}</span>
              <span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold {ticket.riskScore >= 80 ? 'bg-destructive/15 text-destructive border border-destructive/20' : ticket.riskScore >= 50 ? 'bg-warning/15 text-warning dark:text-warning border border-warning/20' : 'bg-success/15 text-success dark:text-success border border-success/20'}">
                风险分: {ticket.riskScore}
              </span>
            </div>

            <!-- Content preview -->
            <div class="p-2.5 rounded-lg bg-muted/30 border border-border/60 text-foreground leading-relaxed">
              {ticket.rawContent}
            </div>

            <!-- Meta & Matches -->
            <div class="flex items-center gap-3 text-muted-foreground flex-wrap text-[11px]">
              <span>提交人: <strong class="text-foreground">{ticket.author}</strong></span>
              <span>提交时间: {ticket.submittedAt}</span>
              {#if ticket.matches.length > 0}
                <div class="flex items-center gap-1.5 ml-2">
                  <span class="text-destructive font-medium">命中敏感词:</span>
                  {#each ticket.matches as m, i (i)}
                    <span class="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-semibold font-mono">
                      {m.word}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 self-start md:self-auto shrink-0">
            {#if ticket.status === 'pending'}
              <button
                type="button"
                onclick={() => handleApprove(ticket)}
                class="px-3 py-1.5 rounded-lg bg-success text-background hover:bg-success font-semibold transition-colors"
              >
                放行通过
              </button>
              <button
                type="button"
                onclick={() => handleMaskPublish(ticket)}
                class="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted font-medium transition-colors"
              >
                脱敏后发布
              </button>
              <button
                type="button"
                onclick={() => handleReject(ticket)}
                class="px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 font-medium transition-colors"
              >
                违规驳回
              </button>
            {:else}
              <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold border {ticket.status === 'approved' ? 'bg-success/15 text-success dark:text-success border-success/20' : ticket.status === 'masked' ? 'bg-primary/15 text-primary border-primary/20' : 'bg-destructive/15 text-destructive border-destructive/20'} capitalize">
                {ticket.status}
              </span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
