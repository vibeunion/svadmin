<script lang="ts">
  import { AdminApp, DataState } from '@svadmin/ui';
  import { createSimpleRestDataProvider } from '@svadmin/simple-rest';
  import { resources } from './resources';
  import { mockAuthProvider } from './providers/mockAuth';
  import Dashboard from './pages/Dashboard.svelte';
  import Login from './pages/Login.svelte';

  function connect() {
    return createSimpleRestDataProvider('https://jsonplaceholder.typicode.com');
  }
  let connection = $state(connect());
</script>

{#await connection}
  <DataState state="loading" />
{:then dataProvider}
  <AdminApp {dataProvider} {resources} authProvider={mockAuthProvider} title="svadmin Demo" locale="en">
    {#snippet dashboard()}<Dashboard />{/snippet}
    {#snippet loginPage()}<Login />{/snippet}
  </AdminApp>
{:catch}
  <DataState state="error" title="Unable to initialize data provider" retry={() => { connection = connect(); }} />
{/await}
