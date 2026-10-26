<script lang="ts">
  import JsonSchemaForm from '../../../packages/ui/src/components/JsonSchemaForm.svelte';

  const requested = new URLSearchParams(window.location.search).get('case') ?? 'select';
  let accessorReads = $state(0);

  const nestedSchema = {
    type: 'object',
    additionalProperties: false,
    properties: { choice: {
      oneOf: [
        { type: 'object', additionalProperties: false, required: ['kind', 'text'], properties: {
          kind: { const: 'text', title: 'Kind' }, text: { type: 'string', title: 'Text', minLength: 2 },
        } },
        { type: 'object', additionalProperties: false, required: ['kind', 'count'], properties: {
          kind: { const: 'count', title: 'Kind' }, count: { type: 'integer', title: 'Count', minimum: 1 },
        } },
      ],
      discriminator: { propertyName: 'kind' },
    } },
  };
  const rootSchema = {
    type: 'object',
    additionalProperties: false,
    oneOf: [
      { type: 'object', additionalProperties: false, required: ['kind', 'text'], properties: {
        kind: { const: 'text', title: 'Kind' }, text: { type: 'string', title: 'Text', minLength: 2 },
      } },
      { type: 'object', additionalProperties: false, required: ['kind', 'count'], properties: {
        kind: { const: 'count', title: 'Kind' }, count: { type: 'integer', title: 'Count', minimum: 1, default: 5 },
      } },
    ],
    discriminator: { propertyName: 'kind' },
  };
  const defaultsSchema = {
    type: 'object',
    additionalProperties: false,
    properties: { choice: {
      oneOf: [
        { type: 'object', additionalProperties: false, required: ['kind', 'text'], properties: {
          kind: { const: 'text', title: 'Kind' },
          text: { type: 'string', title: 'Text', default: 'seeded' },
          profile: { type: 'object', properties: { code: { type: 'string', title: 'Code', default: 'A' } } },
        } },
        { type: 'object', additionalProperties: false, required: ['kind', 'count'], properties: {
          kind: { const: 'count', title: 'Kind' }, count: { type: 'integer', title: 'Count', default: 7 },
        } },
      ],
      discriminator: { propertyName: 'kind' },
    } },
  };
  const readonlySchema = {
    oneOf: [
      { type: 'object', readOnly: true, additionalProperties: false, required: ['kind', 'text'], properties: {
        kind: { const: 'text', title: 'Kind' }, text: { type: 'string', title: 'Text' },
      } },
      { type: 'object', additionalProperties: false, required: ['kind', 'count'], properties: {
        kind: { const: 'count', title: 'Kind' }, count: { type: 'integer', title: 'Count' },
      } },
    ],
    discriminator: { propertyName: 'kind' },
  };
  const accessorDiscriminator: Record<string, unknown> = {};
  Object.defineProperty(accessorDiscriminator, 'propertyName', {
    enumerable: true,
    get() { accessorReads += 1; return 'kind'; },
  });
  const accessorSchema = {
    oneOf: [
      { type: 'object', properties: { kind: { const: 'text', title: 'Kind' }, text: { type: 'string', title: 'Text' } } },
    ],
    discriminator: accessorDiscriminator,
  };
  const ambiguousSchema = { type: 'object', properties: { choice: {
    oneOf: [
      { type: 'object', properties: { kind: { const: 'same' } } },
      { type: 'object', properties: { kind: { const: 'same' } } },
    ],
    discriminator: { propertyName: 'kind' },
  } } };

  const cases = {
    select: { schema: nestedSchema, value: { choice: {} } },
    ambiguous: { schema: ambiguousSchema, value: { choice: {} } },
    root: { schema: rootSchema, value: {} },
    defaults: { schema: defaultsSchema, value: { choice: { kind: 'text' } } },
    readonly: { schema: readonlySchema, value: { kind: 'text', text: 'fixed' } },
    accessor: { schema: accessorSchema, value: {} },
  };
  const fixtureCase = requested in cases ? requested as keyof typeof cases : 'select';
  const current = cases[fixtureCase];
  const schema = current.schema;
  // 显式提供空分支对象，模拟“已进入 oneOf 字段但尚未选择 discriminator”的草稿。
  const initialValue = current.value;

  let submissions = $state(0);
  let payload = $state('');
</script>

<div data-testid="schema-oneof-fixture" data-case={fixtureCase}>
  <JsonSchemaForm {schema} value={initialValue} onsubmit={(value) => { submissions += 1; payload = JSON.stringify(value); }} submitText="Submit" />
  <output hidden data-testid="oneof-submissions">{submissions}</output>
  <output hidden data-testid="oneof-accessor-reads">{accessorReads}</output>
  <pre data-testid="oneof-payload">{payload}</pre>
</div>