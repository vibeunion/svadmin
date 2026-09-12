import { describe, expect, it } from 'bun:test';
import { parseGenerateArguments, parseManualFields, generateCommand } from './generate-command';

describe('svadmin generate command', () => {
  it('parses generate flags with resource and fields', () => {
    const opts = parseGenerateArguments([
      '--resource', 'products',
      '--fields', 'id:number,title:text,price:number,active:boolean',
      '--out-dir', 'src/resources',
    ]);
    expect(opts.resource).toBe('products');
    expect(opts.fields).toBe('id:number,title:text,price:number,active:boolean');
    expect(opts.outDir).toBe('src/resources');
  });

  it('generates resource in dry-run mode without errors', async () => {
    await generateCommand([
      '--resource', 'categories',
      '--fields', 'id:number,name:text,slug:text',
    ]);
  });

  it('validates manual field names and types', () => {
    expect(parseManualFields(' id:number , title , body:markdown ', 'id')).toEqual([
      { key: 'id', label: 'Id', type: 'number', required: true },
      { key: 'title', label: 'Title', type: 'text', required: false },
      { key: 'body', label: 'Body', type: 'markdown', required: false },
    ]);
    for (const invalid of ['', ':text', 'id:', 'id:unknown', 'id:number:extra', 'id,id:number']) {
      expect(() => parseManualFields(invalid, 'id')).toThrow();
    }
    expect(() => parseManualFields('id:toString', 'id')).toThrow('Invalid field type');
  });
});
