<script lang="ts">
  interface Tier {
    key: string;
    name: string;
    price: string;
    isCurrent?: boolean;
  }

  interface Feature {
    name: string;
    values: Record<string, boolean | string>;
  }

  interface Props {
    tiers?: Tier[];
    features?: Feature[];
    class?: string;
  }

  let {
    tiers = [
      { key: 'starter', name: 'Starter', price: '$29/mo', isCurrent: true },
      { key: 'pro', name: 'Pro', price: '$99/mo' },
    ],
    features = [
      { name: 'Multi-tenant', values: { starter: true, pro: true } },
      { name: 'Seats', values: { starter: '5', pro: '50' } },
      { name: 'Dedicated support', values: { starter: false, pro: true } },
    ],
    class: className = '',
  }: Props = $props();
</script>

<div
  class="lite-tier-comparison {className}"
  data-svadmin-component="LiteTierFeatureComparison"
  role="region"
  aria-label="Tier Feature Comparison"
>
  <table class="lite-tier-table">
    <thead>
      <tr>
        <th class="lite-tier-feat-th">功能特性</th>
        {#each tiers as t (t.key)}
          <th class="lite-tier-th">
            <span class="lite-tier-name">{t.name}</span>
            <span class="lite-tier-price">{t.price}</span>
            {#if t.isCurrent}
              <span class="lite-tier-current">当前套餐</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each features as feat (feat.name)}
        <tr>
          <td class="lite-tier-feat-td">{feat.name}</td>
          {#each tiers as t (t.key)}
            {@const val = feat.values[t.key]}
            <td class="lite-tier-val-td">
              {#if val === true}
                <span class="lite-check">✓</span>
              {:else if val === false}
                <span class="lite-dash">—</span>
              {:else}
                <span class="lite-val-text">{val}</span>
              {/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .lite-tier-comparison {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    overflow-x: auto;
    font-size: 12px;
  }
  .lite-tier-table { width: 100%; border-collapse: collapse; }
  .lite-tier-table th, .lite-tier-table td { padding: 8px 12px; border-bottom: 1px solid #e5e6eb; }
  .lite-tier-feat-th { text-align: left; color: #4e5969; font-weight: 600; width: 40%; }
  .lite-tier-th { text-align: center; background: #f7f8fa; width: 30%; }
  .lite-tier-name { display: block; font-weight: 700; color: #1d2129; }
  .lite-tier-price { display: block; font-family: monospace; color: #165dff; font-weight: 600; margin-top: 2px; }
  .lite-tier-current { display: inline-block; font-size: 10px; background: #e5e6eb; color: #4e5969; padding: 1px 6px; border-radius: 3px; margin-top: 4px; }
  .lite-tier-feat-td { color: #1d2129; font-weight: 500; }
  .lite-tier-val-td { text-align: center; }
  .lite-check { color: #00b42a; font-weight: 700; }
  .lite-dash { color: #86909c; }
  .lite-val-text { font-family: monospace; font-weight: 600; color: #1d2129; }
</style>
