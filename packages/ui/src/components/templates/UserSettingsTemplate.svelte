<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';
  import SegmentedControl from '../SegmentedControl.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    basic: Snippet;
    security: Snippet;
    verification: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, basic, security, verification, footer, pageId = 'user-settings', width = 'default' }: Props = $props();
  let active = $state<'basic' | 'security' | 'verification'>('basic');
  const tabs = [
    { value: 'basic' as const, label: 'Basic info' },
    { value: 'security' as const, label: 'Security' },
    { value: 'verification' as const, label: 'Verification' },
  ];
</script>

{#snippet tabbar()}
  <SegmentedControl options={tabs} bind:value={active} ariaLabel="User settings sections" />
{/snippet}

{#snippet content()}
  <div class="svadmin-user-settings-template__content">
    {#if active === 'basic'}
      {@render basic()}
    {:else if active === 'security'}
      {@render security()}
    {:else}
      {@render verification()}
    {/if}
  </div>
{/snippet}

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  toolbar={tabbar}
  primary={content}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="User settings content"
/>

<style>
  .svadmin-user-settings-template__content { display: grid; gap: var(--svadmin-space-5); min-width: 0; }
</style>
