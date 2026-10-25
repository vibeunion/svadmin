<script lang="ts">
  import JsonSchemaForm from '../../../packages/ui/src/components/JsonSchemaForm.svelte';

  const requestedCase = new URLSearchParams(window.location.search).get('case') ?? 'internal-ref';
  const schemas: Record<string, Record<string, unknown>> = {
    'internal-ref': {
      type: 'object',
      title: 'Unsupported internal reference',
      properties: { field: { $ref: '#/$defs/name' } },
      $defs: { name: { type: 'string' } },
    },
    'external-ref': {
      type: 'object',
      title: 'Unsupported external reference',
      properties: { field: { $ref: 'https://schemas.example.invalid/external.json#/name' } },
    },
    'one-of': {
      type: 'object',
      title: 'Unsupported oneOf choice',
      properties: { choice: { oneOf: [{ type: 'string' }, { type: 'number' }] } },
    },
    'unknown-keyword': {
      type: 'object',
      title: 'Unsupported unknown keyword',
      properties: { field: { type: 'string', format: 'email' } },
    },
  };
  const scenario = requestedCase in schemas ? requestedCase : 'internal-ref';
  const schema = schemas[scenario];
  let submissions = $state(0);
</script>

<div data-testid="schema-unsupported-fixture" data-case={scenario}>
  <h1>Unsupported schema fixture: {scenario}</h1>
  <JsonSchemaForm {schema} onsubmit={() => { submissions += 1; }} submitText="Submit" />
  <output hidden data-testid="unsupported-submissions">{submissions}</output>
</div>