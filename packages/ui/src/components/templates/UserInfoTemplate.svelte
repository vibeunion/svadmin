<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    header?: Snippet;
    projects?: Snippet;
    news?: Snippet;
    team?: Snippet;
    footer?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, header, projects, news, team, footer, pageId = 'user-info', width = 'wide' }: Props = $props();
  const hasAside = $derived(Boolean(news || team));
</script>

{#snippet content()}
  <div class="svadmin-user-info-template">
    {#if header}
      <section class="svadmin-user-info-template__header" aria-label="Profile header">
        {@render header()}
      </section>
    {/if}
    <div class="svadmin-user-info-template__body" class:has-aside={hasAside}>
      {#if projects}
        <section class="svadmin-user-info-template__projects" aria-label="Projects">
          {@render projects()}
        </section>
      {/if}
      {#if hasAside}
        <aside class="svadmin-user-info-template__aside">
          {#if news}{@render news()}{/if}
          {#if team}{@render team()}{/if}
        </aside>
      {/if}
    </div>
  </div>
{/snippet}

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  primary={content}
  {...(footer ? { footer } : {})}
  {pageId}
  {width}
  primaryLabel="User information"
/>

<style>
  .svadmin-user-info-template { display: grid; gap: var(--svadmin-space-5); min-width: 0; }
  .svadmin-user-info-template__header { min-width: 0; }
  .svadmin-user-info-template__body { display: grid; gap: var(--svadmin-space-5); min-width: 0; }
  .svadmin-user-info-template__body.has-aside { grid-template-columns: minmax(0, 1fr) minmax(16rem, 22rem); align-items: start; }
  .svadmin-user-info-template__projects,
  .svadmin-user-info-template__aside { display: grid; gap: var(--svadmin-space-4); min-width: 0; }
  @media (max-width: 48rem) {
    .svadmin-user-info-template__body.has-aside { grid-template-columns: minmax(0, 1fr); }
  }
</style>
