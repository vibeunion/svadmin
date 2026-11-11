<script lang="ts">
  import { Check, Minus, Sparkles } from '@lucide/svelte';
  import { cn } from '../utils.js';

  export interface FeatureRow {
    name: string;
    description?: string | undefined;
    values: Record<string, boolean | string | number>;
  }

  export interface FeatureGroup {
    groupName: string;
    features: FeatureRow[];
  }

  export interface PricingTier {
    key: string;
    name: string;
    price: string;
    period?: string | undefined;
    description?: string | undefined;
    isPopular?: boolean | undefined;
    isCurrent?: boolean | undefined;
    buttonText?: string | undefined;
  }

  export interface TierFeatureComparisonProps {
    tiers: PricingTier[];
    groups: FeatureGroup[];
    onselecttier?: ((tierKey: string) => void) | undefined;
    class?: string | undefined;
  }

  let {
    tiers = [],
    groups = [],
    onselecttier,
    class: className = '',
  }: TierFeatureComparisonProps = $props();
</script>

<div
  class={cn('rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs overflow-x-auto', className)}
  data-svadmin-component="TierFeatureComparison"
>
  <table class="w-full border-collapse text-xs">
    <!-- Header: Tiers -->
    <thead>
      <tr class="border-b border-border">
        <th class="p-3 text-left w-1/4 font-semibold text-foreground text-sm align-bottom">
          套餐权益全景对比
        </th>
        {#each tiers as tier (tier.key)}
          <th
            class={cn(
              'p-4 text-center align-bottom rounded-t-lg transition-colors',
              tier.isPopular ? 'bg-primary/5 border-x border-t border-primary/30' : 'bg-muted/10'
            )}
          >
            {#if tier.isPopular}
              <span class="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground mb-1.5 font-mono shadow-2xs">
                <Sparkles class="h-3 w-3" />
                强烈推荐
              </span>
            {/if}
            <h4 class="font-bold text-sm text-foreground">{tier.name}</h4>
            <div class="my-2">
              <span class="text-xl font-bold font-mono text-primary">{tier.price}</span>
              {#if tier.period}
                <span class="text-[11px] text-muted-foreground">/{tier.period}</span>
              {/if}
            </div>
            {#if tier.description}
              <p class="text-[11px] text-muted-foreground font-normal mb-3">{tier.description}</p>
            {/if}

            <button
              type="button"
              class={cn(
                'w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-2xs',
                tier.isCurrent
                  ? 'border border-border bg-muted text-muted-foreground cursor-default'
                  : tier.isPopular
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'border border-border bg-card hover:bg-muted text-foreground'
              )}
              onclick={() => !tier.isCurrent && onselecttier?.(tier.key)}
              disabled={tier.isCurrent}
            >
              {tier.isCurrent ? '当前生效套餐' : (tier.buttonText ?? '立即升级')}
            </button>
          </th>
        {/each}
      </tr>
    </thead>

    <!-- Body: Feature Groups -->
    <tbody>
      {#each groups as group (group.groupName)}
        <!-- Group Header Row -->
        <tr class="bg-muted/30 border-b border-border">
          <td colspan={tiers.length + 1} class="py-2 px-3 font-bold text-foreground text-xs uppercase tracking-wider">
            {group.groupName}
          </td>
        </tr>

        <!-- Feature Rows -->
        {#each group.features as feat (feat.name)}
          <tr class="border-b border-border/60 hover:bg-muted/20 transition-colors">
            <td class="p-3 text-left">
              <span class="font-medium text-foreground block">{feat.name}</span>
              {#if feat.description}
                <span class="text-[11px] text-muted-foreground block mt-0.5">{feat.description}</span>
              {/if}
            </td>

            {#each tiers as tier (tier.key)}
              {@const val = feat.values[tier.key]}
              <td
                class={cn(
                  'p-3 text-center align-middle',
                  tier.isPopular && 'bg-primary/5 border-x border-primary/20'
                )}
              >
                {#if typeof val === 'boolean'}
                  {#if val}
                    <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success mx-auto">
                      <Check class="h-3 w-3 stroke-[3]" />
                    </span>
                  {:else}
                    <span class="inline-flex h-5 w-5 items-center justify-center text-muted-foreground/40 mx-auto">
                      <Minus class="h-3 w-3" />
                    </span>
                  {/if}
                {:else if val !== undefined && val !== null}
                  <span class="font-mono font-semibold text-foreground text-xs">{val}</span>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      {/each}
    </tbody>
  </table>
</div>
