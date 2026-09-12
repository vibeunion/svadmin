import { describe, expect, test } from 'bun:test';
import { downloadData, escapeCsvField, toCsv, toJson, toXlsx } from './export-format';
import { parseCSV } from './helpers-pure';

describe('parseCSV', () => {
  test('simple comma-separated values', () => {
    expect(parseCSV('a,b,c')).toEqual([['a', 'b', 'c']]);
  });

  test('values with whitespace are trimmed', () => {
    expect(parseCSV(' hello , world , test ')).toEqual([['hello', 'world', 'test']]);
  });

  test('quoted values preserve commas', () => {
    expect(parseCSV('"hello, world",b,c')).toEqual([['hello, world', 'b', 'c']]);
  });

  test('escaped quotes inside quoted values', () => {
    expect(parseCSV('"say ""hello""",b')).toEqual([['say "hello"', 'b']]);
  });

  test('empty values', () => {
    expect(parseCSV('a,,c')).toEqual([['a', '', 'c']]);
  });

  test('single value', () => {
    expect(parseCSV('hello')).toEqual([['hello']]);
  });

  test('empty input', () => {
    expect(parseCSV('')).toEqual([]);
  });

  test('quoted value with newline character', () => {
    expect(parseCSV('"line1\nline2",b')).toEqual([['line1\nline2', 'b']]);
  });

  test('mixed quoted and unquoted', () => {
    expect(parseCSV('1,"John Doe","admin@test.com",true')).toEqual([
      ['1', 'John Doe', 'admin@test.com', 'true'],
    ]);
  });
});

describe('escapeCsvField', () => {
  test('simple string passes through', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  test('string with comma is quoted', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  });

  test('string with double quote is escaped', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  test('string with newline is quoted', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  test('prefixes spreadsheet formulas with an apostrophe', () => {
    expect(escapeCsvField('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
  });
});

describe('toCsv', () => {
  test('generates valid CSV with headers', () => {
    const csv = toCsv([{ id: 1, name: 'Alice' }]);
    expect(csv).toContain('id,name');
    expect(csv).toContain('1,Alice');
  });

  test('handles multiple records', () => {
    const csv = toCsv([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('1,A');
    expect(lines[2]).toBe('2,B');
  });

  test('handles null and undefined values', () => {
    const csv = toCsv([{ id: 1, name: null as unknown as undefined, email: undefined }]);
    expect(csv).toContain('1,,');
  });

  test('handles nested objects via JSON stringify', () => {
    const csv = toCsv([{ id: 1, meta: { tags: ['a'] } }]);
    expect(csv).toContain('"{""tags"":[""a""]}"');
  });

  test('returns empty string for empty records', () => {
    expect(toCsv([])).toBe('');
  });
});

describe('toJson', () => {
  test('formats records as pretty JSON', () => {
    const json = toJson([{ id: 1, name: 'Alice', active: true }]);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual([{ id: 1, name: 'Alice', active: true }]);
  });

  test('handles nested objects', () => {
    const json = toJson([{ id: 1, meta: { tags: ['a', 'b'] } }]);
    const parsed = JSON.parse(json);
    expect(parsed[0].meta.tags).toEqual(['a', 'b']);
  });

  test('handles empty array', () => {
    expect(JSON.parse(toJson([]))).toEqual([]);
  });
});

describe('toXlsx (SpreadsheetML)', () => {
  test('generates valid XML with headers', () => {
    const xml = toXlsx([{ id: 1, name: 'Alice' }]);
    expect(xml).toContain('<?xml version="1.0"?>');
    expect(xml).toContain('<Workbook');
    expect(xml).toContain('id');
    expect(xml).toContain('Alice');
    expect(xml).toContain('ss:Type="Number"');
  });

  test('numbers use Number type', () => {
    const xml = toXlsx([{ count: 42 }]);
    expect(xml).toContain('ss:Type="Number"');
    expect(xml).toContain('>42<');
  });

  test('booleans use Boolean type', () => {
    const xml = toXlsx([{ active: true }]);
    expect(xml).toContain('ss:Type="Boolean"');
  });

  test('returns empty string for empty records', () => {
    expect(toXlsx([])).toBe('');
  });
});

describe('downloadData (browser API integration)', () => {
  test('empty records does nothing without document', () => {
    // Return safely when document is unavailable.
    expect(() => downloadData([], 'users', 'csv')).not.toThrow();
  });
});
