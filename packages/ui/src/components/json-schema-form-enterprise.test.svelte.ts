import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/svelte';
import JsonSchemaForm from './JsonSchemaForm.svelte';
import LiteJsonSchemaForm from '../../../lite/src/components/LiteJsonSchemaForm.svelte';
import { decodeSchemaFormArrayAction, decodeSchemaFormData, decodeSchemaFormSubmission, encodeSchemaFormArrayAction, schemaFormActionName, schemaFormFieldName, type SchemaFormSchema } from '../../../lite/src/schema-form-data';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { svelte2tsx } from 'svelte2tsx';
import ts from 'typescript';
import { prepareSchemaFormValue, assertSchemaFormSchema } from '@svadmin/core/schema-form';

const schema = {
  properties: {
    role: { enum: [2, '2'], default: 2 },
    quota: { type: 'number', default: 10 },
    profile: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        code: { type: 'string', default: 'A' },
      },
    },
    tags: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string', default: 'new' },
      rank: { type: 'integer', default: 1 },
    } }, default: [{ name: 'first', rank: 2 }] },
  },
} satisfies SchemaFormSchema;

describe('JSON Schema forms enterprise value contract', () => {
  const conditional: SchemaFormSchema = {
    properties: {
      details: {
        type: 'object', visibleWhen: { path: ['mode'], equals: 'advanced' },
        properties: { name: { type: 'string', minLength: 3 } }, required: ['name'],
      },
      mode: { enum: ['basic', 'advanced'], default: 'basic' },
    },
    required: ['details'],
  };

  it('hides groups, omits hidden drafts and restores them when the condition matches again', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema: conditional, value: { mode: 'advanced', details: { name: 'saved' } }, onsubmit });
    expect(view.getByLabelText(/name/)).toBeTruthy();
    await fireEvent.change(view.getByRole('combobox'), { target: { value: '__json_enum_0' } });
    expect(view.queryByLabelText(/name/)).toBeNull();
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit).toHaveBeenLastCalledWith({ mode: 'basic' });
    await fireEvent.change(view.getByRole('combobox'), { target: { value: '__json_enum_1' } });
    expect((view.getByLabelText(/name/) as HTMLInputElement).value).toBe('saved');
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit).toHaveBeenLastCalledWith({ mode: 'advanced', details: { name: 'saved' } });
  });

  it('blocks invalid visible fields, associates errors and focuses the first invalid control', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema: conditional, value: { mode: 'advanced', details: { name: 'x' } }, onsubmit });
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit).not.toHaveBeenCalled();
    const input = view.getByLabelText(/name/);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')).not.toBeNull();
    expect(document.activeElement).toBe(input);
    await fireEvent.input(input, { target: { value: 'valid' } });
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit).toHaveBeenCalledExactlyOnceWith({ mode: 'advanced', details: { name: 'valid' } });
  });

  it.each(['basic', 'advanced'])('decodes conditional native groups independent of controller order: %s', mode => {
    const view = render(LiteJsonSchemaForm, { schema: conditional, value: { mode, details: { name: 'valid' } } });
    const data = new FormData(view.container.querySelector('form')!);
    expect(decodeSchemaFormData(conditional, data)).toEqual(mode === 'basic'
      ? { mode } : { mode, details: { name: 'valid' } });
    if (mode === 'basic') {
      data.set(schemaFormFieldName(['details', 'name']), 'tampered');
      expect(() => decodeSchemaFormData(conditional, data)).toThrow();
    } else {
      data.delete(schemaFormFieldName(['details', 'name']));
      expect(() => decodeSchemaFormData(conditional, data)).toThrow();
    }
  });

  it.each([
    ['number', { type: 'number', minimum: 2 }, 1],
    ['wrong type', { type: 'number' }, '12'],
    ['fractional integer', { type: 'integer' }, 1.5],
    ['non-finite', { type: 'number' }, Infinity],
    ['array count', { type: 'array', minItems: 2, items: { type: 'string' } }, ['one']],
    ['null boolean', { type: 'boolean' }, null],
    ['required missing', { type: 'string' }, undefined],
    ['typed enum', { enum: [2] }, '2'],
  ] satisfies [string, SchemaFormSchema, unknown][])('rejects %s through the shared validator', (_label, field, value) => {
    const result = prepareSchemaFormValue({ properties: { field }, required: ['field'] }, { field: value });
    expect(result.errors[0]?.path).toBe('["field"]');
  });

  it('accepts false, zero, nullable enums and optional explicit undefined without coercion', () => {
    const result = prepareSchemaFormValue({ properties: {
      enabled: { type: 'boolean' }, count: { type: 'number' },
      choice: { enum: [null, 'null'] }, missing: { type: 'number' },
    }, required: ['enabled', 'count', 'choice'] }, { enabled: false, count: 0, choice: null, missing: undefined });
    expect(result.errors).toEqual([]);
    expect(result.data).toEqual({ enabled: false, count: 0, choice: null, missing: undefined });
  });

  it('rejects unsupported schema keywords, cycles and conditional controller chains', () => {
    const unsupported = { properties: { field: { type: 'string', format: 'email' } } };
    expect(() => assertSchemaFormSchema(unsupported)).toThrow();
    const cycle: SchemaFormSchema = { type: 'object' };
    cycle.properties = { cycle };
    expect(() => assertSchemaFormSchema(cycle)).toThrow();
    expect(() => assertSchemaFormSchema({ properties: {
      a: { type: 'boolean' },
      b: { type: 'boolean', visibleWhen: { path: ['a'], equals: true } },
      c: { type: 'string', visibleWhen: { path: ['b'], equals: true } },
    } })).toThrow();
    expect(() => assertSchemaFormSchema({ properties: {
      rows: { type: 'array', items: { type: 'string', visibleWhen: { path: ['a'], exists: true } } },
      a: { type: 'boolean' },
    } })).toThrow();
  });

  it('initializes and submits null fields as null in both form implementations', async () => {
    const nullSchema: SchemaFormSchema = { properties: { marker: { type: 'null' } }, required: ['marker'] };
    const onsubmit = vi.fn();
    const spa = render(JsonSchemaForm, { schema: nullSchema, onsubmit });
    const lite = render(LiteJsonSchemaForm, { schema: nullSchema });
    expect((spa.container.querySelector('input') as HTMLInputElement).value).toBe('null');
    await fireEvent.submit(spa.container.querySelector('form')!);
    expect(onsubmit).toHaveBeenCalledExactlyOnceWith({ marker: null });
    expect(decodeSchemaFormData(nullSchema, new FormData(lite.container.querySelector('form')!))).toEqual({ marker: null });
  });

  it.each([null, undefined, [], { properties: { rows: { type: 'array', items: null } } }])(
    'rejects malformed runtime schemas with the configuration error',
    candidate => {
      expect(() => Reflect.apply(assertSchemaFormSchema, undefined, [candidate]))
        .toThrow('Invalid schema form configuration.');
    },
  );

  it('strictly compiles the form surfaces, decoder and focused tests', () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const lite = resolve(directory, '../../../lite/src');
    const components = [resolve(directory, 'JsonSchemaForm.svelte'), resolve(lite, 'components/LiteJsonSchemaForm.svelte')];
    const virtual = new Map(components.map(filename =>
      [`${filename}.tsx`, svelte2tsx(readFileSync(filename, 'utf8'), { filename, isTsFile: true, mode: 'ts' }).code]));
    const options: ts.CompilerOptions = {
      noEmit: true, strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
      noPropertyAccessFromIndexSignature: true, skipLibCheck: true,
      target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      types: ['svelte', 'node'], jsx: ts.JsxEmit.Preserve, allowImportingTsExtensions: true,
    };
    const host = ts.createCompilerHost(options);
    const read = host.readFile;
    const exists = host.fileExists;
    host.readFile = file => virtual.get(file) ?? read(file);
    host.fileExists = file => virtual.has(file) || exists(file);
    host.resolveModuleNames = (names, from) => names.map(name => {
      const file = resolve(dirname(from), `${name}.tsx`);
      return virtual.has(file) ? { resolvedFileName: file, extension: ts.Extension.Tsx }
        : ts.resolveModuleName(name, from, options, host).resolvedModule;
    });
    const targets = [...virtual.keys(), fileURLToPath(import.meta.url),
      resolve(lite, 'schema-form-data.ts'), resolve(lite, 'schema-form-data.test.svelte.ts')];
    const program = ts.createProgram([...targets,
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-shims-v4.d.ts'),
      resolve(directory, '../../../../node_modules/svelte2tsx/svelte-jsx-v4.d.ts')], options, host);
    const diagnostics = targets.flatMap(file => {
      const source = program.getSourceFile(file);
      if (!source) throw new Error(`Missing ${file}`);
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)];
    });
    expect(diagnostics.map(diagnostic =>
      `${diagnostic.file?.fileName}:${diagnostic.start}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
    )).toEqual([]);
  }, 30_000);

  it('submits recursive defaults, preserves explicit undefined, and distinguishes numeric/string enums', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, {
      schema,
      value: { role: '2', quota: undefined, profile: { enabled: false }, tags: [] },
      onsubmit,
    });
    const role = view.getByRole('combobox');
    expect((role as HTMLSelectElement).value).toContain('__json_enum_1');
    expect((view.getByLabelText('quota') as HTMLInputElement).value).toBe('');
    await fireEvent.change(role, { target: { value: '__json_enum_0' } });
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit).toHaveBeenCalledExactlyOnceWith({
      role: 2,
      quota: undefined,
      profile: { enabled: false, code: 'A' },
      tags: [],
    });
  });

  it('adds and removes nested array objects without losing typed defaults', async () => {
    const value = { tags: [] as unknown[] };
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, value, onsubmit });
    await fireEvent.click(view.getByRole('button', { name: /添加项目/ }));
    expect((view.getByLabelText('name') as HTMLInputElement).value).toBe('new');
    expect((view.getByLabelText('rank') as HTMLInputElement).value).toBe('1');
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit.mock.calls[0]?.[0]?.tags).toEqual([{ name: 'new', rank: 1 }]);
    await fireEvent.click(view.getByRole('button', { name: /删除/ }));
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit.mock.calls[1]?.[0]?.tags).toEqual([]);
    expect(value.tags).toEqual([]);
  });

  it('enforces array minItems and maxItems in the interactive form', async () => {
    const bounded: SchemaFormSchema = {
      properties: {
        rows: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string' }, default: ['first'] },
      },
    };
    const view = render(JsonSchemaForm, { schema: bounded });
    const add = view.getByRole('button', { name: /添加项目/ });
    const remove = view.getByRole('button', { name: /删除/ });
    expect((remove as HTMLButtonElement).disabled).toBe(true);
    expect((add as HTMLButtonElement).disabled).toBe(false);
    await fireEvent.click(add);
    expect((add as HTMLButtonElement).disabled).toBe(true);
    expect(view.getAllByRole('button', { name: /删除/ })).toHaveLength(2);
    for (const button of view.getAllByRole('button', { name: /删除/ })) {
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }
  });

  it('enforces array minItems and maxItems in the Lite native form', async () => {
    const bounded: SchemaFormSchema = {
      properties: {
        rows: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string' }, default: ['first'] },
      },
    };
    const view = render(LiteJsonSchemaForm, { schema: bounded });
    const add = view.getByRole('button', { name: 'Add item' });
    const remove = view.getByRole('button', { name: 'Remove' });
    expect((remove as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(add);
    expect((add as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps a cleared default numeric field empty after another field is edited', async () => {
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema, onsubmit });
    await fireEvent.input(view.getByLabelText('quota'), { target: { value: '' } });
    await fireEvent.input(view.getByLabelText('code'), { target: { value: 'Changed' } });
    expect((view.getByLabelText('quota') as HTMLInputElement).value).toBe('');
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit.mock.calls[0]?.[0]?.quota).toBeUndefined();
    expect(onsubmit.mock.calls[0]?.[0]?.profile.code).toBe('Changed');
  });

  it.each([null, 'null', false, 'false', ''] as const)('preserves the enum value %j when actually selected', async selected => {
    const choices = [null, 'null', false, 'false', ''];
    const onsubmit = vi.fn();
    const view = render(JsonSchemaForm, { schema: { properties: { choice: { enum: choices } } }, onsubmit });
    await fireEvent.change(view.getByRole('combobox'), { target: { value: `__json_enum_${choices.indexOf(selected)}` } });
    await fireEvent.submit(view.container.querySelector('form')!);
    expect(onsubmit).toHaveBeenCalledExactlyOnceWith({ choice: selected });
  });

  it('uses distinct IDs for repeated instances and structurally distinct field paths', () => {
    const fields = { properties: {
      a_b: { type: 'string', title: 'Flat' },
      a: { type: 'object', properties: { b: { type: 'string', title: 'Nested' } } },
    } };
    const first = render(JsonSchemaForm, { schema: fields });
    const second = render(JsonSchemaForm, { schema: fields });
    const ids = [...first.container.querySelectorAll('input'), ...second.container.querySelectorAll('input')].map(input => input.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it('serializes Lite paths and decodes the same values on the server', () => {
    const view = render(LiteJsonSchemaForm, { schema, action: '/save' });
    const form = view.container.querySelector('form');
    if (!form) throw new Error('Expected form');
    const data = new FormData(form);
    expect(data.getAll(schemaFormFieldName(['profile', 'enabled']))).toEqual(['false', 'true']);
    expect(data.get(schemaFormFieldName(['tags', '0', 'rank']))).toBe('2');
    expect(decodeSchemaFormData(schema, data)).toEqual({
      role: 2,
      quota: 10,
      profile: { enabled: true, code: 'A' },
      tags: [{ name: 'first', rank: 2 }],
    });
  });

  it('exposes validated no-JavaScript array actions without weakening data decoding', () => {
    const add = new FormData();
    add.set(schemaFormActionName, encodeSchemaFormArrayAction({ type: 'add', path: ['tags'] }));
    expect(decodeSchemaFormArrayAction(add)).toEqual({ type: 'add', path: ['tags'] });
    expect(() => decodeSchemaFormData(schema, add)).toThrow();

    const native = render(LiteJsonSchemaForm, { schema, value: {
      role: 2, quota: 10, profile: { enabled: true, code: 'A' }, tags: [{ name: 'first', rank: 2 }],
    } });
    const remove = new FormData(native.container.querySelector('form')!);
    remove.set(schemaFormActionName, encodeSchemaFormArrayAction({ type: 'remove', path: ['tags'], index: 0 }));
    expect(decodeSchemaFormArrayAction(remove)).toEqual({ type: 'remove', path: ['tags'], index: 0 });
    expect(() => decodeSchemaFormData(schema, remove)).toThrow();
    expect(decodeSchemaFormSubmission(schema, remove)).toEqual({ kind: 'draft', data: {
      role: 2, quota: 10, profile: { enabled: true, code: 'A' }, tags: [],
    } });
    const invalid = new FormData();
    invalid.set(schemaFormActionName, '{"type":"remove","path":["tags"],"index":-1}');
    expect(() => decodeSchemaFormArrayAction(invalid)).toThrow();
  });

  it('returns an editable draft for native add and reserves final validation for submit', () => {
    const definition: SchemaFormSchema = { properties: {
      rows: { type: 'array', maxItems: 1, items: { type: 'object', properties: {
        title: { type: 'string', minLength: 1 },
      }, required: ['title'] } },
    } };
    const view = render(LiteJsonSchemaForm, { schema: definition, action: '/edit', value: { rows: [] } });
    const button = view.getByRole('button', { name: 'Add item' }) as HTMLButtonElement;
    expect(button.type).toBe('submit');
    expect(button.formNoValidate).toBe(true);
    const form = new FormData(view.container.querySelector('form')!);
    form.set(button.name, button.value);
    form.set('csrf', 'test-token');
    const result = decodeSchemaFormSubmission(definition, form);
    expect(result).toEqual({ kind: 'draft', data: { rows: [{ title: '' }] } });
    const next = render(LiteJsonSchemaForm, { schema: definition, value: result.data });
    const final = new FormData(next.container.querySelector('form')!);
    expect(() => decodeSchemaFormSubmission(definition, final)).toThrow();
    final.set(schemaFormFieldName(['rows', '0', 'title']), 'ready');
    expect(decodeSchemaFormSubmission(definition, final).kind).toBe('submit');
    final.set(schemaFormActionName, button.value);
    expect(() => decodeSchemaFormSubmission(definition, final)).toThrow();
  });

  it.each([
    { type: 'remove', path: ['tags'], index: 4 },
    { type: 'add', path: ['missing'] },
    { type: 'add', path: ['profile', 'code'] },
    { type: 'add', path: ['__proto__'] },
  ])('rejects invalid native action target %j', action => {
    const view = render(LiteJsonSchemaForm, { schema });
    const form = new FormData(view.container.querySelector('form')!);
    form.set(schemaFormActionName, JSON.stringify(action));
    expect(() => decodeSchemaFormSubmission(schema, form)).toThrow();
  });

  it('rejects removals below minItems and duplicate action fields', () => {
    const bounded: SchemaFormSchema = { properties: {
      rows: { type: 'array', minItems: 1, items: { type: 'string' } },
    } };
    const view = render(LiteJsonSchemaForm, { schema: bounded, value: { rows: ['one'] } });
    const form = new FormData(view.container.querySelector('form')!);
    const action = encodeSchemaFormArrayAction({ type: 'remove', path: ['rows'], index: 0 });
    form.set(schemaFormActionName, action);
    expect(() => decodeSchemaFormSubmission(bounded, form)).toThrow();
    form.append(schemaFormActionName, action);
    expect(() => decodeSchemaFormArrayAction(form)).toThrow();
  });

  it('rejects duplicate fields, unknown schema paths and malformed scalar values', () => {
    const base = new FormData();
    base.set(schemaFormFieldName(['role']), '__json_enum_0');
    base.set(schemaFormFieldName(['quota']), '10');
    base.set(schemaFormFieldName(['profile', 'enabled']), 'false');
    base.set(schemaFormFieldName(['profile', 'code']), 'A');
    base.set('length:["tags"]', '0');
    expect(() => decodeSchemaFormData(schema, base)).not.toThrow();
    base.append(schemaFormFieldName(['role']), '__json_enum_1');
    expect(() => decodeSchemaFormData(schema, base)).toThrow();
    base.set(schemaFormFieldName(['role']), '__json_enum_0');
    base.set(schemaFormFieldName(['private']), 'secret');
    expect(() => decodeSchemaFormData(schema, base)).toThrow();
    base.delete(schemaFormFieldName(['private']));
    base.set(schemaFormFieldName(['quota']), 'Infinity');
    expect(() => decodeSchemaFormData(schema, base)).toThrow();
  });

  it('round-trips native paths containing brackets and reserved object keys without prototype changes', () => {
    const trusted: SchemaFormSchema = { properties: {
      ['__proto__']: { type: 'string', default: 'literal' },
      'a][b': { type: 'string', default: 'flat' },
      a: { type: 'object', properties: { b: { type: 'string', default: 'nested' } } },
    } };
    const view = render(LiteJsonSchemaForm, { schema: trusted });
    const decoded = decodeSchemaFormData(trusted, new FormData(view.container.querySelector('form')!));
    expect(Object.getPrototypeOf(decoded)).toBe(Object.prototype);
    expect(Object.hasOwn(decoded, '__proto__')).toBe(true);
    expect(decoded['__proto__']).toBe('literal');
    expect(decoded['a][b']).toBe('flat');
    expect(decoded['a']).toEqual({ b: 'nested' });
  });
});
