import { describe, expect, test } from 'bun:test';
import { parseSpreadsheetClipboard } from './spreadsheet-clipboard';

describe('parseSpreadsheetClipboard', () => {
  test('parses quoted TSV cells and preserves empty cells', () => {
    expect(parseSpreadsheetClipboard('a\t"line1\nline2"\t\nb\t2\t3', 'tsv')).toEqual([
      ['a', 'line1\nline2', ''],
      ['b', '2', '3'],
    ]);
  });

  test('requires a rectangular bounded payload', () => {
    expect(parseSpreadsheetClipboard('a\tb\n1', 'tsv')).toBeUndefined();
    expect(parseSpreadsheetClipboard('a,b\n1,2', 'csv')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseSpreadsheetClipboard('a,b\n1,2', 'tsv')).toEqual([['a,b'], ['1,2']]);
  });

  test('preserves whitespace, blank rows, literal commas and scalar text', () => {
    expect(parseSpreadsheetClipboard(' 001 \tfalse\r\n\t\r\nnull\t=1+1\r\n')).toEqual([
      [' 001 ', 'false'], ['', ''], ['null', '=1+1'],
    ]);
    expect(parseSpreadsheetClipboard('a,b')).toEqual([['a,b']]);
    expect(parseSpreadsheetClipboard('a\n\nb\n')).toEqual([['a'], [''], ['b']]);
    expect(parseSpreadsheetClipboard('"a""b"\t"x\ty"')).toEqual([['a"b', 'x\ty']]);
  });

  test.each([
    '',
    '"unterminated',
    '"closed"junk\tvalue',
    'x'.repeat(10_001),
    Array.from({ length: 101 }, () => 'x').join('\t'),
    Array.from({ length: 1001 }, () => 'x').join('\n'),
    Array.from({ length: 101 }, () => Array(100).fill('x').join('\t')).join('\n'),
    'x'.repeat(1_000_001),
  ])('rejects malformed or oversized input %#', text => {
    expect(parseSpreadsheetClipboard(text)).toBeUndefined();
  });
});
