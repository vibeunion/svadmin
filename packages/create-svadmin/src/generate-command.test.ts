import { describe, expect, it } from 'bun:test';
import { parseGenerateArguments, generateCommand } from './generate-command';

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
});
