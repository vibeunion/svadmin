<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '../utils.js';

  export interface FooterLink {
    label: string;
    href?: string;
    external?: boolean;
    onclick?: () => void;
  }

  export interface FooterColumn {
    title: string;
    links: FooterLink[];
  }

  interface Props {
    /** Bottom-line copyright text. */
    copyright?: string;
    /** Flat links rendered in the bottom bar. */
    links?: FooterLink[];
    /** Link columns rendered above the bottom bar. */
    columns?: FooterColumn[];
    ariaLabel?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    copyright,
    links = [],
    columns = [],
    ariaLabel = 'Footer',
    class: className = '',
    children,
  }: Props = $props();
</script>

<footer class={cn('svadmin-app-footer', className)} data-slot="app-footer" aria-label={ariaLabel}>
  {#if columns.length}
    <div class="svadmin-app-footer__columns">
      {#each columns as column (column.title)}
        <nav class="svadmin-app-footer__column" aria-label={column.title}>
          <h2 class="svadmin-app-footer__heading">{column.title}</h2>
          <ul class="svadmin-app-footer__list">
            {#each column.links as link (link.label)}
              <li>
                {#if link.href}
                  <a
                    class="svadmin-app-footer__link"
                    href={link.href}
                    rel={link.external ? 'noreferrer noopener' : undefined}
                    target={link.external ? '_blank' : undefined}
                  >{link.label}</a>
                {:else}
                  <button class="svadmin-app-footer__link" type="button" onclick={() => link.onclick?.()}>{link.label}</button>
                {/if}
              </li>
            {/each}
          </ul>
        </nav>
      {/each}
    </div>
  {/if}

  {#if children}<div class="svadmin-app-footer__content">{@render children()}</div>{/if}

  {#if copyright || links.length}
    <div class="svadmin-app-footer__bar">
      {#if copyright}<span class="svadmin-app-footer__copyright">{copyright}</span>{/if}
      {#if links.length}
        <ul class="svadmin-app-footer__list svadmin-app-footer__list--inline">
          {#each links as link (link.label)}
            <li>
              {#if link.href}
                <a
                  class="svadmin-app-footer__link"
                  href={link.href}
                  rel={link.external ? 'noreferrer noopener' : undefined}
                  target={link.external ? '_blank' : undefined}
                >{link.label}</a>
              {:else}
                <button class="svadmin-app-footer__link" type="button" onclick={() => link.onclick?.()}>{link.label}</button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</footer>

<style>
  .svadmin-app-footer {
    display: grid;
    gap: 1.5rem;
    border-block-start: 1px solid var(--border, currentColor);
    padding: 1.5rem;
    background: var(--card, var(--background, transparent));
    color: var(--muted-foreground, currentColor);
    font-size: 0.8125rem;
  }

  .svadmin-app-footer__columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 1.5rem;
  }

  .svadmin-app-footer__column { display: grid; gap: 0.625rem; }
  .svadmin-app-footer__heading { margin: 0; color: var(--foreground, currentColor); font-size: 0.8125rem; font-weight: 600; }
  .svadmin-app-footer__list { display: grid; gap: 0.375rem; margin: 0; padding: 0; list-style: none; }
  .svadmin-app-footer__list--inline { display: flex; flex-wrap: wrap; gap: 1rem; }

  .svadmin-app-footer__link {
    border: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-decoration: none;
    cursor: pointer;
  }
  .svadmin-app-footer__link:hover { color: var(--foreground, currentColor); text-decoration: underline; text-underline-offset: 0.2em; }
  .svadmin-app-footer__link:focus-visible { outline: 2px solid var(--ring, currentColor); outline-offset: 2px; }

  .svadmin-app-footer__bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-block-start: 1px solid var(--border, currentColor);
    padding-block-start: 1rem;
    color: var(--muted-foreground, currentColor);
  }
</style>