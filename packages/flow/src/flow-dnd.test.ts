import { describe, expect, it, vi } from 'vitest';
import { parsePaletteRecord } from './palette-schema.js';
import {
  decodeFlowPaletteItem,
  encodeFlowPaletteItem,
  FLOW_PALETTE_MIME_TYPE,
  readFlowPaletteItem,
} from './flow-dnd.js';

const template = {
  id: 'review',
  type: 'default',
  label: 'Review',
  description: 'A manual review step',
  data: { kind: 'review' },
};

describe('flow palette drag data', () => {
  it('round-trips a serializable palette template', () => {
    expect(decodeFlowPaletteItem(encodeFlowPaletteItem(template))).toEqual(template);
  });

  it('rejects malformed and incomplete drag payloads', () => {
    expect(decodeFlowPaletteItem('{')).toBeNull();
    expect(decodeFlowPaletteItem(JSON.stringify({ id: 'review', type: 'default', label: 'Review' }))).toBeNull();
    expect(decodeFlowPaletteItem(JSON.stringify({ id: 'review', type: 'default', label: 'Review', data: [] }))).toBeNull();
  });

  it('reads only the package-specific browser drag MIME type', () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData(FLOW_PALETTE_MIME_TYPE, encodeFlowPaletteItem(template));

    expect(readFlowPaletteItem(dataTransfer)).toEqual(template);
    const unrelatedTransfer = new DataTransfer();
    unrelatedTransfer.setData('text/plain', encodeFlowPaletteItem(template));
    expect(readFlowPaletteItem(unrelatedTransfer)).toBeNull();
  });

  it.each([
    null,
    undefined,
    [],
    { ...template, unexpected: true },
    { ...template, description: undefined },
    { ...template, disabled: 'false' },
    { ...template, data: { value: undefined } },
    { ...template, data: { value: () => 'hidden' } },
    { ...template, data: { value: Symbol('hidden') } },
    { ...template, data: { value: 1n } },
    { ...template, data: { value: Infinity } },
    { ...template, data: { value: NaN } },
    { ...template, data: { value: new Date() } },
    { ...template, data: { value: new Map() } },
    { ...template, data: { value: Array(2) } },
  ])('rejects non-JSON or invalid palette input %#', input => {
    expect(() => encodeFlowPaletteItem(input)).toThrow('Invalid flow palette item');
  });

  it('does not execute getters or serialization hooks', () => {
    const getter = vi.fn(() => 'changed');
    const toJSON = vi.fn(() => template);
    const accessor = { ...template };
    Object.defineProperty(accessor, 'label', { enumerable: true, get: getter });

    expect(() => encodeFlowPaletteItem(accessor)).toThrow(TypeError);
    expect(() => encodeFlowPaletteItem({ ...template, toJSON })).toThrow(TypeError);
    expect(getter).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
  });

  it('rejects circular data, hidden properties, symbol keys, and extra array properties', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const hidden = { ...template };
    Object.defineProperty(hidden, 'label', { value: 'hidden', enumerable: false });
    const extendedArray = Object.assign([1], { extra: true });

    for (const input of [
      { ...template, data: circular },
      hidden,
      { ...template, [Symbol('hidden')]: true },
      { ...template, data: { extendedArray } },
    ]) expect(() => encodeFlowPaletteItem(input)).toThrow(TypeError);
  });

  it('snapshots shared values without treating repeated references as cycles', () => {
    const shared = { count: 1 };
    const parsed = parsePaletteRecord({
      ...template,
      data: { left: shared, right: shared, values: [null, true, 4.5, 'text'] },
    });
    shared.count = 2;

    expect(parsed?.data).toEqual({
      left: { count: 1 },
      right: { count: 1 },
      values: [null, true, 4.5, 'text'],
    });
  });

  it('rejects invalid wire values without coercion or extra properties', () => {
    expect(decodeFlowPaletteItem(JSON.stringify({ ...template, extra: true }))).toBeNull();
    expect(decodeFlowPaletteItem(JSON.stringify({ ...template, disabled: 0 }))).toBeNull();
    expect(decodeFlowPaletteItem(
      '{"id":"review","type":"default","label":"Review","data":{"value":1e400}}',
    )).toBeNull();
  });

  it('preserves prototype-named JSON keys without changing the record prototype', () => {
    const parsed = decodeFlowPaletteItem(
      '{"id":"review","type":"default","label":"Review","data":{"__proto__":{"allowed":true}}}',
    );
    expect(parsed?.data['__proto__']).toEqual({ allowed: true });
    expect(Object.getPrototypeOf(parsed?.data)).toBe(Object.prototype);
    expect(parsed?.data['allowed']).toBeUndefined();
  });
});
