import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRefineAdapter } from '@svadmin/refine-adapter';
import { createParseDataProvider } from './index';
import { createParseDataProvider as createFromModule, resolveInitializer } from './data-provider';

describe('Parse provider consumption', () => {
  test('keeps the package entry pointed at the data provider module', () => {
    const entry = readFileSync(new URL('./index.ts', import.meta.url), 'utf8');
    expect(entry).toContain("export { createParseDataProvider } from './data-provider'");
    expect(entry).not.toContain('data-provider.ts');
    expect(createParseDataProvider).toBe(createFromModule);
  });

  test('install, config, and response stay consistent without a live Parse server', async () => {
    const refine = {
      getApiUrl: () => 'https://parse.example/parse',
      getList: async () => ({ data: [{ id: 'obj1', name: 'Ada' }], total: 1 }),
      getOne: async () => ({ data: { id: 'obj1', name: 'Ada' } }),
      create: async () => ({ data: { id: 'obj1' } }),
      update: async () => ({ data: { id: 'obj1' } }),
      deleteOne: async () => ({ data: { id: 'obj1' } }),
    };
    const init = resolveInitializer({ default: () => refine });
    const provider = createRefineAdapter(init());
    const list = await provider.getList({
      resource: 'GameScore',
      pagination: { current: 1, pageSize: 10 },
    });
    expect(provider.getApiUrl()).toBe('https://parse.example/parse');
    expect(list.total).toBe(1);
    expect(list.data[0]).toMatchObject({ id: 'obj1', name: 'Ada' });
    expect(createParseDataProvider).toBeTypeOf('function');
  });

  test('the package entry builds', async () => {
    const built = await Bun.build({
      entrypoints: [new URL('./index.ts', import.meta.url).pathname],
      external: ['@svadmin/core', '@svadmin/refine-adapter', '@refinedev/parse'],
      target: 'bun',
      format: 'esm',
    });
    expect(built.success).toBe(true);
  });
});
