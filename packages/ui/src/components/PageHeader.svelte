<script lang="ts">
  import type { Snippet } from 'svelte';
  import { ArrowLeft } from '@lucide/svelte';
  import Breadcrumbs from './Breadcrumbs.svelte';
  import { Button } from './ui/button/index.js';
  import { cn } from '../utils.js';

  interface Props {
    title: string | Snippet;
    description?: string | Snippet;
    subTitle?: string | Snippet;
    actions?: Snippet;
    extra?: Snippet;
    tags?: Snippet;
    back?: Snippet;
    backIcon?: Snippet | boolean;
    breadcrumb?: Snippet;
    footer?: Snippet;
    onBack?: () => void;
    backLabel?: string;
    showBreadcrumbs?: boolean;
    headerStyle?: string;
    class?: string;
  }

  let {
    title,
    description,
    subTitle,
    actions,
    extra,
    tags,
    back,
    backIcon,
    breadcrumb,
    footer,
    onBack,
    backLabel = 'Back',
    showBreadcrumbs = true,
    headerStyle,
    class: className = '',
  }: Props = $props();

  const effectiveDescription = $derived(subTitle ?? description);
</script>

<div class={cn('svadmin-page-header', className)} style={headerStyle}>
  {#if breadcrumb}
    <div class="svadmin-page-header__breadcrumbs">
      {@render breadcrumb()}
    </div>
  {:else if showBreadcrumbs}
    <Breadcrumbs class="svadmin-page-header__breadcrumbs" />
  {/if}
  <div class="svadmin-page-header__row">
    <div class="svadmin-page-header__heading">
      {#if back}
        {@render back()}
      {:else if typeof backIcon === 'function'}
        <Button
          variant="ghost"
          size="icon-xs"
          class="svadmin-page-header__back"
          onclick={onBack}
          aria-label={backLabel}
          title={backLabel}
        >
          {@render backIcon()}
        </Button>
      {:else if onBack || backIcon === true}
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
            {#if typeof title === 'function'}
              {@render title()}
            {:else}
              {title}
            {/if}
          </h1>
          {#if tags}
            <div class="svadmin-page-header__tags">
              {@render tags()}
            </div>
          {/if}
        </div>
        {#if typeof effectiveDescription === 'function'}
          <div class="svadmin-page-header__description">
            {@render effectiveDescription()}
          </div>
        {:else if effectiveDescription}
          <p class="svadmin-page-header__description">{effectiveDescription}</p>
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
  {#if footer}
    <div class="svadmin-page-header__footer">
      {@render footer()}
    </div>
  {/if}
</div>
