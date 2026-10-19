<script lang="ts">
  import { productPagePlans } from './generated/pages';

  interface Props {
    route: string;
    params: Record<string, string | undefined>;
  }

  let { route }: Props = $props();
  const page = $derived(productPagePlans.find(candidate => candidate.route === route));
</script>

<svelte:head>
  <title>{page?.name ?? 'Product surface'}</title>
</svelte:head>

<div class="surface-page">
  {#if page}
    <header class="surface-hero">
      <div>
        <p class="eyebrow">{page.kind}</p>
        <h1>{page.name}</h1>
        <p class="purpose">{page.purpose}</p>
      </div>
      {#if page.primaryAction}
        <span class="action-badge">主操作：{page.primaryAction.label}</span>
      {/if}
    </header>

    <div class="state-strip">
      {#each page.states as state}
        <span class="state">{state}</span>
      {/each}
    </div>

    <div class="surface-grid">
      {#each page.sections as section}
        <section class="surface-card">
          <div class="card-heading">
            <h2>{section.title}</h2>
            <span>{section.kind}</span>
          </div>
          <p>{section.description}</p>
          {#if section.resourceIds.length}
            <div class="resource-list">
              {#each section.resourceIds as resourceId}
                <span>{resourceId}</span>
              {/each}
            </div>
          {:else}
            <p class="muted">此区块暂无数据资源，等待接入真实 provider。</p>
          {/if}
        </section>
      {/each}
    </div>

    <aside class="contract-note">
      <strong>动作仍是产品元数据</strong>
      <span>接入 defineCommand 或资源契约后，再启用真实提交、审批和写入。</span>
    </aside>
  {:else}
    <section class="surface-card">
      <h1>未找到页面计划</h1>
      <p>路径 {route} 尚未在产品计划中注册。</p>
    </section>
  {/if}
</div>

<style>
  .surface-page { max-width: 1180px; margin: 0 auto; padding: 32px; color: #172033; }
  .surface-hero { display: flex; justify-content: space-between; gap: 24px; align-items: flex-end; margin-bottom: 18px; }
  .eyebrow { margin: 0 0 8px; text-transform: uppercase; letter-spacing: .12em; color: #65708a; font-size: 12px; font-weight: 700; }
  h1, h2, p { margin-top: 0; }
  h1 { margin-bottom: 8px; font-size: clamp(28px, 4vw, 46px); letter-spacing: -.03em; }
  h2 { font-size: 18px; }
  .purpose { max-width: 700px; color: #65708a; font-size: 16px; line-height: 1.6; }
  .action-badge, .state, .resource-list span { border-radius: 999px; background: #e8eefc; color: #3558a8; padding: 7px 11px; font-size: 12px; font-weight: 650; }
  .state-strip { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
  .state { background: #eef0f3; color: #596273; }
  .surface-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
  .surface-card { min-height: 150px; padding: 22px; border: 1px solid #e4e7ed; border-radius: 18px; background: #fff; box-shadow: 0 10px 30px rgb(32 45 72 / 5%); }
  .card-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .card-heading span { color: #8a94a7; font-size: 12px; }
  .surface-card p { color: #65708a; line-height: 1.6; }
  .resource-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 18px; }
  .muted { color: #98a1b2 !important; font-size: 14px; }
  .contract-note { display: flex; flex-direction: column; gap: 5px; margin-top: 18px; padding: 16px 18px; border-left: 3px solid #6f8fe8; background: #f0f4ff; color: #33425f; line-height: 1.5; }
  @media (max-width: 640px) { .surface-page { padding: 20px 16px; } .surface-hero { align-items: flex-start; flex-direction: column; } }
</style>
