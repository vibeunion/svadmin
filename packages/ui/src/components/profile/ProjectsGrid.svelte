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
  const gridClass = $derived(columns === 3 ? 'svadmin-u-e4d6f343b9ff svadmin-u-b86f7f946cd8' : 'svadmin-u-e4d6f343b9ff');
</script>

<section class="svadmin-u-3e7ce58d64fa" data-svadmin-profile-projects>
  <div class="svadmin-u-60fbb7713999 svadmin-u-8dddea0773ed svadmin-u-1004c0c3954c svadmin-u-020ba687fa12 svadmin-u-9f76a62f4f44 svadmin-u-3b9871a0bf93">
    <div>
      <h2 class="svadmin-u-4ee734926ff6 svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{i18n.t('publicProfile.projectsCount', { count: filtered.length })}</h2>
      <p class="svadmin-u-b6b02c0ebef6 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{i18n.t('publicProfile.searchProjects')}</p>
    </div>
    <Button size="sm">{i18n.t('common.create')}</Button>
  </div>
  <FilterToolbar bind:query placeholder={i18n.t('publicProfile.searchProjects')} />
  {#if projects.length === 0}
    <DataState state="empty" title={i18n.t('publicProfile.noProjects')} />
  {:else if filtered.length === 0}
    <DataState state="empty" title={i18n.t('publicProfile.noProjects')} description={i18n.t('publicProfile.searchProjects')} />
  {:else}
    <div class={'svadmin-u-f3c543ad5fe9 svadmin-u-0c3bc98565dd ' + gridClass}>
      {#each filtered as project (project.id)}
        <ProjectCard {project} />
      {/each}
    </div>
  {/if}
</section>
