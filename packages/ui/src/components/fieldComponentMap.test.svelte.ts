import type { Component } from 'svelte';
import { Type, type TNumber, type TUnknown } from '@sinclair/typebox';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { render } from '@testing-library/svelte';
import {
  builtinDisplayComponents, getDisplayComponent, hasDisplayComponent, registerDisplayComponent,
  type FieldDisplayProps,
} from './fieldComponentMap';
import TextField from './fields/TextField.svelte';
import NumberField from './fields/NumberField.svelte';
import JsonField from './fields/JsonField.svelte';
import CodeField from './fields/CodeField.svelte';
import FieldDisplay from './FieldDisplay.svelte';
import { formatJsonValue } from './fields/json-value';

function required(fieldType: string): Component<FieldDisplayProps> {
  const component = getDisplayComponent(fieldType);
  if (!component) throw new Error(`Missing display: ${fieldType}`);
  return component;
}

describe('validated field displays', () => {
  it.each([
    ['text', { unexpected: 'private text' }],
    ['boolean', 'false'],
    ['number', '42'],
    ['number', Number.NaN],
    ['currency', Number.POSITIVE_INFINITY],
    ['percent', {}],
    ['rating', '5'],
    ['image', ['one.png']],
    ['images', 'one.png'],
    ['images', ['one.png', 42]],
    ['tags', [1, 2]],
    ['select', {}],
    ['multiselect', 'one'],
    ['relation', {}],
    ['date', {}],
    ['date', new Date(Number.NaN)],
    ['daterange', ['2026-01-01']],
    ['daterange', { start: undefined }],
    ['daterange', { start: '2026-01-01', unexpected: true }],
    ['json', { invalid: undefined }],
    ['code', { invalid: () => undefined }],
    ['avatar', 42],
    ['email', {}],
    ['url', {}],
    ['richtext', {}],
    ['file', {}],
    ['markdown', {}],
  ])('rejects malformed %s values before rendering', (fieldType, value) => {
    const view = render(required(fieldType), { value });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    expect(view.container.textContent).not.toContain('private text');
    expect(view.container.querySelector('img, a, pre')).toBeNull();
  });

  it('revalidates reactive values and recovers without remounting the host', async () => {
    const view = render(required('text'), { value: 'first' });
    expect(view.container.textContent).toBe('first');
    await view.rerender({ value: 'second' });
    expect(view.container.textContent).toBe('second');
    await view.rerender({ value: { private: 'secret' } });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    await view.rerender({ value: 'recovered' });
    expect(view.container.textContent).toBe('recovered');
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).toBeNull();
  });

  it('projects avatar sources and renders every image in a collection', () => {
    const avatar = render(required('avatar'), { value: '/avatar.png' });
    expect(avatar.container.querySelector('img')?.getAttribute('src')).toBe('/avatar.png');
    const images = render(required('images'), { value: ['/one.png', '/two.png'] });
    expect([...images.container.querySelectorAll('img')].map(image => image.getAttribute('src')))
      .toEqual(['/one.png', '/two.png']);
  });

  it('forwards choices only to choice fields and responds to option updates', async () => {
    const select = render(required('select'), { value: 1, options: [{ value: 1, label: 'First' }] });
    expect(select.container.textContent).toBe('First');
    await select.rerender({ value: 1, options: [{ value: 1, label: 'Updated' }] });
    expect(select.container.textContent).toBe('Updated');
    const number = render(required('number'), { value: 1234, options: [{ value: 1, label: 'Ignored' }] });
    expect(number.container.textContent).toBe('1,234');
  });

  it('projects supported option metadata without forwarding unrelated component props', () => {
    const options = [{ value: 'active', label: 'Active', disabled: true, children: [{ arbitrary: true }] }];
    const view = render(required('select'), { value: 'active', options });
    expect(view.container.textContent).toBe('Active');
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).toBeNull();
  });

  it.each(['tree-select', 'treeselect', 'cascader', 'transfer'])('renders validated %s choices', fieldType => {
    const view = render(required(fieldType), { value: ['one', 2], options: [{ value: 'one', label: 'First' }] });
    expect(view.container.textContent).toContain('First');
    expect(view.container.textContent).toContain('2');
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).toBeNull();
  });

  it('handles remaining builtin fields without exposing passwords', () => {
    const password = render(required('password'), { value: 'private-password' });
    expect(password.container.textContent).toBe('********');
    expect(password.container.innerHTML).not.toContain('private-password');
    const color = render(required('color'), { value: 'red' });
    expect(color.container.textContent).toBe('red');
    const array = render(required('array'), { value: [{ id: 1 }] });
    expect(array.container.querySelector('code')?.textContent).toBe('[{"id":1}]');
    expect(required('rate')).toBe(required('rating'));
  });

  it('supports empty values and valid date ranges', () => {
    const empty = render(required('text'), { value: null });
    expect(empty.container.textContent).toBe('—');
    const range = render(required('daterange'), { value: { start: '2026-01-01', end: '2026-01-02' } });
    expect(range.container.textContent).toContain('2026');
    expect(range.container.querySelector('[data-svadmin-invalid-field]')).toBeNull();
  });

  it('does not resolve prototype names and prevents mutation of builtin definitions', () => {
    for (const name of ['constructor', 'toString', '__proto__', 'unknown-field']) {
      expect(hasDisplayComponent(name)).toBe(false);
      expect(getDisplayComponent(name)).toBeUndefined();
    }
    expect(Object.isFrozen(builtinDisplayComponents)).toBe(true);
  });

  it('binds custom values to a snapshotted schema', async () => {
    const schema = Type.String({ minLength: 3 });
    registerDisplayComponent('contract-test-label', schema, TextField);
    schema.minLength = 0;
    const view = render(required('contract-test-label'), { value: 'valid' });
    expect(view.container.textContent).toBe('valid');
    await view.rerender({ value: 'x' });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    await view.rerender({ value: 123 });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    expect(() => registerDisplayComponent('', Type.Number(), NumberField)).toThrow('field type');
  });

  it('keeps renderer props tied to the schema instead of caller-selected types', () => {
    type NumericRenderer = Parameters<typeof registerDisplayComponent<TNumber>>[2];
    expectTypeOf<NumericRenderer>().toEqualTypeOf<Component<{ value: number }>>();
    expectTypeOf<typeof NumberField>().toExtend<NumericRenderer>();
    expectTypeOf<typeof TextField>().not.toExtend<NumericRenderer>();
    expectTypeOf<Parameters<typeof registerDisplayComponent<TUnknown>>[1]>().toBeNever();
  });

  it('does not bypass custom schema checks for absent values in detail views', async () => {
    registerDisplayComponent('required-label-test', Type.String(), TextField);
    const view = render(FieldDisplay, { type: 'required-label-test', value: null });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    await view.rerender({ type: 'required-label-test', value: undefined });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    await view.rerender({ type: 'required-label-test', value: 'present' });
    expect(view.container.textContent).toBe('present');
    await view.rerender({ type: 'text', value: null });
    expect(view.container.textContent).toBe('—');
  });

  it('fails closed for unregistered field types without stringifying unknown data', () => {
    const view = render(FieldDisplay, {
      type: 'unregistered-detail-test',
      value: { toString: null, secret: 'private-data' },
    });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    expect(view.container.textContent).not.toContain('private-data');
  });
});

describe('JSON display boundary', () => {
  it.each([() => undefined, Symbol('private'), 1n, Number.NaN, new Date(), { item: undefined }])(
    'rejects non-JSON data without crashing direct JsonField consumers',
    value => {
      expect(formatJsonValue(value).status).toBe('invalid');
      const view = render(JsonField, { value });
      expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    },
  );

  it('rejects circular data and throwing accessors without exposing the input', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    for (const value of [circular, { get secret() { throw new Error('private'); } }]) {
      const view = render(required('json'), { value });
      expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
      expect(view.container.textContent).not.toContain('private');
      expect(formatJsonValue(value).status).toBe('invalid');
    }
  });

  it('renders valid nested JSON and recovers from invalid data', async () => {
    const view = render(JsonField, { value: { enabled: true, values: [1, null, 'two'] } });
    expect(view.container.querySelector('code')?.textContent).toBe('{"enabled":true,"values":[1,null,"two"]}');
    await view.rerender({ value: 1n });
    expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
    await view.rerender({ value: [1, 2] });
    expect(view.container.querySelector('code')?.textContent).toBe('[1,2]');
  });

  it('rejects invalid direct CodeField values without a second unsafe conversion', () => {
    const circular: Record<string, unknown> = { toString: null };
    circular['self'] = circular;
    for (const value of [circular, { invalid: () => undefined }, { get secret() { throw new Error('private'); } }]) {
      const view = render(CodeField, { value });
      expect(view.container.querySelector('[data-svadmin-invalid-field]')).not.toBeNull();
      expect(view.container.querySelector('pre, button')).toBeNull();
      expect(view.container.textContent).not.toContain('private');
    }
  });
});
