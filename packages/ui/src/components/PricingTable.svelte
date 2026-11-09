<script lang="ts">
  import { cn } from '../utils.js';
  import PricingCard, { type PricingFeature } from './PricingCard.svelte';
  import { Check, X } from '@lucide/svelte';

  export interface PricingPlan {
    key: string;
    title: string;
    description?: string;
    monthlyPrice: string | number;
    yearlyPrice?: string | number;
    badge?: string;
    highlighted?: boolean;
    buttonText?: string;
    buttonVariant?: 'default' | 'outline' | 'secondary';
    features?: (PricingFeature | string)[];
  }

  export interface FeatureComparisonRow {
    name: string;
    hint?: string;
    /** Map plan key to value (boolean or string) */
    values: Record<string, boolean | string>;
  }

  export interface FeatureComparisonGroup {
    category: string;
    rows: FeatureComparisonRow[];
  }

  export interface PricingTableProps {
    /** Available subscription plans */
    plans: PricingPlan[];
    /** Current billing cycle (can be bound with bind:cycle) */
    cycle?: 'monthly' | 'yearly';
    /** Badge or highlight on the yearly toggle */
    yearlyDiscountBadge?: string;
    /** Optional detailed feature comparison matrix */
    comparisonGroups?: FeatureComparisonGroup[];
    /** Callback when a plan CTA is clicked */
    onselectplan?: (plan: PricingPlan, cycle: 'monthly' | 'yearly') => void;
    /** Additional CSS classes */
    class?: string;
  }

  let {
    plans = [],
    cycle = $bindable<'monthly' | 'yearly'>('monthly'),
    yearlyDiscountBadge = 'Save 20%',
    comparisonGroups = [],
    onselectplan,
    class: className = '',
  }: PricingTableProps = $props();
</script>

<div
  class={cn('w-full space-y-10', className)}
  data-svadmin-component="PricingTable"
  data-cycle={cycle}
>
  <!-- Cycle toggle -->
  <div class="flex items-center justify-center gap-3">
    <div class="inline-flex items-center rounded-lg border border-border bg-muted/60 p-1 text-sm font-medium">
      <button
        type="button"
        onclick={() => (cycle = 'monthly')}
        class={cn(
          'rounded-md px-4 py-1.5 transition-all',
          cycle === 'monthly'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Monthly
      </button>
      <button
        type="button"
        onclick={() => (cycle = 'yearly')}
        class={cn(
          'relative inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 transition-all',
          cycle === 'yearly'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span>Yearly</span>
        {#if yearlyDiscountBadge}
          <span class="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {yearlyDiscountBadge}
          </span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Pricing Cards Grid -->
  <div
    class={cn(
      'grid gap-6',
      plans.length === 1 && 'max-w-md mx-auto',
      plans.length === 2 && 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto',
      plans.length >= 3 && 'grid-cols-1 md:grid-cols-3',
      plans.length >= 4 && 'lg:grid-cols-4',
    )}
  >
    {#each plans as plan (plan.key)}
      <PricingCard
        title={plan.title}
        description={plan.description}
        price={cycle === 'yearly' ? (plan.yearlyPrice ?? plan.monthlyPrice) : plan.monthlyPrice}
        interval={cycle === 'yearly' ? '/yr' : '/mo'}
        badge={plan.badge}
        highlighted={plan.highlighted}
        buttonText={plan.buttonText ?? 'Choose Plan'}
        buttonVariant={plan.buttonVariant}
        features={plan.features}
        onselect={() => onselectplan?.(plan, cycle)}
      />
    {/each}
  </div>

  <!-- Detailed Feature Comparison Table (Optional) -->
  {#if comparisonGroups.length > 0}
    <div class="overflow-x-auto rounded-xl border border-border bg-card p-6 shadow-sm">
      <div class="mb-6">
        <h3 class="text-lg font-bold tracking-tight text-foreground">Feature Comparison</h3>
        <p class="text-sm text-muted-foreground">Compare features across all subscription plans</p>
      </div>

      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-border text-muted-foreground">
            <th class="py-3 pr-4 font-medium">Features</th>
            {#each plans as plan (plan.key)}
              <th class="px-4 py-3 text-center font-medium">
                <span class={plan.highlighted ? 'font-bold text-primary' : 'text-foreground'}>
                  {plan.title}
                </span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          {#each comparisonGroups as group, gIdx (group.category || gIdx)}
            <tr class="bg-muted/40 font-semibold text-foreground">
              <td colspan={plans.length + 1} class="py-2.5 pl-2 text-xs tracking-wide uppercase">
                {group.category}
              </td>
            </tr>
            {#each group.rows as row (row.name)}
              <tr class="hover:bg-muted/20">
                <td class="py-3 pr-4">
                  <div class="font-medium text-foreground">{row.name}</div>
                  {#if row.hint}
                    <div class="text-xs text-muted-foreground">{row.hint}</div>
                  {/if}
                </td>
                {#each plans as plan (plan.key)}
                  {@const val = row.values[plan.key]}
                  <td class="px-4 py-3 text-center">
                    {#if typeof val === 'boolean'}
                      {#if val}
                        <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check class="h-3.5 w-3.5 stroke-[2.5]" />
                        </span>
                      {:else}
                        <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <X class="h-3.5 w-3.5 stroke-[2.5]" />
                        </span>
                      {/if}
                    {:else if val}
                      <span class="font-medium text-foreground">{val}</span>
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
  {/if}
</div>
