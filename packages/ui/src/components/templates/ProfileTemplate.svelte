<script lang="ts">
  import type { Snippet } from 'svelte';
  import TemplatePageShell from './TemplatePageShell.svelte';

  interface Props {
    title: string;
    description?: string;
    actions?: Snippet;
    profile: Snippet;
    activity?: Snippet;
    projects?: Snippet;
    pageId?: string;
    width?: 'narrow' | 'default' | 'wide';
  }

  let { title, description, actions, profile, activity, projects, pageId = 'profile', width = 'wide' }: Props = $props();
  const secondary = $derived(activity ?? projects);
</script>

<TemplatePageShell
  {title}
  {...(description ? { description } : {})}
  {...(actions ? { actions } : {})}
  primary={profile}
  {...(secondary ? { secondary } : {})}
  {pageId}
  {width}
  primaryLabel="Profile"
  secondaryLabel="Activity"
/>