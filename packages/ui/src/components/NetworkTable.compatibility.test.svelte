<script lang="ts">
  import NetworkTable from './content/NetworkTable.svelte';
  import type { NetworkColumn } from './content/NetworkTable.types.js';

  interface NetworkRow {
    id: string;
    name: string;
    email?: string;
  }

  const columns: NetworkColumn<NetworkRow>[] = [{ key: 'email', label: 'Email' }];
  const rows: NetworkRow[] = [{ id: 'member-1', name: 'Alex Chen' }];
</script>

<NetworkTable {columns} {rows} />
