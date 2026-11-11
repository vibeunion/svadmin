<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';
  import { Check, X } from '@lucide/svelte';

  export interface PricingFeature {
    /** Feature title or description */
    label: string;
    /** Whether this feature is included in the tier. Defaults to true */
    included?: boolean;
    /** Optional secondary hint */
    hint?: string;
  }

  export interface PricingCardProps {
    /** Tier name, e.g., 'Starter', 'Professional', 'Enterprise' */
    title: string;
    /** Short summary or audience description */
    description?: string | undefined;
    /** Display price, e.g. '$29' or 29 */
    price: string | number;
    /** Billing interval suffix, e.g. '/month', '/yr' or 'per seat' */
    interval?: string | undefined;
    /** Optional tag/badge text, e.g. 'Recommended', 'Most Popular' */
    badge?: string | undefined;
    /** Whether this card is highlighted as the primary tier */
    highlighted?: boolean | undefined;
    /** List of features for this tier */
    features?: (PricingFeature | string)[] | undefined;
    /** Primary CTA button label */
    buttonText?: string | undefined;
    /** Primary CTA button disabled state */
    disabled?: boolean | undefined;
    /** CTA variant style */
    buttonVariant?: 'default' | 'outline' | 'secondary' | undefined;
    /** Custom CTA snippet slot */
    action?: Snippet | undefined;
    /** Custom header or badge slot */
    headerExtra?: Snippet | undefined;
    /** Click callback when CTA is activated */
    onselect?: (() => void) | undefined;
    /** Additional CSS classes */
    class?: string | undefined;
  }

  let {
    title,
    description,
    price,
    interval = '/mo',
    badge,
    highlighted = false,
    features = [],
    buttonText = 'Get Started',
    disabled = false,
    buttonVariant = 'default',
    action,
    headerExtra,
    onselect,
    class: className = '',
  }: PricingCardProps = $props();

  const normalizedFeatures = $derived(
    features.map((f) => (typeof f === 'string' ? { label: f, included: true } : f)),
  );
</script>

<div
  class={cn(
    'relative flex flex-col rounded-md border p-6 transition-all duration-200',
    'bg-card text-card-foreground',
    highlighted
      ? 'border-primary shadow-lg ring-1 ring-primary'
      : 'border-border shadow-sm hover:border-primary/50',
    className,
  )}
  data-svadmin-component="PricingCard"
  data-highlighted={highlighted ? 'true' : 'false'}
>
  {#if badge}
    <div class="absolute -top-3 right-6">
      <span
        class="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm"
      >
        {badge}
      </span>
    </div>
  {/if}

  <div class="flex items-start justify-between gap-2">
    <div>
      <h3 class="text-xl font-bold tracking-tight">{title}</h3>
      {#if description}
        <p class="mt-1 text-sm text-muted-foreground">{description}</p>
      {/if}
    </div>
    {#if headerExtra}
      {@render headerExtra()}
    {/if}
  </div>

  <div class="mt-6 flex items-baseline gap-1">
    <span class="text-4xl font-extrabold tracking-tight">{price}</span>
    {#if interval}
      <span class="text-sm font-medium text-muted-foreground">{interval}</span>
    {/if}
  </div>

  {#if normalizedFeatures.length > 0}
    <ul class="my-6 flex-1 space-y-3 border-t border-border/60 pt-6 text-sm">
      {#each normalizedFeatures as feature, idx (feature.label + idx)}
        <li class="flex items-center gap-2">
          {#if feature.included ?? true}
            <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check class="h-3 w-3 stroke-[2.5]" />
            </span>
            <span class="text-foreground">{feature.label}</span>
          {:else}
            <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <X class="h-3 w-3 stroke-[2.5]" />
            </span>
            <span class="text-muted-foreground line-through">{feature.label}</span>
          {/if}
          {#if feature.hint}
            <span class="text-xs text-muted-foreground">({feature.hint})</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <div class="mt-auto pt-4">
    {#if action}
      {@render action()}
    {:else}
      <button
        type="button"
        {disabled}
        onclick={() => onselect?.()}
        class={cn(
          'w-full rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
          buttonVariant === 'default' &&
            (highlighted
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-primary/90 text-primary-foreground hover:bg-primary'),
          buttonVariant === 'outline' &&
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
          buttonVariant === 'secondary' &&
            'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        )}
      >
        {buttonText}
      </button>
    {/if}
  </div>
</div>
