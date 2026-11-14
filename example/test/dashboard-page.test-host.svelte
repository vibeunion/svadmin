<script lang="ts">
  import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
  import { provideAdminContext, type DataProvider } from '@svadmin/core';
  import Dashboard from '../src/features/dashboard/Dashboard.svelte';

  let { client }: { client: QueryClient } = $props();

  const dataProvider: DataProvider = {
    getList: async ({ resource }) => {
      if (resource === 'products') {
        return {
          data: [
            { id: '1', name: 'Standard Widget', sku: 'WID-001', stock: 15, minStock: 20, price: 100 },
            { id: '2', name: 'Premium Bolt', sku: 'BLT-002', stock: 50, minStock: 10, price: 50 },
          ],
          total: 2,
        };
      }
      if (resource === 'todos') {
        return {
          data: [{ id: '1', title: 'Inventory audit', completed: false }],
          total: 1,
        };
      }
      if (resource === 'sales_orders') {
        return {
          data: [{ id: '1', orderNumber: 'SO-001', customerName: 'Acme Corp', orderDate: '2026-06-15', status: 'pending', totalAmount: 500 }],
          total: 1,
        };
      }
      if (resource === 'calendar_events') {
        return {
          data: [{ id: '1', title: 'Warehouse cycle count', startDate: '2026-06-20', type: 'cycle_count' }],
          total: 1,
        };
      }
      return { data: [], total: 0 };
    },
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
    getApiUrl: () => '',
  };

  provideAdminContext({ dataProvider, resources: [], tenant: { tenantId: 'example-tenant' } });
</script>

<QueryClientProvider {client}>
  <Dashboard />
</QueryClientProvider>
