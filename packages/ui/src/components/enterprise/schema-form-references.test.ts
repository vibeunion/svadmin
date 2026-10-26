import { describe, expect, it, vi } from 'vitest';
import { resolveSchemaFormReferences } from './schema-form-references.js';

const uri = 'urn:svadmin:test:common';

describe('schema form external reference subset', () => {
  it('resolves an exact host-provided URI and keeps the input documents unchanged', () => {
    const schema = {
      type: 'object',
      properties: { profile: { $ref: `${uri}#/$defs/profile` } },
      $defs: { local: { type: 'string' } },
    };
    const document = {
      $defs: { profile: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } },
    };
    const before = structuredClone(document);
    const result = resolveSchemaFormReferences(schema, { [uri]: document });
    expect(result.issues).toEqual([]);
    expect(result.schema).toEqual({
      type: 'object',
      properties: { profile: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } } },
    });
    expect(document).toEqual(before);
    expect(schema.properties.profile).toEqual({ $ref: `${uri}#/$defs/profile` });
  });

  it('resolves an external document root and its internal defs without fetching', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = resolveSchemaFormReferences(
      { type: 'object', properties: { value: { $ref: uri } } },
      { [uri]: { type: 'object', properties: { value: { $ref: '#/$defs/value' } }, $defs: { value: { type: 'string' } } } },
    );
    expect(result.issues).toEqual([]);
    expect(result.schema).toEqual({ type: 'object', properties: { value: { type: 'object', properties: { value: { type: 'string' } } } } });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('fails closed for unknown URIs, relative references, and illegal fragments', () => {
    for (const reference of [
      `${uri}/other`, `${uri}#/properties/value`, `${uri}#/$defs/missing`, 'other.json#/$defs/value',
      'https://unlisted.example/schema.json', '#/definitions/value', '#/$defs/value/extra', '#/$defs/',
    ]) {
      const result = resolveSchemaFormReferences(
        { type: 'object', properties: { value: { $ref: reference } } },
        { [uri]: { $defs: { value: { type: 'string' } } } },
      );
      expect(result.schema).toBeUndefined();
      expect(result.issues).toContainEqual({ path: '/value', code: 'ref-invalid' });
    }
  });

  it('rejects external reference cycles and reference expansion limits', () => {
    const cyclic: Record<string, unknown> = { type: 'object', properties: { next: { $ref: uri } } };
    const cycle = resolveSchemaFormReferences({ type: 'object', properties: { node: { $ref: uri } } }, { [uri]: cyclic });
    expect(cycle.issues).toContainEqual({ path: '/node/next', code: 'ref-cycle' });

    const chain: Record<string, unknown> = {};
    for (let index = 0; index < 40; index++) chain[`n${index}`] = index === 39 ? { type: 'string' } : { $ref: `${uri}#/$defs/n${index + 1}` };
    const limited = resolveSchemaFormReferences(
      { type: 'object', properties: { value: { $ref: `${uri}#/$defs/n0` } } },
      { [uri]: { $defs: chain } },
    );
    expect(limited.issues).toContainEqual({ path: '/value', code: 'ref-limit' });
  });

  it('does not execute accessors in the document map or schema document', () => {
    let invoked = 0;
    const documents = {} as Record<string, unknown>;
    Object.defineProperty(documents, uri, { enumerable: true, get: () => { invoked++; return { type: 'string' }; } });
    const result = resolveSchemaFormReferences({ type: 'object', properties: { value: { $ref: uri } } }, documents);
    expect(result.schema).toBeUndefined();
    expect(result.issues).toContainEqual({ path: '/value', code: 'ref-invalid' });
    expect(invoked).toBe(0);
  });
});
