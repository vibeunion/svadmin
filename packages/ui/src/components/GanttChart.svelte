<script lang="ts">
  import { Badge } from './ui/badge/index.js';
  import { cn } from '../utils.js';

  export interface GanttTask {
    id: string;
    title: string;
    startDay: number; // 0-based offset
    durationDays: number;
    progress?: number; // 0 to 100
    category?: string;
    assignee?: string;
    status?: 'planned' | 'in_progress' | 'completed' | 'delayed';
  }

  interface Props {
    tasks: GanttTask[];
    totalDays?: number;
    dayLabelPrefix?: string;
    onselecttask?: (task: GanttTask) => void;
    class?: string;
  }

  let {
    tasks = [],
    totalDays = 14,
    dayLabelPrefix = 'D',
    onselecttask,
    class: className = '',
  }: Props = $props();

  const days = $derived(
    Array.from({ length: totalDays }, (_, i) => `${dayLabelPrefix}${i + 1}`)
  );

  function getStatusBadgeVariant(status?: string) {
    switch (status) {
      case 'completed':
        return 'svadmin-u-4cf5af8d25d3 svadmin-u-76747e5e02ff svadmin-u-18a6e7a36f29';
      case 'delayed':
        return 'svadmin-u-c698f77c9ba5 svadmin-u-811148b13d1e svadmin-u-9d5d8b4711b4';
      case 'in_progress':
        return 'svadmin-u-30f13f694038 svadmin-u-20aaf08a7ed1 svadmin-u-05f954a846d6';
      default:
        return 'svadmin-u-2ef11f1cb219 svadmin-u-bfa603190748 svadmin-u-6ee2d41e2d2d';
    }
  }

  function getBarColor(status?: string) {
    switch (status) {
      case 'completed':
        return 'svadmin-u-3355648fe22b svadmin-u-5a1ab9dd55a5';
      case 'delayed':
        return 'svadmin-u-fb1b0d05046d svadmin-u-00e05b9a87d5';
      default:
        return 'svadmin-u-75b1bec3ea0e svadmin-u-30ca335ae9c2';
    }
  }
</script>

<div class={cn('svadmin-u-a217b4eaa918 svadmin-u-ca6bcd4b6f3f svadmin-u-18049387f0af svadmin-u-cd0ad9a56558 svadmin-u-8e63407b5ceb svadmin-u-cef5b893cf23 svadmin-u-359090c2d529 svadmin-u-6ed543e2fbbb', className)}>
  <div class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-f4cc511ff0c1 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff">
    <div class="svadmin-u-e83a7042bc91 svadmin-u-d4108abe6359">
      Project Gantt Schedule <span class="svadmin-u-bfa603190748 svadmin-u-8ecebc9f80e6">({tasks.length} tasks / {totalDays} days)</span>
    </div>
  </div>

  <div class="svadmin-u-1384f66f41d0 svadmin-u-5f22e64f2282 svadmin-u-ca6bcd4b6f3f svadmin-u-05faf5c801ff">
    <div class="svadmin-u-c05fcc7c4caa">
      <!-- Timeline Header -->
      <div class="svadmin-u-60fbb7713999 svadmin-u-65fdbade2025 svadmin-u-05faf5c801ff svadmin-u-b00f43c30c2b svadmin-u-e83a7042bc91 svadmin-u-bfa603190748">
        <div class="svadmin-u-d16aae848835 svadmin-u-9fe52d5d506c svadmin-u-5ceb636bd9f3 svadmin-u-05faf5c801ff svadmin-u-2eba0d65d059 svadmin-u-012fbd121f37">Task Name</div>
        <div class="svadmin-u-36e579c0b41c svadmin-u-60fbb7713999">
          {#each days as day (day)}
            <div class="svadmin-u-36e579c0b41c svadmin-u-7660b450905a svadmin-u-ca6bf63030aa svadmin-u-5ceb636bd9f3 svadmin-u-6ee2d41e2d2d svadmin-u-d058ca6de60f svadmin-u-0e65706bcccd svadmin-u-bb5b5fc23bd9">
              {day}
            </div>
          {/each}
        </div>
      </div>

      <!-- Task Rows -->
      <div class="svadmin-u-fa6acbf81d74 svadmin-u-08b5607c7258">
        {#each tasks as task (task.id)}
          {@const leftPct = (task.startDay / totalDays) * 100}
          {@const widthPct = (task.durationDays / totalDays) * 100}
          <div
            role="button"
            tabindex="0"
            class="svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-c4b5eaba40e3 svadmin-u-ceb69a6b0e5f svadmin-u-34516836730d"
            onclick={() => onselecttask?.(task)}
            onkeydown={(e) => { if (e.key === 'Enter') onselecttask?.(task); }}
          >
            <!-- Task Info Column -->
            <div class="svadmin-u-d16aae848835 svadmin-u-9fe52d5d506c svadmin-u-5ceb636bd9f3 svadmin-u-05faf5c801ff svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-77a2a20e90d4 svadmin-u-012fbd121f37">
              <div class="svadmin-u-f283ea9bea0e svadmin-u-2689f3958069 svadmin-u-d4108abe6359">{task.title}</div>
              {#if task.status}
                <Badge variant="outline" class={cn('svadmin-u-e09880869d1f svadmin-u-d8e0e382c67b svadmin-u-68ecb30dbec6 uppercase', getStatusBadgeVariant(task.status))}>
                  {task.status}
                </Badge>
              {/if}
            </div>

            <!-- Task Bar Grid Area -->
            <div class="svadmin-u-36e579c0b41c svadmin-u-d89972fe17d6 svadmin-u-426b8b75185b svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-d8e0e382c67b">
              <!-- Grid vertical guideline background -->
              <div class="svadmin-u-da4dbfbc4fdc svadmin-u-7b7df0449b80 svadmin-u-60fbb7713999 svadmin-u-a4326536b8f5">
                {#each days as _, idx (idx)}
                  <div class="svadmin-u-36e579c0b41c svadmin-u-5ceb636bd9f3 svadmin-u-d528c7381898 svadmin-u-bb5b5fc23bd9"></div>
                {/each}
              </div>

              <!-- Bar element -->
              <div
                class={cn(
                  'svadmin-u-d89972fe17d6 svadmin-u-f6fe902450dc svadmin-u-421ac2be5045 svadmin-u-cef5b893cf23 svadmin-u-60fbb7713999 svadmin-u-3960ffc248d9 svadmin-u-8ef2268efbbc svadmin-u-d5eab218aa34 svadmin-u-1dc571a3609f svadmin-u-2689f3958069 svadmin-u-2cd02d11d1af svadmin-u-0fe7d7d814d0 group svadmin-u-7703298183eb',
                  getBarColor(task.status)
                )}
                style={`margin-left: ${leftPct}%; width: ${Math.max(widthPct, 4)}%;`}
              >
                <!-- Inner progress fill -->
                {#if task.progress !== undefined}
                  <div
                    class="svadmin-u-da4dbfbc4fdc svadmin-u-5f89f14a26db svadmin-u-c78facc7a0a6 svadmin-u-99d459b1015d svadmin-u-a4326536b8f5"
                    style={`width: ${task.progress}%;`}
                  ></div>
                {/if}

                <span class="svadmin-u-f283ea9bea0e svadmin-u-d89972fe17d6 svadmin-u-236812d64c82">{task.title}</span>
                {#if task.progress !== undefined}
                  <span class="svadmin-u-d89972fe17d6 svadmin-u-236812d64c82 svadmin-u-e09880869d1f svadmin-u-4f5874c554b6 svadmin-u-0e65706bcccd">{task.progress}%</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}

        {#if tasks.length === 0}
          <div class="svadmin-u-a1f611f027dd svadmin-u-ca6bf63030aa svadmin-u-bfa603190748">No schedule tasks available</div>
        {/if}
      </div>
    </div>
  </div>
</div>
