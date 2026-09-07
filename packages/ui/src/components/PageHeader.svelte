<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ArrowLeft } from '@lucide/svelte';
  import Breadcrumbs from './Breadcrumbs.svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    extra?: Snippet;
    tags?: Snippet;
    back?: Snippet;
    onBack?: () => void;
    backLabel?: string;
    showBreadcrumbs?: boolean;
    density?: 'compact' | 'comfortable';
    class?: string;
  }

  let {
    title,
    description,
    actions,
    extra,
    tags,
    back,
    onBack,
    backLabel = 'Back',
    showBreadcrumbs = true,
    density = 'comfortable',
    class: className = '',
  }: Props = $props();

</script>

<div class={cn('svadmin-page-header', className)} data-density={density}>
  {#if showBreadcrumbs}
    <Breadcrumbs class="svadmin-page-header__breadcrumbs" />
  {/if}
  <div class="svadmin-page-header__row">
    <div class="svadmin-page-header__heading">
      {#if back}
        {@render back()}
      {:else if onBack}
        <Button
          variant="ghost"
          size="icon-xs"
          class="svadmin-page-header__back"
          onclick={onBack}
          aria-label={backLabel}
          title={backLabel}
        >
          <ArrowLeft class="svadmin-page-header__back-icon" />
        </Button>
      {/if}
      <div class="svadmin-page-header__text">
        <div class="svadmin-page-header__title-row">
          <h1 class="svadmin-page-header__title">
            {title}
          </h1>
          {#if tags}
            <div class="svadmin-page-header__tags">
              {@render tags()}
            </div>
          {/if}
        </div>
        {#if description}
          <p class="svadmin-page-header__description">{description}</p>
        {/if}
      </div>
    </div>
    {#if actions || extra}
      <div class="svadmin-page-header__actions">
        {#if extra}
          {@render extra()}
        {/if}
        {#if actions}
          {@render actions()}
        {/if}
      </div>
    {/if}
  </div>
</div>
