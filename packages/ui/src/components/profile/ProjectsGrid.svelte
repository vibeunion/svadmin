<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import { Button } from '../ui/button/index.js';
  import { DataState, FilterToolbar, ProjectCard } from '../content/index.js';
  import type { ProjectSummary } from '../content/ProjectCard.svelte';

  interface Props {
    columns?: 2 | 3;
    projects?: ProjectSummary[];
  }

  const i18n = useTranslation();
  let { columns = 2, projects = [] }: Props = $props();
  let query = $state('');
  const filtered = $derived.by(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => [project.name, project.description, ...(project.tags ?? [])]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)));
  });
  const gridClass = $derived(columns === 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2');
</script>

<section class="space-y-4" data-svadmin-profile-projects>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="text-base font-semibold text-foreground">{i18n.t('publicProfile.projectsCount', { count: filtered.length })}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{i18n.t('publicProfile.searchProjects')}</p>
    </div>
    <Button size="sm">{i18n.t('common.create')}</Button>
  </div>
  <FilterToolbar bind:query placeholder={i18n.t('publicProfile.searchProjects')} />
  {#if projects.length === 0}
    <DataState state="empty" title={i18n.t('publicProfile.noProjects')} />
  {:else if filtered.length === 0}
    <DataState state="empty" title={i18n.t('publicProfile.noProjects')} description={i18n.t('publicProfile.searchProjects')} />
  {:else}
    <div class={'grid gap-4 ' + gridClass}>
      {#each filtered as project (project.id)}
        <ProjectCard {project} />
      {/each}
    </div>
  {/if}
</section>
