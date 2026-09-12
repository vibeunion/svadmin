import { describe, expect, it } from 'bun:test';
import { decodeColumnMetadata, decodeColumns } from './column-metadata';

const valid = {
  name: 'display_name', dataType: 'string', columnType: 'SQLiteText',
  notNull: true, hasDefault: false, primary: false,
};

describe('Drizzle column metadata boundary', () => {
  it('projects validated metadata without leaking circular SDK objects', () => {
    const source = { ...valid, enumValues: undefined };
    Object.defineProperty(source, 'table', { value: source });
    expect(decodeColumnMetadata(source)).toEqual(valid);
    expect(decodeColumns({ displayName: source })).toEqual([['displayName', valid]]);
  });

  it('rejects malformed columns and enum values without echoing inputs', () => {
    const invalid: unknown[] = [
      null, [], {}, { ...valid, name: '' }, { ...valid, dataType: 1 },
      { ...valid, columnType: undefined }, { ...valid, notNull: 'secret' },
      { ...valid, hasDefault: null }, { ...valid, primary: 1 },
      { ...valid, enumValues: 'secret' }, { ...valid, enumValues: ['ok', 1] },
    ];
    for (const value of invalid) {
      expect(() => decodeColumnMetadata(value)).toThrow('Invalid Drizzle column metadata');
    }
  });

  it('rejects array and null column maps', () => {
    for (const value of [null, [], 'secret']) {
      expect(() => decodeColumns(value)).toThrow('Invalid Drizzle table columns');
    }
  });

  it('snapshots enum metadata before admitting it to typed application code', () => {
    const enumValues: unknown[] = ['staff'];
    const result = decodeColumnMetadata({ ...valid, enumValues });
    enumValues[0] = 42;
    expect(result.enumValues).toEqual(['staff']);
  });
});
