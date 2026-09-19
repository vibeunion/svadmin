import { describe, expect, it } from 'vitest';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { createSurfaceCatalogManifest } from '../agent-contract.js';
import { defaultSurfaceDefinitions } from '../builtin-definitions.js';
import { createInteractiveSurfaceDefinitions, withSurfaceAppearance, withoutSurfaceAppearance } from './catalog.js';
import { defineSurfaceAction, validateSurfaceActionDescriptor } from './action-contracts.js';
const action = { id: 'contacts.create', version: 'v1', label: 'Create contact', approval: 'four-eyes' as const,
  inputSchema: Type.Object({ profile: Type.Object({ name: Type.String() }, { additionalProperties: false }) }, { additionalProperties: false }) };

describe('one catalog for forms, appearance, generation and validation', () => {
  it('adds finite frame variants to every registered widget without changing the default catalog', () => {
    const catalog = withSurfaceAppearance(defaultSurfaceDefinitions);
    for (const widget of catalog.widgets) {
      const base = defaultSurfaceDefinitions.widgets.find((w) => w.type === widget.type);
      if (!base) throw new Error('Missing default definition');
      const props = widget.type === 'metric' ? { label: 'Count', format: 'number' }
        : widget.type === 'resource-table' ? { title: 'Records', columns: [{ field: 'id', label: 'ID' }] }
        : { title: 'Chart', labelField: 'name', valueField: 'value' };
      for (const tone of ['neutral', 'success', 'warning', 'danger', 'info']) for (const density of ['compact', 'comfortable']) {
        expect(Value.Check(widget.propsSchema, { ...props, appearance: { tone, density } })).toBe(true);
      }
      expect(Value.Check(base.propsSchema, { ...props, appearance: { tone: 'info' } })).toBe(false);
      expect(Value.Check(widget.propsSchema, { ...props, appearance: { tone: '#ff0000' } })).toBe(false);
      expect(Value.Check(widget.propsSchema, { ...props, appearance: { class: 'custom' } })).toBe(false);
    }
  });
  it('retains field policy selectors but does not pass frame props to components', () => {
    const catalog = withSurfaceAppearance(defaultSurfaceDefinitions);
    const props = { title: 'Table', columns: [{ field: 'name', label: 'Name' }], appearance: { density: 'compact' } };
    expect(catalog.widgets.find((w) => w.type === 'resource-table')?.getReferencedFields?.(props)).toEqual(['name']);
    expect(withoutSurfaceAppearance(props)).toEqual({ title: 'Table', columns: props.columns });
  });
  it('describes actual registered actions without exposing handlers or allowing model schemas', () => {
    const catalog = createInteractiveSurfaceDefinitions([action], defaultSurfaceDefinitions);
    const form = catalog.widgets.find((w) => w.type === 'resource-form');
    if (!form) throw new Error('Missing form definition');
    expect(Value.Check(form.propsSchema, { actionId: action.id, appearance: { tone: 'info' } })).toBe(true);
    expect(Value.Check(form.propsSchema, { actionId: 'admin.delete' })).toBe(false);
    expect(Value.Check(form.propsSchema, { actionId: action.id, inputSchema: {} })).toBe(false);
    const manifest = JSON.stringify(createSurfaceCatalogManifest(catalog));
    expect(manifest).toContain('Create contact'); expect(manifest).toContain('four-eyes');
    expect(manifest).not.toContain('function');
  });
  it('rejects duplicate actions and unsupported/secret form schemas', () => {
    expect(() => createInteractiveSurfaceDefinitions([action, action], defaultSurfaceDefinitions)).toThrow();
    for (const inputSchema of [Type.Object({ name: Type.String() }), Type.Object({ secret: Type.String({ writeOnly: true }) }, { additionalProperties: false }),
      Type.Object({ value: Type.Union([Type.String(), Type.Number()]) }, { additionalProperties: false })]) {
      expect(() => validateSurfaceActionDescriptor({ ...action, inputSchema })).toThrow();
    }
  });
  it('snapshots the registered schema rather than retaining mutable validation rules', () => {
    const inputSchema = Type.Object({ name: Type.String({ minLength: 1 }) }, { additionalProperties: false });
    const registered = defineSurfaceAction({ ...action, inputSchema, authorize: () => true, execute: () => null });
    inputSchema.properties.name.minLength = 0;
    expect(registered.validateInput({ name: '' })).toBe(false);
    expect(Object.isFrozen(registered.inputSchema.properties.name)).toBe(true);
  });
});
