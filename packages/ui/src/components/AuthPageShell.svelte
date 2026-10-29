<script lang="ts">
  import type { Snippet } from 'svelte';
  import SvadminLogo from './SvadminLogo.svelte';

  interface Props {
    brand: string;
    title: string;
    description?: string;
    children: Snippet;
    footer?: Snippet;
    brandMark?: Snippet;
  }

  let { brand, title, description, children, footer, brandMark }: Props = $props();
  const generatedId = $props.id();
  const titleId = `svadmin-auth-title-${generatedId}`;
  const descriptionId = `${titleId}-description`;
</script>

<div class="grid min-h-screen bg-muted/20 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)]" data-svadmin-auth-page>
  <aside class="hidden border-r border-border bg-card p-10 lg:flex lg:flex-col lg:justify-between xl:p-12" data-svadmin-auth-aside>
    <div class="flex items-center gap-3" data-svadmin-auth-brand>
      {#if brandMark}{@render brandMark()}{:else}<span data-svadmin-auth-default-mark><SvadminLogo size={40} /></span>{/if}
      <span class="text-lg font-semibold text-foreground">{brand}</span>
    </div>
    <div class="max-w-sm space-y-3"><h2 class="text-2xl font-semibold leading-tight text-foreground">{title}</h2>{#if description}<p class="text-sm leading-6 text-muted-foreground">{description}</p>{/if}</div>
    <p class="text-xs text-muted-foreground">{brand}</p>
  </aside>
  <main class="flex items-center justify-center p-5 sm:p-8 lg:p-12" data-svadmin-auth-main>
    <div class="w-full max-w-md space-y-5">
      <div class="flex items-center gap-3 lg:hidden" data-svadmin-auth-brand>
        {#if brandMark}{@render brandMark()}{:else}<span data-svadmin-auth-default-mark><SvadminLogo size={36} /></span>{/if}
        <span class="text-base font-semibold text-foreground">{brand}</span>
      </div>
      <section
        class="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7"
        data-svadmin-auth-card
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header class="mb-6 space-y-2">
          <h1 id={titleId} class="text-xl font-semibold leading-tight text-foreground">{title}</h1>
          {#if description}<p id={descriptionId} class="text-sm leading-6 text-muted-foreground">{description}</p>{/if}
        </header>
        {@render children()}
      </section>
      {#if footer}<div class="text-center" data-svadmin-auth-footer>{@render footer()}</div>{/if}
    </div>
  </main>
</div>
