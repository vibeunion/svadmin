<script lang="ts">
  import { useTranslation } from '@svadmin/core/i18n';
  import * as Card from '../ui/card/index.js';
  import { Badge } from '../ui/badge/index.js';
  import { Button } from '../ui/button/index.js';
  import { Input } from '../ui/input/index.js';
  import { Users, CheckCircle2, ArrowRight, Search, Plus } from '@lucide/svelte';

  const i18n = useTranslation();

  interface Project {
    id: string;
    name: string;
    description: string;
    members: number;
    tasks: number;
    status: 'active' | 'completed' | 'on-hold';
    tags?: string[];
    image?: string;
  }

  interface Props {
    columns?: 2 | 3;
    projects?: Project[];
  }

  let {
    columns = 2,
    projects = [],
  }: Props = $props();

  let searchQuery = $state('');
  const filtered = $derived(
    searchQuery
      ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()) || p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
      : projects
  );

  const statusConfig = {
    'active': { color: 'bg-green-500/10 text-green-600', label: 'Active' },
    'completed': { color: 'bg-blue-500/10 text-blue-600', label: 'Completed' },
    'on-hold': { color: 'bg-amber-500/10 text-amber-600', label: 'On Hold' },
  };

  const gridCols = $derived(columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2');
</script>

<div class="space-y-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h3 class="text-lg font-semibold text-foreground">
      {i18n.t('publicProfile.projectsCount', { count: filtered.length })}
    </h3>
    <div class="flex items-center gap-2">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={i18n.t('publicProfile.searchProjects')} bind:value={searchQuery} class="w-48 pl-9" />
      </div>
      <Button size="sm"><Plus class="h-3.5 w-3.5 mr-1" />{i18n.t('common.create')}</Button>
    </div>
  </div>

  {#if filtered.length === 0}
    <div class="rounded-xl border border-dashed border-border/60 p-8 text-center">
      <p class="text-sm text-muted-foreground">{i18n.t('publicProfile.noProjects')}</p>
    </div>
  {:else}
    <div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 {gridCols}">
      {#each filtered as project (project.id)}
        <Card.Card class="group overflow-hidden border-border/60 hover:border-primary/30 transition-colors">
          {#if project.image}
            <div class="h-32 overflow-hidden">
              <img src={project.image} alt={project.name} class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
          {/if}
          <Card.CardContent class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-semibold text-foreground">{project.name}</h4>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold {statusConfig[project.status].color}">
                {statusConfig[project.status].label}
              </span>
            </div>

            <p class="text-sm text-muted-foreground line-clamp-2">{project.description}</p>

            {#if project.tags && project.tags.length > 0}
              <div class="flex flex-wrap gap-1">
                {#each project.tags as tag (tag)}
                  <Badge variant="outline" class="text-[10px]">{tag}</Badge>
                {/each}
              </div>
            {/if}

            <div class="flex items-center justify-between pt-2 border-t">
              <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <span class="flex items-center gap-1"><Users class="h-3 w-3" />{i18n.t('publicProfile.projectMembers', { count: project.members })}</span>
                <span class="flex items-center gap-1"><CheckCircle2 class="h-3 w-3" />{i18n.t('publicProfile.projectTasks', { count: project.tasks })}</span>
              </div>
              <Button variant="ghost" size="icon-sm">
                <ArrowRight class="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card.CardContent>
        </Card.Card>
      {/each}
    </div>
  {/if}
</div>
