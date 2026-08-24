<script lang="ts">
  import { ArrowRight, CheckCircle2, FolderKanban, Users } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import * as Card from '../ui/card/index.js';
  import { Badge } from '../ui/badge/index.js';
  import Progress from '../ui/progress/progress.svelte';
  import StatusBadge from './StatusBadge.svelte';
  export type ProjectStatus = 'active' | 'completed' | 'on-hold' | 'draft';
  export interface ProjectSummary {
    id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    members?: number;
    tasks?: number;
    progress?: number;
    tags?: string[];
    image?: string;
  }
  interface Props { project: ProjectSummary; onclick?: () => void; class?: string; }
  let { project, onclick, class: className = '' }: Props = $props();
  const progress = $derived(project.progress ?? (project.status === 'completed' ? 100 : project.status === 'active' ? 72 : 0));
</script>
<Card.Card data-interactive={onclick ? 'true' : undefined} class={'h-full ' + className}>
  {#if project.image}<img src={project.image} alt={project.name} class="h-32 w-full object-cover" />{/if}
  <Card.CardContent class="flex h-full flex-col gap-4 p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3"><span class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 text-muted-foreground"><FolderKanban class="size-4" /></span><h3 class="truncate text-sm font-semibold text-foreground">{project.name}</h3></div>
      <StatusBadge status={project.status === 'active' ? 'success' : project.status === 'completed' ? 'info' : project.status === 'on-hold' ? 'warning' : 'neutral'} label={project.status} />
    </div>
    {#if project.description}<p class="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>{/if}
    {#if project.tags?.length}<div class="flex flex-wrap gap-1.5">{#each project.tags as tag (tag)}<Badge variant="outline">{tag}</Badge>{/each}</div>{/if}
    <div class="mt-auto space-y-2">
      <div class="flex items-center justify-between text-xs text-muted-foreground"><span>Progress</span><span class="font-medium text-foreground">{progress}%</span></div>
      <Progress value={progress} class="h-1.5" />
      <div class="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span class="flex items-center gap-1"><Users class="size-3.5" />{project.members ?? 0}</span><span class="flex items-center gap-1"><CheckCircle2 class="size-3.5" />{project.tasks ?? 0}</span>{#if onclick}<Button variant="ghost" size="icon-sm" aria-label={project.name} onclick={onclick}><ArrowRight class="size-3.5" /></Button>{/if}</div>
    </div>
  </Card.CardContent>
</Card.Card>
