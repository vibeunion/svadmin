<script lang="ts">
  import * as Table from '../ui/table/index.js';
  import StatusBadge from './StatusBadge.svelte';
  export interface SecurityEvent { id: string; event: string; actor?: string; location?: string; createdAt: string; severity: 'info' | 'warning' | 'danger'; }
  interface Props { events?: SecurityEvent[]; class?: string; }
  let { events = [], class: className = '' }: Props = $props();
</script>
<div class={'overflow-x-auto rounded-lg border border-border bg-card ' + className}>
  <Table.Root data-svadmin-datatable>
    <Table.Header data-svadmin-table-head><Table.Row><Table.Head>Event</Table.Head><Table.Head>Actor</Table.Head><Table.Head>Location</Table.Head><Table.Head>Time</Table.Head><Table.Head>Risk</Table.Head></Table.Row></Table.Header>
    <Table.Body>
      {#each events as event (event.id)}
        <Table.Row data-svadmin-table-row><Table.Cell class="font-medium">{event.event}</Table.Cell><Table.Cell>{event.actor ?? 'System'}</Table.Cell><Table.Cell>{event.location ?? 'Unknown'}</Table.Cell><Table.Cell class="whitespace-nowrap">{event.createdAt}</Table.Cell><Table.Cell><StatusBadge status={event.severity} label={event.severity} /></Table.Cell></Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
  {#if events.length === 0}<div class="p-6 text-center text-sm text-muted-foreground">No security events</div>{/if}
</div>
