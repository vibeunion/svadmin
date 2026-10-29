<script lang="ts">
  import { provideAdminContext, type DataProvider, type FieldDefinition, type Filter, type TaskProvider, type TaskRecord } from '@svadmin/core';
  import JsonSchemaForm from '../../../packages/ui/src/components/JsonSchemaForm.svelte';
  import FilterBuilder from '../../../packages/ui/src/components/FilterBuilder.svelte';
  import SpreadsheetView, { type SheetData } from '../../../packages/ui/src/components/SpreadsheetView.svelte';
  import TaskList from '../../../packages/ui/src/components/TaskList.svelte';
  import EnterpriseSettingsFixture from './EnterpriseSettingsFixture.svelte';
  import ApiSettingsFixture from './ApiSettingsFixture.svelte';
  import SecuritySettingsFixture from './SecuritySettingsFixture.svelte';
  import ProfileMfaFixture from './ProfileMfaFixture.svelte';
  import NotificationSettingsFixture from './NotificationSettingsFixture.svelte';
  import CompanyProfileFixture from './CompanyProfileFixture.svelte';
  import MemberDirectoryFixture from './MemberDirectoryFixture.svelte';
  import ApprovalCenterFixture from './ApprovalCenterFixture.svelte';
  import AutoFormAccessibilityFixture from './AutoFormAccessibilityFixture.svelte';
  import AutoFormUploadBrowserFixture from './AutoFormUploadBrowserFixture.svelte';
  import StepsFormAccessibilityFixture from './StepsFormAccessibilityFixture.svelte';
  import StepsFormLifecycleFixture from './StepsFormLifecycleFixture.svelte';
  import FormResetBrowserFixture from './FormResetBrowserFixture.svelte';
  import PermissionMatrixFixture from './PermissionMatrixFixture.svelte';
  import RolesSettingsFixture from './RolesSettingsFixture.svelte';
  import FileListFixture from './FileListFixture.svelte';
  import ImportDropzoneFixture from './ImportDropzoneFixture.svelte';
  import ImportExportCenterFixture from './ImportExportCenterFixture.svelte';
  import FileUploadFixture from './FileUploadFixture.svelte';
  import NumericInputsFixture from './NumericInputsFixture.svelte';
  import DateTimePickerFixture from './DateTimePickerFixture.svelte';
  import DateTimeKeyboardFixture from './DateTimeKeyboardFixture.svelte';
  import ComboboxFixture from './ComboboxFixture.svelte';
  import AutoCompleteFixture from './AutoCompleteFixture.svelte';
  import RelationPickerFixture from './RelationPickerFixture.svelte';
  import CascaderFixture from './CascaderFixture.svelte';
  import TreeSelectFixture from './TreeSelectFixture.svelte';
  import RadioGroupFixture from './RadioGroupFixture.svelte';
  import SegmentedControlFixture from './SegmentedControlFixture.svelte';
  import SavedListViewsFixture from './SavedListViewsFixture.svelte';
  import SavedViewsMenuEvidence from './SavedViewsMenuEvidence.svelte';
  import DetailDrawerStatusEvidence from './DetailDrawerStatusEvidence.svelte';
  import ListPaginationEvidence from './ListPaginationEvidence.svelte';
  import DataTableShellEvidence from './DataTableShellEvidence.svelte';
  import ResourceWorkspaceFixture from './ResourceWorkspaceFixture.svelte';
  import ResourceWorkspaceEditRouteFixture from './ResourceWorkspaceEditRouteFixture.svelte';
  import QuickEditLifecycleFixture from './QuickEditLifecycleFixture.svelte';
  import DetailWorkspaceBrowserFixture from './DetailWorkspaceBrowserFixture.svelte';
  import DashboardWorkspaceFixture from './DashboardWorkspaceFixture.svelte';
  import MultiTabStateBrowserFixture from './MultiTabStateBrowserFixture.svelte';
  import SchemaUnsupportedFixture from './SchemaUnsupportedFixture.svelte';
  import ModalDrawerFormFixture from './ModalDrawerFormFixture.svelte';
  import RowActionsEvidence from './RowActionsEvidence.svelte';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import type { SchemaFormSchema } from '@svadmin/core/schema-form';

  const scalarSchema: Record<string, unknown> = { type: 'object', title: 'Account configuration', required: ['amount'], properties: {
    amount: { type: 'number', title: 'Amount', description: 'Empty is not zero. Values must stay numeric.', default: 0, minimum: 0 },
    enabled: { type: 'boolean', title: 'Enabled', default: false },
    plan: { type: 'integer', title: 'Plan', enum: [1, 2], default: 1 },
  } };
  const requestedView = new URLSearchParams(window.location.search).get('view');
  const conditionalKind = new URLSearchParams(window.location.search).get('condition') ?? 'object';
  const whenAdvanced = { path: ['mode'], equals: 'advanced' };
  const conditionalAmount: SchemaFormSchema = { type: 'number', title: 'Amount', default: 10,
    description: 'Enter a numeric amount.',
    ...(['field', 'row-field'].includes(conditionalKind) ? { visibleWhen: whenAdvanced } : {}),
  };
  const conditionalGroup: SchemaFormSchema = { type: 'object', title: 'Advanced details',
    description: 'Amounts for this configuration.',
    required: ['amount/~net'], properties: { 'amount/~net': conditionalAmount },
    ...(conditionalKind === 'object' ? { visibleWhen: whenAdvanced } : {}),
  };
  const conditionalSchema: SchemaFormSchema = { type: 'object', title: 'Conditional configuration', properties: {
    mode: { enum: ['basic', 'advanced'], title: 'Mode', default: 'advanced' },
    details: ['array', 'row-field'].includes(conditionalKind)
      ? { type: 'array', description: 'Configured amount rows.', items: conditionalGroup, default: [{ 'amount/~net': 10 }],
        ...(conditionalKind === 'array' ? { visibleWhen: whenAdvanced } : {}) }
      : conditionalGroup,
  } };
  let schema = $state(requestedView === 'schema-conditional' ? conditionalSchema : scalarSchema);
  let readonly = $state(false);
  let failNext = $state(false);
  let formResult = $state('No submission');
  let formSubmissions = $state(0);
  let queryResult = $state('No applied query');
  let csvResult = $state('No export');
  let selectedTask = $state('No selected task');
  let taskFormSubmitted = $state(false);
  let taskSelections = $state(0);
  let taskCancellations = $state(0);
  let failNextTaskCancel = $state(false);
  let failNextTaskRetry = $state(false);
  let taskRetries = $state(0);
  let showRetryTask = $state(false);
  let showTaskActions = $state(true);
  const taskQueryClient = new QueryClient();
  const fields: FieldDefinition[] = [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'plan', label: 'Plan', type: 'select', options: [{ label: 'One', value: 1 }, { label: 'Two', value: 2 }] },
  ];
  let filters = $state<Filter[]>([
    { field: 'title', operator: 'contains', value: 'Svelte' },
    { operator: 'or', value: [{ field: 'amount', operator: 'gte', value: 0 }, { operator: 'and', value: [{ field: 'plan', operator: 'eq', value: 1 }] }] },
  ]);
  let sheets = $state<SheetData[]>([{ id: 'one', name: 'Operations', rows: 2, cols: 4, cells: {
    A1: '2', B1: '=A1*2', C1: '=1/3', D1: '=D1', A2: '@SUM(1,2)', B2: '-42', C2: 'Verified', D2: '=SUM(A1:B1)',
  } }]);
  const task: TaskRecord = { id: 'task-1', title: 'Generate report', status: 'processing', message: 'Preparing report data.' };
  const retryTask: TaskRecord = { id: 'task-2', title: 'Retry report', status: 'failed', message: 'The previous report attempt failed.' };
  const taskProvider: TaskProvider = {
    submit: async () => ({ id: task.id, wait: async () => task }),
    get: async () => task,
    cancel: async () => {
      if (failNextTaskCancel) {
        failNextTaskCancel = false;
        throw new Error('PRIVATE_TASK_ACTION_FIXTURE');
      }
      taskCancellations += 1;
      return { ...task, status: 'cancelled' };
    },
    retry: async (taskId) => {
      if (failNextTaskRetry) {
        failNextTaskRetry = false;
        throw new Error('PRIVATE_TASK_RETRY_FIXTURE');
      }
      taskRetries += 1;
      return { ...(taskId === retryTask.id ? retryTask : task), status: 'pending' };
    },
  };
  const dataProvider: DataProvider = {
    getApiUrl: () => '/fixture',
    getList: async () => ({ data: [], total: 0 }),
    getOne: async () => ({ data: {} }),
    create: async () => ({ data: {} }),
    update: async () => ({ data: {} }),
    deleteOne: async () => ({ data: {} }),
  };
  provideAdminContext({ dataProvider, taskProvider });
  async function submit(data: Record<string, unknown>): Promise<void> {
    formSubmissions += 1;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    if (failNext) { failNext = false; throw new Error('Expected fixture rejection'); }
    formResult = JSON.stringify(data);
  }
</script>

<main>
  {#if new URLSearchParams(window.location.search).get('view') === 'enterprise'}
    <EnterpriseSettingsFixture />
  {:else if new URLSearchParams(window.location.search).get('view') === 'api'}
    <ApiSettingsFixture />
  {:else if new URLSearchParams(window.location.search).get('view') === 'security'}
    {#each Array.from({ length: new URLSearchParams(window.location.search).get('instances') === '2' ? 2 : 1 }) as _, index (index)}
      <SecuritySettingsFixture />
    {/each}
  {:else if ['profile', 'mfa'].includes(new URLSearchParams(window.location.search).get('view') ?? '')}
    {#each Array.from({ length: new URLSearchParams(window.location.search).get('instances') === '2' ? 2 : 1 }) as _, index (index)}
      <ProfileMfaFixture />
    {/each}
  {:else if new URLSearchParams(window.location.search).get('view') === 'notifications'}
    <NotificationSettingsFixture />
  {:else if new URLSearchParams(window.location.search).get('view') === 'company'}
    {#each Array.from({ length: new URLSearchParams(window.location.search).get('instances') === '2' ? 2 : 1 }) as _, index (index)}
      <CompanyProfileFixture />
    {/each}
  {:else if new URLSearchParams(window.location.search).get('view') === 'members'}
    {#each Array.from({ length: new URLSearchParams(window.location.search).get('instances') === '2' ? 2 : 1 }) as _, index (index)}
      <MemberDirectoryFixture />
    {/each}
  {:else if new URLSearchParams(window.location.search).get('view') === 'approval'}
    <ApprovalCenterFixture />
  {:else if requestedView === 'autoform'}
    <AutoFormAccessibilityFixture />
  {:else if requestedView === 'autoform-upload'}
    <AutoFormUploadBrowserFixture />
  {:else if requestedView === 'stepsform'}
    {#each Array.from({ length: new URLSearchParams(window.location.search).get('instances') === '2' ? 2 : 1 }) as _, index (index)}
      <StepsFormAccessibilityFixture />
    {/each}
  {:else if requestedView === 'steps-form-lifecycle'}
    <StepsFormLifecycleFixture />
  {:else if requestedView === 'form-reset'}
    <FormResetBrowserFixture />
  {:else if requestedView === 'permissionmatrix'}
    <PermissionMatrixFixture />
  {:else if requestedView === 'roles'}
    <RolesSettingsFixture />
  {:else if requestedView === 'files'}
    <FileListFixture />
  {:else if requestedView === 'import'}
    <ImportDropzoneFixture />
  {:else if requestedView === 'import-export'}
    <ImportExportCenterFixture />
  {:else if requestedView === 'upload'}
    <FileUploadFixture />
  {:else if requestedView === 'numeric'}
    <NumericInputsFixture />
  {:else if requestedView === 'date-time'}
    <DateTimePickerFixture />
  {:else if requestedView === 'date-time-keyboard'}
    <DateTimeKeyboardFixture />
  {:else if requestedView === 'combobox'}
    <ComboboxFixture />
  {:else if requestedView === 'autocomplete'}
    <AutoCompleteFixture />
  {:else if requestedView === 'relation'}
    <RelationPickerFixture />
  {:else if requestedView === 'cascader'}
    <CascaderFixture />
  {:else if requestedView === 'tree-select'}
    <TreeSelectFixture />
  {:else if requestedView === 'radio-group'}
    <RadioGroupFixture />
  {:else if requestedView === 'segmented-control'}
    <SegmentedControlFixture />
  {:else if requestedView === 'saved-list-views'}
    <SavedListViewsFixture />
  {:else if requestedView === 'saved-views-menu'}
    <SavedViewsMenuEvidence />
  {:else if requestedView === 'detail-drawer-status'}
    <DetailDrawerStatusEvidence />
  {:else if requestedView === 'list-pagination'}
    <ListPaginationEvidence />
  {:else if requestedView === 'data-table-shell'}
    <DataTableShellEvidence />
  {:else if requestedView === 'resource-workspace'}
    <ResourceWorkspaceFixture />
  {:else if requestedView === 'resource-workspace-edit-route'}
    <ResourceWorkspaceEditRouteFixture />
  {:else if requestedView === 'quick-edit-lifecycle'}
    <QuickEditLifecycleFixture />
  {:else if requestedView === 'detail-workspace'}
    <DetailWorkspaceBrowserFixture />
  {:else if requestedView === 'dashboard'}
    <DashboardWorkspaceFixture />
  {:else if requestedView === 'multi-tab-state'}
    <MultiTabStateBrowserFixture />
  {:else if requestedView === 'schema-unsupported'}
    <SchemaUnsupportedFixture />
  {:else if requestedView === 'row-actions-evidence'}
    <RowActionsEvidence />
  {:else if requestedView === 'modal-drawer-form'}
    <ModalDrawerFormFixture kind={new URLSearchParams(window.location.search).get('kind') === 'drawer' ? 'drawer' : 'modal'} />
  {:else}
  <header><p class="eyebrow">SVADMIN · ENTERPRISE FOUNDATIONS</p><h1>Correctness before complexity</h1><p>Typed form values, lossless query groups and bounded formulas.</p>
    <button type="button" onclick={() => readonly = !readonly} aria-pressed={readonly}>Toggle readonly</button>
  </header>
  <div class="columns">
    <section aria-label="Schema form">
      <h2>01 · Schema form</h2>
      <JsonSchemaForm {schema} {readonly} onsubmit={submit} submitText="Submit" />
      <div class="fixture-actions"><button type="button" onclick={() => failNext = true}>Fail next submit</button><button type="button" onclick={() => schema = { properties: { invalid: { type: 'string', pattern: '[' } } }}>Invalid schema</button><button type="button" onclick={() => schema = scalarSchema}>Restore schema</button></div>
      <pre data-testid="form-result">{formResult}</pre>
      {#if requestedView === 'schema-conditional'}<output data-testid="form-submissions">{formSubmissions}</output>{/if}
    </section>
    <section aria-label="Query builder"><h2>02 · Recursive query</h2><FilterBuilder {fields} bind:filters disabled={readonly} onApply={(result) => queryResult = JSON.stringify(result)} />
      <pre data-testid="query-result">{queryResult}</pre>
    </section>
  </div>
  <section aria-label="Spreadsheet"><h2>03 · Bounded spreadsheet formulas</h2><SpreadsheetView bind:sheets activeSheetId="one" {readonly} onexport={(result) => csvResult = result} /><pre data-testid="csv-result">{csvResult}</pre></section>
  <form data-testid="task-form" onsubmit={(event) => { event.preventDefault(); taskFormSubmitted = true; }}>
    <section aria-label="Task list"><h2>04 · Task selection and actions</h2>
      <label><input type="checkbox" bind:checked={showTaskActions} /> Show task actions</label>
      <button type="button" data-testid="fail-task-cancel" onclick={() => failNextTaskCancel = true}>Fail next cancel</button>
      <button type="button" data-testid="show-retry-task" onclick={() => showRetryTask = !showRetryTask} aria-pressed={showRetryTask}>Show retry task</button>
      <button type="button" data-testid="fail-task-retry" onclick={() => failNextTaskRetry = true}>Fail next retry</button>
      <button type="button" data-testid="task-focus-start">Task focus start</button>
      <QueryClientProvider client={taskQueryClient}>
        <TaskList tasks={showRetryTask ? [task, retryTask] : [task]} {taskProvider} showActions={showTaskActions} useProviderData={false}
          onSelect={(selected) => { selectedTask = selected.id; taskSelections += 1; }} />
      </QueryClientProvider>
      <p data-testid="selected-task">{selectedTask}</p>
      <p data-testid="task-selections">{taskSelections}</p>
      <p data-testid="task-cancellations">{taskCancellations}</p>
      <p data-testid="task-retries">{taskRetries}</p>
      <p data-testid="task-form-submitted">{String(taskFormSubmitted)}</p>
    </section>
  </form>
  <footer>This fixture validates component contracts. It does not certify full JSON Schema, Excel compatibility or backend authorization.</footer>
  {/if}
</main>

<style>
  :global(body) { margin: 0; color: var(--foreground); background: var(--background); font-family: system-ui, sans-serif; }
  main { max-width: 1680px; margin: 0 auto; padding: 32px; }
  header { margin-block-end: 24px; }
  h1 { font-size: 28px; line-height: 1.25; margin: 6px 0 10px; font-weight: 650; letter-spacing: -.025em; }
  h2 { font-size: 16px; margin: 0 0 14px; font-weight: 600; }
  p, footer { color: var(--muted-foreground); font-size: 14px; }
  .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .09em; }
  .columns { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(0, 2fr); gap: 24px; }
  section { min-width: 0; margin-block-end: 24px; }
  button { border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; background: var(--card); color: var(--foreground); font-size: 12px; }
  button:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  .fixture-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-block-start: 12px; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid var(--border); background: var(--muted); border-radius: 6px; padding: 10px; font-size: 11px; margin-block-start: 12px; }
  @media (max-width: 800px) { main { padding: 16px; } .columns { grid-template-columns: minmax(0, 1fr); } }
</style>
