from pathlib import Path
import subprocess
import os

OLD = '7621ec2103ef0f7ad87899283eedb65b7b7e4b0a'
ASSETS = Path(os.environ['REVIEW_ASSETS'])

def git(*args):
    return subprocess.check_output(['git', *args], text=True)

def edit(path, before, after, count=1):
    p = Path(path)
    text = p.read_text()
    actual = text.count(before)
    if count is not None and actual != count:
        raise RuntimeError(f'{path}: expected {count} occurrences, got {actual}: {before[:100]!r}')
    if actual == 0:
        raise RuntimeError(f'{path}: missing anchor {before[:100]!r}')
    p.write_text(text.replace(before, after))

# Start from the fetched current main. Copy only the original PR's reviewed file set.
# Main's recursive form, state/snapshot helper and nine lossless-filter tests stay in place.
paths = [
    '.github/workflows/enterprise-ui.yml',
    'docs/evaluations/enterprise-ui-correctness.md',
    'docs/evaluations/enterprise-ui-plan.md',
    'packages/ui/src/components/FilterBuilder.svelte',
    'packages/ui/src/components/FilterBuilderLocale.test.svelte',
    'packages/ui/src/components/SpreadsheetView.svelte',
    'packages/ui/src/components/enterprise-components.test.svelte.ts',
    'packages/ui/src/components/enterprise/correctness.test.ts',
    'packages/ui/src/components/enterprise/filter-tree.ts',
    'packages/ui/src/components/enterprise/json-schema-form.ts',
    'packages/ui/src/components/enterprise/spreadsheet-formula.ts',
    'playwright.enterprise.config.ts',
    'scripts/fixtures/enterprise-ui/App.svelte',
    'scripts/fixtures/enterprise-ui/browser.spec.ts',
    'scripts/fixtures/enterprise-ui/index.html',
    'scripts/fixtures/enterprise-ui/main.ts',
    'scripts/fixtures/enterprise-ui/vite.config.ts',
]
for name in paths:
    p = Path(name)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(git('show', f'{OLD}:{name}'))
# Preserve the older locale regressions too, without overwriting main's newer tests.
old_filter_tests = git('show', f'{OLD}:packages/ui/src/components/filter-builder.test.svelte.ts')
Path('packages/ui/src/components/enterprise-filter-legacy.test.svelte.ts').write_text(old_filter_tests)

leaf = 'packages/ui/src/components/enterprise/json-schema-form.ts'
edit(leaf, "| 'invalid-value';", "| 'invalid-value' | 'minItems' | 'maxItems';")
p = Path(leaf)
text = p.read_text()
start = text.index('/** 提交使用独立 JSON 快照')
p.write_text(text[:start] + "// Reuse the hardened recursive form transport boundary, including accessor/symbol rejection.\nexport { schemaFormSnapshot } from '../json-schema-form-state.js';\n")
Path('packages/ui/src/components/enterprise/recursive-schema-form.ts').write_text((ASSETS / 'recursive-schema-form.ts').read_text())

state = 'packages/ui/src/components/json-schema-form-state.ts'
edit(state, '  type?: string;', '  type?: string | string[];\n  const?: string | number | boolean | null;\n  readOnly?: boolean;\n  minimum?: number;\n  maximum?: number;\n  exclusiveMinimum?: number;\n  exclusiveMaximum?: number;\n  multipleOf?: number;\n  minLength?: number;\n  maxLength?: number;\n  minItems?: number;\n  maxItems?: number;\n  additionalProperties?: boolean;')

form = 'packages/ui/src/components/JsonSchemaForm.svelte'
edit(form, "  type JsonSchema = JsonSchemaFormSchema;", """  import { readRecursiveSchemaForm, validateRecursiveSchemaForm, schemaFormPointer } from './enterprise/recursive-schema-form.js';
  import { parseSchemaNumber, type SchemaFormIssue } from './enterprise/json-schema-form.js';
  type JsonSchema = JsonSchemaFormSchema;""")
edit(form, '    onerror?: (error: unknown) => void;', '    onerror?: (error: unknown) => void;\n    onvalidationerror?: (issues: SchemaFormIssue[]) => void;')
edit(form, '    onerror,\n', '    onerror,\n    onvalidationerror,\n')
edit(form, '  let isSubmitting = $state(false);', """  const model = $derived(readRecursiveSchemaForm(schema));
  let validationIssues = $state<SchemaFormIssue[]>([]);
  let parseIssues = $state<SchemaFormIssue[]>([]);
  let internalValue: Record<string, unknown> | undefined;
  let isSubmitting = $state(false);""")
edit(form, '    try { return { ok: true as const, value: initializeSchemaForm(schema, value) }; }', "    try {\n      if (model.issues.length) return { ok: false as const };\n      return { ok: true as const, value: initializeSchemaForm(schema, value) };\n    }")
edit(form, '        authorityRevision += 1;\n        failure = null;', """        authorityRevision += 1;
        failure = null;
        validationIssues = [];
        if (schema !== identity[0] || value !== internalValue) parseIssues = [];
        internalValue = undefined;""")
edit(form, '  function readPath(path: string[]): unknown {', """  function nodeType(node: JsonSchema): string | undefined {
    return Array.isArray(node.type) ? node.type.find(type => type !== 'null') : node.type;
  }
  function choices(node: JsonSchema): JsonSchema['enum'] {
    return node.enum ?? (Object.hasOwn(node, 'const') ? [node.const ?? null] : undefined);
  }
  function pathReadonly(path: readonly string[]): boolean {
    let node: JsonSchema | undefined = schema;
    if (node.readOnly) return true;
    for (const key of path) {
      node = node && (nodeType(node) === 'array' ? node.items : node.properties?.[key]);
      if (node?.readOnly) return true;
    }
    return false;
  }
  function invalid(issues: SchemaFormIssue[]): void {
    failure = 'invalid';
    validationIssues = issues;
    try { onvalidationerror?.(issues); } catch { /* Observers do not authorize submission. */ }
  }
  function fieldInvalid(path: readonly string[]): boolean {
    return [...validationIssues, ...parseIssues].some(issue => issue.path === schemaFormPointer(path));
  }
  function writeNumber(path: string[], input: HTMLInputElement): void {
    if (!editable() || pathReadonly(path)) return;
    const pointer = schemaFormPointer(path);
    parseIssues = parseIssues.filter(issue => issue.path !== pointer);
    try {
      if (input.validity.badInput) throw new Error('Invalid numeric input');
      writePath(path, parseSchemaNumber(input.value));
    } catch {
      parseIssues = [...parseIssues, { path: pointer, code: 'invalid-value' }];
      invalid(parseIssues);
    }
  }
  function readPath(path: string[]): unknown {""")
edit(form, '    if (!editable() || !prepared.ok) return;\n    try { value = writeSchemaFormPath(prepared.value, path, nextValue); failure = null; }', """    if (!editable() || !prepared.ok || pathReadonly(path)) return;
    try {
      internalValue = writeSchemaFormPath(prepared.value, path, nextValue);
      value = internalValue;
      failure = null;
      validationIssues = [];
    }""")
edit(form, "    if (!editable() || !prepared.ok || !onsubmit) return;\n    if (formElement && !formElement.checkValidity()) { failure = 'invalid'; return; }", """    if (!editable() || !prepared.ok || !onsubmit) return;
    const problems = [...parseIssues, ...validateRecursiveSchemaForm(model, prepared.value)];
    if (problems.length) { invalid(problems); return; }
    if (formElement && !formElement.checkValidity()) { invalid([{ path: '', code: 'invalid-value' }]); return; }""")
edit(form, "    catch { failure = 'invalid'; return; }\n    const currentValue", "    catch { invalid([{ path: '', code: 'invalid-value' }]); return; }\n    const currentValue")
edit(form, '<form\n  bind:this={formElement}', '<form\n  novalidate\n  data-testid="json-schema-form"\n  bind:this={formElement}')
edit(form, '<p role="alert">{labels[!prepared.ok', '<p role="alert" data-testid="schema-form-errors">{labels[!prepared.ok')
edit(form, '    {@const current = readPath(path)}', '    {@const current = readPath(path)}\n    {@const options = choices(node)}\n    {@const type = nodeType(node)}\n    {@const fieldLocked = locked || pathReadonly(path)}')
edit(form, "    {#if node.type === 'object' || node.properties}", "    {#if type === 'object' || node.properties}")
edit(form, "    {:else if node.type === 'array'}", "    {:else if type === 'array'}")
edit(form, 'disabled={locked}', 'disabled={fieldLocked}', count=None)
# The outer fieldset and submit have no field path; keep their existing global lock.
edit(form, '<fieldset class="schema-form-fields svadmin-u-3e7ce58d64fa" disabled={fieldLocked}>', '<fieldset class="schema-form-fields svadmin-u-3e7ce58d64fa" disabled={locked}>')
edit(form, '<Button type="submit" size="sm" disabled={fieldLocked}', '<Button type="submit" size="sm" disabled={locked}')
edit(form, '{#if node.enum}', '{#if options}')
edit(form, 'schemaFormEnumIndex(node.enum, current)', 'schemaFormEnumIndex(options, current)')
edit(form, 'event.currentTarget.value, node.enum)', 'event.currentTarget.value, options)')
edit(form, '{#each node.enum as option, optionIndex', '{#each options as option, optionIndex')
edit(form, "{:else if node.type === 'boolean'}", "{:else if type === 'boolean'}")
edit(form, "{:else if node.type === 'number' || node.type === 'integer'}", "{:else if type === 'number' || type === 'integer'}")
edit(form, "step={node.type === 'integer' ? 1 : 'any'}", "step={type === 'integer' ? 1 : 'any'}")
edit(form, "oninput={(event) => writePath(path, event.currentTarget.value === '' ? undefined : Number(event.currentTarget.value))}", "oninput={(event) => writeNumber(path, event.currentTarget)}")
edit(form, 'id={id} disabled={fieldLocked}', 'id={id} name={path.join(\'.\')} aria-invalid={fieldInvalid(path)} disabled={fieldLocked}', count=None)
# Invalid schemas still expose a disabled submit button, rather than disappearing silently.
edit(form, '  <div class="svadmin-u-173fa8f06789', '  {/if}\n  <div class="svadmin-u-173fa8f06789')
edit(form, '  {/if}\n  </fieldset>', '  </fieldset>')

filter_helper = 'packages/ui/src/components/enterprise/filter-tree.ts'
edit(filter_helper, "value: unknown }\nexport interface FilterGroupNode", "value: unknown; readonly?: boolean }\nexport interface FilterGroupNode")
edit(filter_helper, "export function compileFilterTree(root: FilterGroupNode, fields: readonly FieldDefinition[]): FilterTreeCompile {", """export function compileFilterTree(root: FilterGroupNode, fields: readonly FieldDefinition[], preserved: ReadonlyMap<string, Filter> = new Map()): FilterTreeCompile {""")
edit(filter_helper, "    active.add(node);\n    try {\n      if (node.kind === 'group')", """    active.add(node);
    try {
      // Only unchanged host-owned readonly leaves and originally empty groups may bypass
      // editor capability checks. A forged readonly flag or edited payload is not sufficient.
      const original = preserved.get(node.id);
      if (original && node.kind === 'rule' && node.readonly && 'field' in original
        && node.field === original.field && node.operator === original.operator
        && JSON.stringify(node.value) === JSON.stringify(original.value)) {
        return { ...original, value: Array.isArray(original.value) ? [...original.value] : original.value };
      }
      if (original && node.kind === 'group' && !('field' in original)
        && !node.children.length && !original.value.length && node.operator === original.operator) {
        return { operator: node.operator, value: [] };
      }
      if (node.kind === 'group')""")
edit(filter_helper, "field.options.some((option) => option.value === value)", "field.options.some((option) => !option.disabled && option.value === value)")
edit(filter_helper, "  if (isNullOperator(operator)) return null;\n  if (isCollectionOperator(operator))", "  if (raw.length > 1_048_576) throw new Error('value');\n  if (isNullOperator(operator)) return null;\n  if (isCollectionOperator(operator))")
# Array.every skips holes; use a dense iterator for both input and edited collection checks.
edit(filter_helper, 'value.every(scalar)', 'Array.from(value).every(scalar)')
edit(filter_helper, 'node.value.every(validScalar)', 'Array.from(node.value).every(validScalar)')

builder = 'packages/ui/src/components/FilterBuilder.svelte'
edit(builder, '<script lang="ts">', '<script lang="ts">\n  import { untrack } from \'svelte\';')
edit(builder, '  let nextId = 0;', '  let nextId = 0;\n  let lastInputFilters: Filter[] | undefined;\n  let preserved = $state.raw<ReadonlyMap<string, Filter>>(new Map());')
edit(builder, 'compileFilterTree({ ...root, operator: logicalOperator }, fields)', 'compileFilterTree({ ...root, operator: logicalOperator }, fields, preserved)')
start = Path(builder).read_text().index('  $effect(() => {')
end = Path(builder).read_text().index('\n  function message', start)
text = Path(builder).read_text()
text = text[:start] + """  function snapshotNode(node: FilterNode): Filter {
    return node.kind === 'group' ? { operator: node.operator, value: node.children.map(snapshotNode) }
      : { field: node.field, operator: node.operator, value: Array.isArray(node.value) ? [...node.value] : node.value };
  }
  function cannotEdit(node: FilterRuleNode): boolean {
    return isCollectionOperator(node.operator) || node.value === ''
      || !compileFilterTree({ kind: 'group', id: 'probe', operator: 'and', children: [{ ...node, readonly: false }] }, fields).ok;
  }
  function remember(node: FilterNode, saved: Map<string, Filter>): void {
    saved.set(node.id, snapshotNode(node));
    if (node.kind === 'group') node.children.forEach(child => remember(child, saved));
    else node.readonly = cannotEdit(node);
  }
  function refreshReadonly(node: FilterNode): void {
    if (node.kind === 'group') { node.children.forEach(refreshReadonly); return; }
    const original = preserved.get(node.id);
    node.readonly = original !== undefined && JSON.stringify(original) === JSON.stringify(snapshotNode(node)) && cannotEdit(node);
  }
  $effect(() => {
    const metadata = availableFields;
    if (filters !== lastInputFilters) {
      lastInputFilters = filters;
      const parsed = readFilterTree(filters);
      if (parsed.ok) {
        const saved = new Map<string, Filter>();
        untrack(() => remember(parsed.root, saved));
        root = parsed.root;
        preserved = saved;
        loadIssues = [];
        if (filters.length) logicalOperator = parsed.root.operator;
      } else {
        preserved = new Map();
        loadIssues = parsed.issues;
        root = { kind: 'group', id: 'root', operator: 'and', children: [], wrapped: false };
      }
      attempted = false;
    } else {
      untrack(() => { void metadata; refreshReadonly(root); });
    }
  });
  function depthOf(target: FilterGroupNode, node: FilterGroupNode = root, depth = root.wrapped || logicalOperator === 'or' ? 1 : 0): number {
    if (node === target) return depth;
    for (const child of node.children) if (child.kind === 'group') {
      const found = depthOf(target, child, depth + 1);
      if (found >= 0) return found;
    }
    return -1;
  }
""" + text[end:]
Path(builder).write_text(text)
edit(builder, '    if (disabled || loadIssues.length || full) return;', '    if (disabled || loadIssues.length || full || depthOf(group) < 0 || depthOf(group) >= FILTER_EDITOR_LIMITS.depth) return;', count=2)
edit(builder, '  function changeField(rule: FilterRuleNode, key: string): void {', '  function changeField(rule: FilterRuleNode, key: string): void {\n    if (disabled || rule.readonly) return;')
edit(builder, '  function changeOperator(rule: FilterRuleNode, next: CrudOperator): void {', '  function changeOperator(rule: FilterRuleNode, next: CrudOperator): void {\n    if (disabled || rule.readonly) return;')
edit(builder, '  function changeValue(rule: FilterRuleNode, raw: string): void {', '  function changeValue(rule: FilterRuleNode, raw: string): void {\n    if (disabled || rule.readonly) return;')
edit(builder, '    loadIssues = [];\n    filters = [];', '    loadIssues = [];\n    preserved = new Map();\n    logicalOperator = \'and\';\n    filters = [];')
edit(builder, '    filters = compilation.filters;\n    onApply?.(compilation.filters);', '    filters = compilation.filters;\n    lastInputFilters = filters;\n    onApply?.(compilation.filters);')
edit(builder, '<fieldset class="filter-group" data-filter-group={group.id}', '<fieldset class="filter-group" data-testid={top ? \'filter-builder-root\' : \'filter-builder-group\'} data-filter-group={group.id}')
edit(builder, "          const target = event.currentTarget;\n          if (!(target instanceof HTMLSelectElement))", "          const target = event.currentTarget;\n          if (disabled || !(target instanceof HTMLSelectElement))")
edit(builder, '<div class="filter-rule" data-filter-rule={node.id}>\n          <div>', """<div class="filter-rule" data-testid="filter-builder-rule" data-filter-rule={node.id}>
          {#if node.readonly}
            <output aria-label={i18n.t('filter.readonly')}>{node.field} {node.operator} {JSON.stringify(node.value)}</output>
          {:else}
          <div>""")
edit(builder, '          <Button type="button" size="sm" variant="ghost" aria-label={chinese ? \'删除条件\'', '          {/if}\n          <Button type="button" size="sm" variant="ghost" aria-label={chinese ? \'删除条件\'')
edit(builder, '<Input id={`${uid}-${node.id}-value`} type="text"', '<Input id={`${uid}-${node.id}-value`} type={!collection && field?.type === \'number\' ? \'number\' : \'text\'} step="any"')
edit(builder, "onchange={(event: Event) => { if (event.currentTarget instanceof HTMLSelectElement) node.value = event.currentTarget.value === '' ? undefined : field.options?.[Number(event.currentTarget.value)]?.value; }}", """onchange={(event: Event) => {
                  if (disabled || node.readonly || !(event.currentTarget instanceof HTMLSelectElement)) return;
                  const raw = event.currentTarget.value;
                  if (raw === '') { node.value = undefined; return; }
                  if (!/^(0|[1-9][0-9]*)$/u.test(raw)) return;
                  const option = field.options?.[Number(raw)];
                  if (option && !option.disabled) node.value = option.value;
                }}""")
edit(builder, '<option value={String(index)}>{option.label}</option>', '<option value={String(index)} disabled={option.disabled}>{option.label}</option>')
# Read-only rows span the grid; keep native local styles, not Tailwind or new dependencies.
edit(builder, '  .filter-rule > div { min-width: 0; }', '  .filter-rule > div { min-width: 0; }\n  .filter-rule > output { grid-column: 1 / -2; overflow-wrap: anywhere; }')

component_tests = 'packages/ui/src/components/enterprise-components.test.svelte.ts'
edit(component_tests, "  it('blocks unsupported object schemas rather than stringify nested values', async () => {", "  it('preserves supported recursive objects instead of replacing them with a scalar form', async () => {")
edit(component_tests, "schema: { properties: { nested: { type: 'object', properties: {} } } }, onsubmit", "schema: { properties: { nested: { type: 'object', properties: { count: { type: 'integer', default: 2 } } } } }, onsubmit")
edit(component_tests, "    expect(onsubmit).not.toHaveBeenCalled();\n    expect(view.getByTestId('schema-form-errors')).toBeTruthy();", "    expect(onsubmit).toHaveBeenCalledWith({ nested: { count: 2 } });\n    expect(view.queryByTestId('schema-form-errors')).toBeNull();")
edit(component_tests, "  it('blocks unknown incoming fields and permits explicit reset', async () => {", "  it('preserves unknown incoming host fields read-only and permits explicit reset', async () => {")
edit(component_tests, "    expect(onApply).not.toHaveBeenCalled();\n    expect(view.getByTestId('filter-builder-errors')).toBeTruthy();", "    expect(onApply).toHaveBeenCalledWith([{ field: 'missing', operator: 'eq', value: 'x' }]);\n    expect(view.container.querySelector('output')).toBeTruthy();")
fixture = 'scripts/fixtures/enterprise-ui/App.svelte'
edit(fixture, "schema = { properties: { nested: { type: 'object', properties: {} } } }", "schema = { properties: { unsupported: { type: 'string', pattern: '.*' } } }")
# Keep the original scalar negative test: it describes the leaf kernel, not the recursive component.
edit('packages/ui/src/components/enterprise/correctness.test.ts', "it('refuses unsupported nested fields rather than stringify them'", "it('keeps the leaf-only validator explicit; recursive objects use the recursive adapter'")

Path('packages/ui/src/components/enterprise/recursive-schema-form.test.ts').write_text((ASSETS / 'recursive-schema-form.test.ts').read_text())
edit('.github/workflows/enterprise-ui.yml', 'src/components/enterprise/correctness.test.ts src/components/enterprise-components.test.svelte.ts src/components/filter-builder.test.svelte.ts', 'src/components/enterprise/correctness.test.ts src/components/enterprise/recursive-schema-form.test.ts src/components/enterprise-components.test.svelte.ts src/components/enterprise-filter-legacy.test.svelte.ts src/components/filter-builder.test.svelte.ts')
Path('docs/architecture/enterprise-ui-reconciliation.md').write_text('''# Enterprise UI reconciliation\n\nThe original scalar-only replacement is not used. JsonSchemaForm keeps main\'s recursive object/array renderer, missing-key defaults, typed enum values, scoped locale/idPrefix, detached bounded snapshots, native disabled controls, synchronous submit lock, and stale callback ownership. A bounded recursive adapter reuses the reviewed scalar assertion kernel and rejects unsupported assertions instead of silently ignoring them. Server TypeBox validation and authorization are still required.\n\nThe filter editor preserves immutable incoming unsupported/unknown-field conditions and originally empty groups for a lossless host round trip. Metadata arrival restores supported editing. Only unchanged captured host nodes can use this path: setting a readonly flag on a new or modified node does not bypass strict compilation. Edited/new invalid conditions fail as a complete query. Existing main regressions are retained beside the old branch\'s tests.\n\nThe bounded spreadsheet parser, deterministic error codes, current-event formula bar, readonly guards, precise CSV values and dangerous text-prefix neutralization are retained. This is not a full spreadsheet engine. No new dependency, backend writes, released-version change, deployment or permission relaxation is included.\n\nOriginal scalar-component rejection of nested objects and rejection of all unknown incoming fields were incompatible with main; the two interaction tests now assert successful recursive and lossless behavior. The separate leaf-kernel negative test remains valid for that internal helper. Current exact-head CI and new browser evidence are required; old artifacts are historical only.\n''')
for name in ['docs/evaluations/enterprise-ui-correctness.md', 'docs/evaluations/enterprise-ui-plan.md']:
    p = Path(name)
    p.write_text('> Integration update: recursive form and preserved-host-filter contracts supersede the original scalar-only scope below. See `../architecture/enterprise-ui-reconciliation.md`. Original validation counts are historical, not current-head approval.\n\n' + p.read_text())
print(git('diff', '--stat'))
subprocess.run(['git', 'diff', '--check'], check=True)
