<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import {
    Accessibility,
    ArrowRight,
    Check,
    Command,
    Eye,
    Gauge,
    Layers3,
    LockKeyhole,
    RefreshCw,
    ShieldCheck,
    Sparkles,
  } from '@lucide/svelte';
  import {
    Button,
    ContentPageHeader,
    ContentPageShell,
    DataState,
    FeedbackNotice,
    FilterToolbar,
    MetricBlock,
    PageToolbar,
    SectionHeader,
    StatusBadge,
  } from '@svadmin/ui';
  import { Badge } from '@svadmin/ui/components/ui/badge/index.js';

  interface Props {
    resourceName?: string;
  }

  let { resourceName = 'design_principles' }: Props = $props();
  const i18n = useTranslation();
  const isZh = $derived(i18n.locale === 'zh-CN');
  let query = $state('');
  type ViewState = 'loading' | 'empty' | 'error' | 'forbidden';
  let viewState = $state<ViewState>('empty');
  let compact = $state(false);
  let showWarning = $state(true);

  const principles = $derived([
    {
      id: 'clear',
      icon: Eye,
      title: isZh ? '默认清晰' : 'Clear by default',
      summary: isZh ? '一页一个主任务，一个主操作，一个事实归属。' : 'One page, one job, one dominant next action, one owner per fact.',
      rule: isZh ? '说明只补充约束、后果、范围或恢复路径。' : 'Supporting copy adds constraints, consequences, scope, or recovery.',
    },
    {
      id: 'efficient',
      icon: Gauge,
      title: isZh ? '缩短操作回路' : 'Efficient in the loop',
      summary: isZh ? '保留筛选、上下文和键盘路径，让重复工作更快。' : 'Preserve filters, context, and keyboard paths for repeated work.',
      rule: isZh ? '加载和反馈不能挤走主操作或制造无意义跳转。' : 'Loading and feedback never displace the primary action.',
    },
    {
      id: 'consistent',
      icon: Layers3,
      title: isZh ? '契约一致' : 'Consistent by contract',
      summary: isZh ? '组件、状态、页面骨架和反馈生命周期保持稳定。' : 'Components, states, page shells, and feedback lifecycles stay stable.',
      rule: isZh ? '布局 preset 只能改变密度和构图，不能改变语义。' : 'Layout presets change density, never interaction meaning.',
    },
    {
      id: 'trust',
      icon: ShieldCheck,
      title: isZh ? '状态可信' : 'Trustworthy in every state',
      summary: isZh ? '加载、空、部分、错误、权限和完成态都给出下一步。' : 'Loading, empty, partial, error, permission, and done states show the next step.',
      rule: isZh ? '数据新鲜度、权限边界和操作后果在需要时可见。' : 'Freshness, permissions, and consequences are visible when decisions need them.',
    },
    {
      id: 'restraint',
      icon: Command,
      title: isZh ? 'Stripe 式克制' : 'Stripe restraint',
      summary: isZh ? '中性表面、细边框和精确层级承载工作，而不是装饰。' : 'Neutral surfaces, hairlines, and precise hierarchy carry the work.',
      rule: isZh ? '单一强调色；不使用渐变、glow、玻璃感或卡片套卡片。' : 'One accent; no gradients, glow, glass, or card-in-card decoration.',
    },
    {
      id: 'accessible',
      icon: Accessibility,
      title: isZh ? '默认可访问' : 'Accessible by construction',
      summary: isZh ? '键盘、焦点、语义、对比度和响应式是组件默认能力。' : 'Keyboard, focus, semantics, contrast, and responsive behavior are defaults.',
      rule: isZh ? '状态不能只靠颜色表达，粗指针目标保持稳定。' : 'Status never relies on color alone and coarse-pointer targets stay stable.',
    },
    {
      id: 'ai',
      icon: Sparkles,
      title: isZh ? 'AI 可生成且可审计' : 'AI-ready and auditable',
      summary: isZh ? '生成页面先声明工作流、信息归属、状态归属和消失条件。' : 'Generated pages declare workflow, information owners, state owners, and removal conditions.',
      rule: isZh ? '只使用受信组件目录，并通过确定性和视觉门禁。' : 'Use the trusted catalog and pass deterministic and visual gates.',
    },
  ]);

  const stateLabels = $derived({
    loading: isZh ? '加载' : 'Loading',
    empty: isZh ? '空状态' : 'Empty',
    error: isZh ? '错误' : 'Error',
    forbidden: isZh ? '无权限' : 'Forbidden',
  });

  const stateCopy = $derived({
    loading: isZh ? ['正在同步工作区', '保持页面骨架稳定，数据回来后原位填充。'] : ['Syncing workspace', 'Keep the page skeleton stable and fill it in place when data returns.'],
    empty: isZh ? ['没有待处理项目', '筛选结果为空时保留上下文，并提供一个明确的恢复动作。'] : ['Nothing needs attention', 'When filters return no rows, preserve context and offer one recovery action.'],
    error: isZh ? ['工作区暂时不可用', '错误必须说明影响范围，并提供可恢复的下一步。'] : ['Workspace unavailable', 'Errors explain scope and expose a recoverable next step.'],
    forbidden: isZh ? ['需要更高权限', '权限边界要清楚，不要让用户猜测数据是否被隐藏。'] : ['Higher permission required', 'Permission boundaries are explicit so hidden data is not ambiguous.'],
  });

  const visiblePrinciples = $derived(
    principles.filter((principle) => `${principle.title} ${principle.summary} ${principle.rule}`.toLowerCase().includes(query.toLowerCase().trim())),
  );

  function resetState() {
    viewState = 'empty';
    showWarning = false;
  }
</script>

{#snippet headerActions()}
  <Button variant="outline" size="sm" onclick={() => viewState = 'loading'}>
    {isZh ? '预览加载态' : 'Preview loading'}
    <ArrowRight class="size-3.5" />
  </Button>
{/snippet}

{#snippet feedbackAction()}
  <Button variant="outline" size="sm" onclick={resetState}>{isZh ? '恢复演示' : 'Reset demo'}</Button>
{/snippet}

<div data-resource-name={resourceName}>
<ContentPageShell pageId="design-principles" width="wide" class={compact ? 'text-sm' : ''}>
  <ContentPageHeader
    eyebrow={isZh ? 'svadmin 设计系统' : 'svadmin design system'}
    title={isZh ? 'Stripe-first 设计原则' : 'Stripe-first design principles'}
    description={isZh ? '把视觉方向转成可复用组件、可审查状态和可验证示例。' : 'Turn a visual direction into reusable components, reviewable states, and verifiable examples.'}
    actions={headerActions}
  />

  {#if showWarning}
    <FeedbackNotice
      tone="warning"
      message={isZh ? '演示中的 warning 是唯一持久反馈面：它保留恢复路径，解决后应消失。' : 'This warning is the only persistent feedback surface: it owns the recovery path and disappears when resolved.'}
      action={feedbackAction}
    />
  {/if}

  <div class="flex flex-col gap-6">
    <div class="order-2 grid gap-3 sm:order-1 sm:grid-cols-2 xl:grid-cols-4">
      <MetricBlock label={isZh ? '设计原则' : 'Principles'} value={principles.length} detail={isZh ? '可审查契约' : 'reviewable contracts'} trend={isZh ? '稳定' : 'Stable'} />
      <MetricBlock label={isZh ? '状态覆盖' : 'State coverage'} value="4/4" detail={isZh ? '加载、空、错、权限' : 'loading, empty, error, forbidden'} trend={isZh ? '完整' : 'Complete'} />
      <MetricBlock label={isZh ? '反馈归属' : 'Feedback ownership'} value="1 → 1" detail={isZh ? '一个事件一个主反馈面' : 'one event, one primary surface'} />
      <MetricBlock label={isZh ? '目标尺寸' : 'Target size'} value="44px" detail={isZh ? '粗指针最小触达' : 'coarse-pointer minimum'} trend={isZh ? '可访问' : 'Accessible'} />
    </div>

    <div class="order-1 grid gap-6 sm:order-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
    <section class="space-y-4" aria-labelledby="principles-heading">
      <span id="principles-heading" class="sr-only">{isZh ? '七条原则' : 'Seven principles'}</span>
      <SectionHeader title={isZh ? '七条原则' : 'Seven principles'} description={isZh ? '每一条都能落到组件 API、页面状态或验收证据。' : 'Each principle maps to a component API, page state, or acceptance evidence.'} />
      <PageToolbar>
        {#snippet leading()}
          <FilterToolbar bind:query placeholder={isZh ? '搜索原则' : 'Search principles'} clearLabel={isZh ? '清除搜索' : 'Clear search'} />
        {/snippet}
        {#snippet trailing()}
          <Button variant={compact ? 'default' : 'outline'} size="sm" onclick={() => compact = !compact}>
            {compact ? (isZh ? '标准密度' : 'Standard density') : (isZh ? '紧凑密度' : 'Compact density')}
          </Button>
        {/snippet}
      </PageToolbar>

      <div class="grid gap-3 md:grid-cols-2">
        {#each visiblePrinciples as principle (principle.id)}
          <article class="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
            <div class="flex items-start gap-3">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-primary"><principle.icon class="size-4" /></span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><h3 class="text-sm font-semibold text-foreground">{principle.title}</h3><Badge variant="outline">{isZh ? '契约' : 'Contract'}</Badge></div>
                <p class="mt-2 text-sm leading-6 text-foreground">{principle.summary}</p>
                <p class="mt-2 text-xs leading-5 text-muted-foreground">{principle.rule}</p>
              </div>
            </div>
          </article>
        {:else}
          <div class="md:col-span-2"><DataState state="empty" title={isZh ? '没有匹配原则' : 'No matching principles'} description={isZh ? '清除搜索后查看完整原则列表。' : 'Clear the search to see the full principle list.'} /></div>
        {/each}
      </div>
    </section>

    <aside class="space-y-4" aria-labelledby="state-heading">
      <span id="state-heading" class="sr-only">{isZh ? '状态工作台' : 'State workbench'}</span>
      <SectionHeader title={isZh ? '状态工作台' : 'State workbench'} description={isZh ? '用同一组件验证加载、空、错误和权限边界。' : 'Verify loading, empty, error, and permission boundaries with one component.'} />
      <div class="flex flex-wrap gap-2" role="group" aria-label={isZh ? '选择数据状态' : 'Choose data state'}>
        {#each Object.keys(stateLabels) as key (key)}
          {@const stateKey = key as keyof typeof stateLabels}
          <Button size="sm" variant={viewState === stateKey ? 'default' : 'outline'} onclick={() => viewState = stateKey}>{stateLabels[stateKey]}</Button>
        {/each}
      </div>
      <DataState
        state={viewState}
        title={stateCopy[viewState][0]}
        description={stateCopy[viewState][1]}
        retry={viewState === 'error' ? resetState : undefined}
        retryLabel={isZh ? '重试' : 'Retry'}
        loadingLabel={isZh ? '加载中' : 'Loading'}
      >
        {#snippet action()}
          {#if viewState === 'empty'}
            <Button size="sm" onclick={resetState}><RefreshCw class="size-3.5" />{isZh ? '清除筛选' : 'Clear filters'}</Button>
          {:else if viewState === 'forbidden'}
            <Button variant="outline" size="sm" href="#/account/members/team-members"><LockKeyhole class="size-3.5" />{isZh ? '查看成员权限' : 'Review permissions'}</Button>
          {/if}
        {/snippet}
      </DataState>
      <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3"><div><p class="text-sm font-semibold text-foreground">{isZh ? '验收清单' : 'Acceptance checklist'}</p><p class="mt-1 text-xs text-muted-foreground">{isZh ? '示例页本身也是规范的可运行证明。' : 'The example is a runnable proof of the standard.'}</p></div><StatusBadge status="success" label={isZh ? '通过' : 'Pass'} /></div>
        <ul class="mt-4 space-y-3 text-sm text-muted-foreground">
          <li class="flex gap-2"><Check class="mt-0.5 size-4 shrink-0 text-success" />{isZh ? '一个主任务和一个主反馈面' : 'One primary job and one primary feedback surface'}</li>
          <li class="flex gap-2"><Check class="mt-0.5 size-4 shrink-0 text-success" />{isZh ? '桌面与移动端不重叠、不横向滚动' : 'No overlap or horizontal scroll on desktop and mobile'}</li>
          <li class="flex gap-2"><Check class="mt-0.5 size-4 shrink-0 text-success" />{isZh ? '状态不只依赖颜色，按钮有语义标签' : 'Status is not color-only and buttons have semantic labels'}</li>
        </ul>
      </div>
    </aside>
    </div>
  </div>
</ContentPageShell>
</div>
