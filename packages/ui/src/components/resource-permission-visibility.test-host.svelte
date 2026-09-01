<script lang="ts">
  import { AICommandBar } from '@svadmin/ai-elements';
  import CommandPalette from './CommandPalette.svelte';
  import ListPage from './ListPage.svelte';
  import ResourceOperationsPage from './ResourceOperationsPage.svelte';
  import CloneButton from './buttons/CloneButton.svelte';
  import CreateButton from './buttons/CreateButton.svelte';
  import DeleteButton from './buttons/DeleteButton.svelte';
  import EditButton from './buttons/EditButton.svelte';
  import ShowButton from './buttons/ShowButton.svelte';

  type Surface = 'list' | 'operations' | 'command-palette' | 'ai-command-bar' | 'buttons';

  let { surface }: { surface: Surface } = $props();
</script>

{#if surface === 'list'}
  <ListPage resourceName="users" />
{:else if surface === 'operations'}
  <ResourceOperationsPage
    resourceName="users"
    eyebrow="Users"
    title="User operations"
    description="Permission visibility test"
    actionLabel="Add user"
  />
{:else if surface === 'command-palette'}
  <CommandPalette open={true} />
{:else if surface === 'ai-command-bar'}
  <AICommandBar open={true} />
{:else}
  <div aria-label="CRUD actions">
    <CreateButton resource="users" />
    <EditButton resource="users" recordItemId="user-1" />
    <ShowButton resource="users" recordItemId="user-1" />
    <CloneButton resource="users" recordItemId="user-1" />
    <DeleteButton resource="users" recordItemId="user-1" />
  </div>
{/if}
