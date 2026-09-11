<script lang="ts">
  import { useLogout, useOnError } from './auth-hooks.svelte';
  import { useImport } from './import-hooks.svelte';
  import { useExport } from './export-hooks.svelte';
  import { defineResource } from './resource-contract';
  import { Type } from '@sinclair/typebox';
  import { useDataProvider } from './hooks.svelte';
  import { useCreate } from './strict-hooks.svelte';
  import { useBack, useGo } from './routing-hooks.svelte';
  import { useSubmitTask } from './task-hooks.svelte';
  import { useTable } from './table-hooks.svelte';
  import { useParsed } from './useParsed.svelte';
  import { useBreadcrumb, useMenu } from './utility-hooks.svelte';

  let { instance }: { instance: string } = $props();

  const resolveDataProvider = useDataProvider();
  const createContract = defineResource('posts', {
    record: Type.Object({ id: Type.String(), title: Type.String() }),
    create: Type.Object({ title: Type.String() }),
  });
  const createRecord = useCreate({ resource: createContract });
  const submitTask = useSubmitTask();
  const authError = useOnError();
  const logout = useLogout();
  const go = useGo();
  const back = useBack();
  const exportContract = defineResource('posts', { record: Type.Object({ id: Type.String() }) });
  const exporter = useExport({ resource: exportContract, download: false });
  const importContract = defineResource('posts', {
    record: Type.Object({ id: Type.String(), title: Type.String() }),
    create: Type.Object({ title: Type.String() }),
  });
  const importer = useImport({ resource: importContract, format: 'json' });
  const parsed = useParsed();
  const menu = useMenu();
  const breadcrumb = useBreadcrumb();
  const table = useTable({
    resource: 'posts',
    syncWithLocation: true,
    queryOptions: { enabled: false },
  });

  async function readProvider() {
    await resolveDataProvider().getList({ resource: 'posts' });
  }

  function createPost() {
    createRecord.mutation.mutate({ variables: { title: instance } });
  }

  function submitBackgroundTask() {
    submitTask.mutation.mutate({
      taskName: `task.${instance}`,
      options: { body: { instance } },
    });
  }

  async function handleAuthError() {
    await authError.mutate(new Error(`expired:${instance}`));
  }

  async function logoutDirectly() {
    await logout.mutate({ instance });
  }

  function navigateCustomRoute() {
    go({ to: `/custom/${instance}` });
  }

  async function importRecords() {
    const file = new File(
      [JSON.stringify([{ title: `import:${instance}` }])],
      `${instance}.json`,
      { type: 'application/json' },
    );
    await importer.handleChange({ file });
  }
</script>

<button data-testid={`${instance}-provider`} onclick={readProvider}>read provider</button>
<button data-testid={`${instance}-create`} onclick={createPost}>create post</button>
<button data-testid={`${instance}-task`} onclick={submitBackgroundTask}>submit task</button>
<button data-testid={`${instance}-auth-error`} onclick={handleAuthError}>handle auth error</button>
<button data-testid={`${instance}-logout`} onclick={logoutDirectly}>log out</button>
<button data-testid={`${instance}-go`} onclick={navigateCustomRoute}>go</button>
<button data-testid={`${instance}-back`} onclick={back}>back</button>
<button data-testid={`${instance}-export`} onclick={exporter.triggerExport}>export</button>
<button data-testid={`${instance}-import`} onclick={importRecords}>import</button>
<button data-testid={`${instance}-table-page`} onclick={() => table.setPage(2)}>table page</button>
<output data-testid={`${instance}-route`}>{parsed.resource ?? ''}</output>
<output data-testid={`${instance}-menu`}>{menu.menuItems[0]?.label ?? ''}</output>
<output data-testid={`${instance}-breadcrumb`}>{breadcrumb.items[0]?.label ?? ''}</output>
<output data-testid={`${instance}-table-current`}>{table.current}</output>
