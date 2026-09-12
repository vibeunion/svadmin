import { describe, expect, test } from 'bun:test';
import { Type } from '@sinclair/typebox';
import { createExactSchemaValidator } from './schema-validation';
import { HttpError } from './types';
import { decodeBaseRecord, decodeOneResult, decodeManyResult, decodeListResult, decodeCustomResult } from './record-decoder';
import { defineResource, parseContractRecord } from './resource-contract';

const row = Type.Object({ id: Type.Number(), title: Type.String() }, { additionalProperties: false });
const validator = createExactSchemaValidator(row);
function decodeRow(value: unknown) {
  if (!validator.Check(value)) throw new TypeError('Invalid test row');
  return value;
}

describe('provider response decoders', () => {
  test('derives record types from parsing and preserves list metadata', () => {
    const result = decodeListResult({ data: [{ id: 1, title: 'one' }], total: 1, cursor: 'next' }, decodeRow);
    const title: string | undefined = result.data[0]?.title;
    expect(title).toBe('one');
    expect(result['cursor']).toBe('next');
    expect(decodeOneResult({ data: { id: 2, title: 'two' } }, decodeRow).data.id).toBe(2);
    expect(decodeManyResult({ data: [{ id: 3, title: 'three' }] }, decodeRow).data).toEqual([{ id: 3, title: 'three' }]);
  });

  test('rejects invalid record shapes instead of asserting them into BaseRecord', () => {
    for (const value of [undefined, null, 1, true, 'row', [], [1], new Date(), new Uint8Array()]) {
      expect(() => decodeBaseRecord(value)).toThrow(HttpError);
      expect(() => decodeOneResult({ data: value }, decodeBaseRecord)).toThrow(HttpError);
      expect(() => decodeManyResult({ data: [value] }, decodeBaseRecord)).toThrow(HttpError);
      expect(() => decodeListResult({ data: [value], total: 1 }, decodeBaseRecord)).toThrow(HttpError);
    }
    expect(decodeBaseRecord({ nested: { untrusted: true } })).toEqual({ nested: { untrusted: true } });
  });

  test('rejects malformed envelopes and totals', () => {
    for (const value of [null, undefined, {}, [], { data: null }, { data: {} }]) {
      expect(() => decodeListResult(value, decodeBaseRecord)).toThrow(HttpError);
    }
    for (const total of ['1', -1, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => decodeListResult({ data: [], total }, decodeBaseRecord)).toThrow(HttpError);
    }
    expect(decodeListResult({ data: [], total: 0 }, decodeBaseRecord)).toEqual({ data: [], total: 0 });
    expect(() => decodeOneResult({}, decodeBaseRecord)).toThrow(HttpError);
    expect(() => decodeManyResult({}, decodeBaseRecord)).toThrow(HttpError);
  });

  test('runs the schema decoder for every record without passing array callback metadata', () => {
    let count = 0;
    const decode = (...args: unknown[]) => {
      expect(args).toHaveLength(1);
      count++;
      return decodeRow(args[0]);
    };
    expect(() => decodeManyResult({ data: [{ id: 1, title: 'ok' }, { id: 2, title: 42 }] }, decode)).toThrow(HttpError);
    expect(count).toBe(2);
  });

  test('leaves custom payloads unknown and validates the response envelope', () => {
    const payload: unknown = { arbitrary: ['data'] };
    expect(decodeCustomResult({ data: payload })).toEqual({ data: payload });
    expect(decodeCustomResult({ data: undefined })).toEqual({ data: undefined });
    for (const value of [null, undefined, [], 'text', {}]) {
      expect(() => decodeCustomResult(value)).toThrow(HttpError);
    }
  });

  test('does not expose rejected payloads in response diagnostics', () => {
    try {
      decodeListResult({ data: 'private-value', total: 1 }, decodeBaseRecord);
      throw new Error('Expected response rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      if (!(error instanceof HttpError)) throw error;
      expect(error.code).toBe('INVALID_PROVIDER_RESPONSE');
      expect(error.statusCode).toBe(502);
      expect(error.message).not.toContain('private-value');
      expect(error.body).toBeUndefined();
    }
  });

  test('binds row parsing to the contract snapshot rather than a caller-selected type', () => {
    const schema = Type.Object({ id: Type.Number(), title: Type.String({ minLength: 3 }) });
    const contract = defineResource('decoder-records', { record: schema });
    schema.properties.title.minLength = 0;
    const result = parseContractRecord(contract, { id: 1, title: 'valid' });
    const title: string = result.title;
    expect(title).toBe('valid');
    expect(() => parseContractRecord(contract, { id: 1, title: 'x' })).toThrow(HttpError);
    expect(() => parseContractRecord(contract, { id: 1, title: 42 })).toThrow(HttpError);
  });
});
