import { describe, expect, test } from 'bun:test';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inferResource } from './inferencer';
import { getContractFormFields, parseContractCreateInput, parseContractUpdateInput, resolveResourceContract } from './resource-contract';

describe('inferred ResourceContract', () => {
  test('compiles and satisfies AutoTable and AutoForm resolution', async () => {
    const result = inferResource('posts', [
      {
        id: 1,
        title: 'First Post',
        views: 3,
        is_featured: true,
        email: 'author@blog.com',
        author_id: 5,
        tags: ['svelte'],
      },
    ]);
    const file = join(import.meta.dir, 'generated-posts.resource.fixture.ts');
    try {
      await writeFile(file, result.code);
      const built = await Bun.build({
        entrypoints: [file],
        external: ['@svadmin/core', 'typebox'],
        target: 'bun',
        format: 'esm',
      });
      expect(built.success).toBe(true);

      // Execute against the contract module directly. The public barrel pulls Svelte
      // runes, which this bun test does not preprocess.
      const executable = result.code
        .replace(
          "import { defineResource, type AdminResourceDefinition } from '@svadmin/core';",
          "import { defineResource } from './resource-contract.ts';",
        )
        .replace(': AdminResourceDefinition', '');
      await writeFile(file, executable);
      const loaded = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      const definition = loaded.postsDefinition;
      const contract = resolveResourceContract(definition);
      expect(contract).toBe(loaded.postsResource);
      expect(contract.name).toBe('posts');
      expect(getContractFormFields(contract, 'create')).toEqual(expect.arrayContaining(['title', 'views', 'email']));
      expect(getContractFormFields(contract, 'edit')).toEqual(expect.arrayContaining(['title']));
      expect(parseContractCreateInput(contract, {
        title: 'Next',
        views: 1,
        is_featured: false,
        email: 'next@blog.com',
        author_id: '5',
        tags: ['admin'],
      })).toMatchObject({ title: 'Next' });
      expect(parseContractUpdateInput(contract, { title: 'Edited' })).toMatchObject({ title: 'Edited' });
      expect(() => parseContractCreateInput(contract, { title: 12 })).toThrow(/Invalid create input/);
    } finally {
      await rm(file, { force: true });
    }
  });

  test('accepts metadata objects whose sample shape is closed', async () => {
    const result = inferResource('articles', [
      {
        id: 'a1',
        title: 'First',
        metadata: { source: 'cms', flags: { featured: true } },
        body: '<p>Hello</p>',
      },
      {
        id: 'a2',
        title: 'Second',
        metadata: { source: 'api', flags: { featured: false }, note: 'later' },
        body: '<p>Again</p>',
      },
    ]);
    expect(result.code).toContain('metadata:');
    expect(result.code).toContain('additionalProperties: false');
    expect(result.code).not.toContain('@svadmin hand-authored-contract "metadata"');
    expect(result.fields.find((field) => field.key === 'body')?.type).not.toBe('json');

    const file = join(import.meta.dir, 'generated-articles.resource.fixture.ts');
    try {
      const executable = result.code
        .replace(
          "import { defineResource, type AdminResourceDefinition } from '@svadmin/core';",
          "import { defineResource } from './resource-contract.ts';",
        )
        .replace(': AdminResourceDefinition', '');
      await writeFile(file, executable);
      const loaded = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      const { parseContractRecord } = await import('./resource-contract.ts');
      const contract = loaded.articlesResource;
      expect(parseContractRecord(contract, {
        id: 'a1',
        title: 'First',
        metadata: { source: 'cms', flags: { featured: true } },
      })).toMatchObject({
        id: 'a1',
        metadata: { source: 'cms', flags: { featured: true } },
      });
      expect(parseContractRecord(contract, {
        id: 'a2',
        title: 'Second',
        metadata: { source: 'api', flags: { featured: false }, note: 'later' },
      }).metadata).toMatchObject({ note: 'later' });
      expect(() => parseContractRecord(contract, {
        id: 'a3',
        title: 'Third',
        metadata: { source: 'cms', flags: { featured: true }, secret: true },
      })).toThrow(/Invalid provider response/);
    } finally {
      await rm(file, { force: true });
    }
  });

  test('marks JSON fields with no closed sample shape instead of accepting them', async () => {
    const result = inferResource('blobs', [{ id: 'b1', metadata: [] }]);
    expect(result.code).toContain('@svadmin hand-authored-contract "metadata"');
    expect(result.review.warnings.some((warning) => warning.code === 'unconstrained-field' && warning.field === 'metadata')).toBe(true);
    const file = join(import.meta.dir, 'generated-blobs.resource.fixture.ts');
    try {
      const executable = result.code
        .replace(
          "import { defineResource, type AdminResourceDefinition } from '@svadmin/core';",
          "import { defineResource } from './resource-contract.ts';",
        )
        .replace(': AdminResourceDefinition', '');
      await writeFile(file, executable);
      const loaded = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
      const { parseContractRecord } = await import('./resource-contract.ts');
      expect(parseContractRecord(loaded.blobsResource, { id: 'b1' })).toMatchObject({ id: 'b1' });
      expect(() => parseContractRecord(loaded.blobsResource, { id: 'b1', metadata: [] })).toThrow(/Invalid provider response/);
    } finally {
      await rm(file, { force: true });
    }
  });
});
