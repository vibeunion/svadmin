<script lang="ts">
  import type { FieldDefinition, Filter } from '@svadmin/core';
  import JsonSchemaForm from '../../../packages/ui/src/components/JsonSchemaForm.svelte';
  import FilterBuilder from '../../../packages/ui/src/components/FilterBuilder.svelte';
  import SpreadsheetView, { type SheetData } from '../../../packages/ui/src/components/SpreadsheetView.svelte';

  const scalarSchema: Record<string, unknown> = { type: 'object', title: 'Account configuration', required: ['amount'], properties: {
    amount: { type: 'number', title: 'Amount', description: 'Empty is not zero. Values must stay numeric.', default: 0, minimum: 0 },
    enabled: { type: 'boolean', title: 'Enabled', default: false },
    plan: { type: 'integer', title: 'Plan', enum: [1, 2], default: 1 },
  } };
  let schema = $state(scalarSchema);
  let readonly = $state(false);
  let failNext = $state(false);
  let formResult = $state('No submission');
  let queryResult = $state('No applied query');
  let csvResult = $state('No export');
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
  async function submit(data: Record<string, unknown>): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    if (failNext) { failNext = false; throw new Error('Expected fixture rejection'); }
    formResult = JSON.stringify(data);
  }
</script>

<main>
  <header><p class="eyebrow">SVADMIN · ENTERPRISE FOUNDATIONS</p><h1>Correctness before complexity</h1><p>Typed form values, lossless query groups and bounded formulas.</p>
    <button type="button" onclick={() => readonly = !readonly} aria-pressed={readonly}>Toggle readonly</button>
  </header>
  <div class="columns">
    <section aria-label="Schema form">
      <h2>01 · Schema form</h2>
      <JsonSchemaForm {schema} {readonly} onsubmit={submit} submitText="Submit" />
      <div class="fixture-actions"><button type="button" onclick={() => failNext = true}>Fail next submit</button><button type="button" onclick={() => schema = { properties: { unsupported: { type: 'string', pattern: '.*' } } }}>Unsupported schema</button><button type="button" onclick={() => schema = scalarSchema}>Restore schema</button></div>
      <pre data-testid="form-result">{formResult}</pre>
    </section>
    <section aria-label="Query builder"><h2>02 · Recursive query</h2><FilterBuilder {fields} bind:filters disabled={readonly} onApply={(result) => queryResult = JSON.stringify(result)} />
      <pre data-testid="query-result">{queryResult}</pre>
    </section>
  </div>
  <section aria-label="Spreadsheet"><h2>03 · Bounded spreadsheet formulas</h2><SpreadsheetView bind:sheets activeSheetId="one" {readonly} onexport={(result) => csvResult = result} /><pre data-testid="csv-result">{csvResult}</pre></section>
  <footer>This fixture validates component contracts. It does not certify full JSON Schema, Excel compatibility or backend authorization.</footer>
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
