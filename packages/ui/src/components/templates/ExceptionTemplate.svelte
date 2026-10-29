<script lang="ts">
  import type { Snippet } from 'svelte';
  import ResultTemplate from './ResultTemplate.svelte';

  interface Props {
    status: 403 | 404 | 500;
    title?: string;
    subtitle?: string;
    actions?: Snippet;
    pageId?: string;
  }

  let { status, title, subtitle, actions, pageId = 'exception' }: Props = $props();
  const defaults: Record<403 | 404 | 500, { title: string; subtitle: string }> = {
    403: { title: 'Access denied', subtitle: 'You do not have permission to view this page.' },
    404: { title: 'Page not found', subtitle: 'The page may have moved or no longer exists.' },
    500: { title: 'Service unavailable', subtitle: 'Try again or contact your administrator.' },
  };
  const copy = $derived(defaults[status]);
</script>

<ResultTemplate
  status={String(status) as '403' | '404' | '500'}
  title={title ?? copy.title}
  subtitle={subtitle ?? copy.subtitle}
  {...(actions ? { actions } : {})}
  {pageId}
/>