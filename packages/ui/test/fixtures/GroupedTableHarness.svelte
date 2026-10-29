<script lang="ts">
  import GroupedTable from '../../src/components/GroupedTable.svelte';
  import type { TableColumn } from '../../src/components/grouped-table.js';

  interface Row {
    id: number;
    name: string;
    cpu: number;
    memory: number;
    status: string;
  }

  const columns: TableColumn<Row>[] = [
    { key: 'name', title: 'Name' },
    {
      key: 'usage',
      title: 'Resource usage',
      children: [
        { key: 'cpu', title: 'CPU', align: 'right' },
        { key: 'memory', title: 'Memory', align: 'right' },
      ],
    },
    { key: 'status', title: 'Status' },
  ];

  const rows: Row[] = [
    { id: 1, name: 'api', cpu: 42, memory: 68, status: 'healthy' },
    { id: 2, name: 'worker', cpu: 81, memory: 55, status: 'warning' },
  ];
</script>

<GroupedTable {columns} {rows} rowKey={(row) => row.id} caption="Service usage" />
