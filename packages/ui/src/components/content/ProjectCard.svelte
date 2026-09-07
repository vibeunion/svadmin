<script lang="ts">
  import { ArrowRight, CheckCircle2, FolderKanban, Users } from '@lucide/svelte';
  import { Button } from '../ui/button/index.js';
  import * as Card from '../ui/card/index.js';
  import { Badge } from '../ui/badge/index.js';
  import Progress from '../ui/progress/progress.svelte';
  import StatusBadge from './StatusBadge.svelte';
  import MediaThumbnail from './MediaThumbnail.svelte';
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
<Card.Card data-interactive={onclick ? 'true' : undefined} class={'svadmin-u-668b21aa5409 ' + className}>
  {#if project.image}<div class="svadmin-u-b5f3ff77f4f9 svadmin-u-6da6a3c3f741"><MediaThumbnail src={project.image} alt={project.name} size="full" fit="cover" showOverlay={false} /></div>{/if}
  <Card.CardContent class="svadmin-u-60fbb7713999 svadmin-u-668b21aa5409 svadmin-u-8dddea0773ed svadmin-u-0c3bc98565dd svadmin-u-8e63407b5ceb">
    <div class="svadmin-u-60fbb7713999 svadmin-u-60541e1e26f8 svadmin-u-8ef2268efbbc svadmin-u-1004c0c3954c">
      <div class="svadmin-u-60fbb7713999 svadmin-u-7e0b7cdf1a94 svadmin-u-3960ffc248d9 svadmin-u-1004c0c3954c"><span class="svadmin-u-60fbb7713999 svadmin-u-665f07fe73cc svadmin-u-012fbd121f37 svadmin-u-3960ffc248d9 svadmin-u-86843cf1e227 svadmin-u-421ac2be5045 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-358af0b65a31 svadmin-u-bfa603190748"><FolderKanban class="svadmin-u-f7b5fa971871" /></span><h3 class="svadmin-u-f283ea9bea0e svadmin-u-fc7473ca09eb svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">{project.name}</h3></div>
      <StatusBadge status={project.status === 'active' ? 'success' : project.status === 'completed' ? 'info' : project.status === 'on-hold' ? 'warning' : 'neutral'} label={project.status} />
    </div>
    {#if project.description}<p class="svadmin-u-054cb4e36116 svadmin-u-fc7473ca09eb svadmin-u-bfa603190748">{project.description}</p>{/if}
    {#if project.tags?.length}<div class="svadmin-u-60fbb7713999 svadmin-u-1eb5c6df38c1 svadmin-u-58284b4ea568">{#each project.tags as tag (tag)}<Badge variant="outline">{tag}</Badge>{/each}</div>{/if}
    <div class="svadmin-u-9953408a8ef3 svadmin-u-6f7e013d6499">
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-359090c2d529 svadmin-u-bfa603190748"><span>Progress</span><span class="svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{progress}%</span></div>
      <Progress value={progress} class="svadmin-u-095acb275581" />
      <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-b950dda299d3 svadmin-u-18049387f0af svadmin-u-ce335a8e4f56 svadmin-u-359090c2d529 svadmin-u-bfa603190748"><span class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421"><Users class="svadmin-u-783b0d9d1e2c" />{project.members ?? 0}</span><span class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-44ee8ba0a421"><CheckCircle2 class="svadmin-u-783b0d9d1e2c" />{project.tasks ?? 0}</span>{#if onclick}<Button variant="ghost" size="icon-sm" aria-label={project.name} onclick={onclick}><ArrowRight class="svadmin-u-783b0d9d1e2c" /></Button>{/if}</div>
    </div>
  </Card.CardContent>
</Card.Card>
