<script lang="ts">
  import { captureAdminContext, getResources, type MenuItem } from '@svadmin/core';
  import { getPath } from '../router-state.svelte.js';
  import { useTranslation } from '@svadmin/core/i18n';
  import { cn } from '../utils.js';

  import * as Breadcrumb from './ui/breadcrumb/index.js';

  const i18n = useTranslation();

  const adminContext = captureAdminContext();
  const resources = $derived((() => { try { return getResources(); } catch { return []; } })());

  let { menu, class: className = 'mb-4' }: { menu?: MenuItem[]; class?: string } = $props();

  interface Crumb { label: string; href?: string; }

  function normalizePath(path: string): string {
    const normalized = path.replace(/^#/, '').split(/[?#]/)[0].replace(/\/$/, '');
    return normalized || '/';
  }

  function findMenuTrail(items: MenuItem[], path: string, ancestors: MenuItem[] = []): MenuItem[] | undefined {
    for (const item of items) {
      const trail = [...ancestors, item];
      if (item.href && normalizePath(item.href) === path) return trail;
      if (item.children) {
        const match = findMenuTrail(item.children, path, trail);
        if (match) return match;
      }
    }
  }

  const crumbs = $derived.by(() => {
    const result: Crumb[] = [{ label: i18n.t('common.home') ?? 'Home', href: adminContext.formatLink('/') }];
    const currentPathname = normalizePath(getPath());
    if (currentPathname === '/') return result;

    const menuTrail = menu ? findMenuTrail(menu, currentPathname) : undefined;
    if (menuTrail) {
      for (const item of menuTrail) {
        result.push({
          label: item.label ?? item.name,
          href: item.href ? adminContext.formatLink(normalizePath(item.href)) : undefined,
        });
      }
      return result;
    }

    const path = currentPathname.replace(/^\//, '');

    const segments = path.split('/').filter(Boolean);
    const resourceNames = resources.map(r => r.name);
    
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
       const seg = segments[i];
       currentPath += `/${seg}`;

       if (resourceNames.includes(seg)) {
          const res = resources.find(r => r.name === seg);
          if (res) {
            result.push({ label: res.label, href: adminContext.formatLink(currentPath) });
          }
       } else if (seg === 'create') {
          result.push({ label: i18n.t('common.create') ?? 'Create', href: adminContext.formatLink(currentPath) });
       } else if (['edit', 'show', 'clone'].includes(seg) && segments[i+1]) {
          const actionLabel = seg === 'edit' ? (i18n.t('common.edit') ?? 'Edit') :
                              seg === 'show' ? (i18n.t('common.detail') ?? 'Details') :
                              (i18n.t('common.clone') ?? 'Clone');
          const id = segments[i+1];
          currentPath += `/${id}`; // advance path by id
          result.push({ label: `${actionLabel} #${id}`, href: adminContext.formatLink(currentPath) });
          i++; // skip next segment since we consumed the id
       } else if (i > 0 && resourceNames.includes(segments[i-1])) {
          // This is a parent ID (e.g. /teams/123/users) and we are not an action
          result.push({ label: `#${seg}`, href: adminContext.formatLink(currentPath) });
       }
    }

    return result;
  });
</script>

{#if crumbs.length > 1}
  <Breadcrumb.Root class={cn(className)}>
    <Breadcrumb.List>
      {#each crumbs as crumb, i (`${crumb.label}-${i}`)}
        {#if i > 0}
          <Breadcrumb.Separator />
        {/if}
        <Breadcrumb.Item>
          <span class="inline-flex svadmin-page-enter" style="animation-duration: 0.2s;">
          {#if i === crumbs.length - 1}
            <Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
          {:else if crumb.href}
            <Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
          {:else}
            <span class="text-muted-foreground">{crumb.label}</span>
          {/if}
          </span>
        </Breadcrumb.Item>
      {/each}
    </Breadcrumb.List>
  </Breadcrumb.Root>
{/if}
