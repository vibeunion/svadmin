import { describe, test, expect } from 'bun:test';
import type { FieldDefinition } from '@svadmin/core';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseInferArguments,
  planGeneratedFiles,
  executeInfer,
} from './infer-command';
import { generateResourceBundle } from '@svadmin/core/inferencer';

describe('parseInferArguments', () => {
  test('parses basic flags', () => {
    const opts = parseInferArguments([
      '--url', 'https://api.example.com/posts',
      '--resource', 'posts',
      '--out-dir', 'src/resources',
      '--write',
      '--primary-key', 'uuid',
      '--method', 'POST',
      '--format', 'typebox',
    ]);

    expect(opts.url).toBe('https://api.example.com/posts');
    expect(opts.resource).toBe('posts');
    expect(opts.outDir).toBe('src/resources');
    expect(opts.write).toBe(true);
    expect(opts.primaryKey).toBe('uuid');
    expect(opts.method).toBe('POST');
    expect(opts.format).toBe('typebox');
  });

  test('parses short flags and headers', () => {
    const opts = parseInferArguments([
      '-u', 'https://api.example.com/graphql',
      '-t', 'graphql',
      '-o', 'src/lib/crud',
      '-w',
      '-H', 'Authorization: Bearer test-token',
      '-H', 'X-Custom-Tenant: tenant-123',
    ]);

    expect(opts.url).toBe('https://api.example.com/graphql');
    expect(opts.type).toBe('graphql');
    expect(opts.outDir).toBe('src/lib/crud');
    expect(opts.write).toBe(true);
    expect(opts.headers).toEqual({
      Authorization: 'Bearer test-token',
      'X-Custom-Tenant': 'tenant-123',
    });
  });

  test('parses positional URL or file', () => {
    const urlOpts = parseInferArguments(['https://api.example.com/openapi.json', '--write']);
    expect(urlOpts.url).toBe('https://api.example.com/openapi.json');
    expect(urlOpts.write).toBe(true);
  });
});

describe('planGeneratedFiles', () => {
  test('generates resource, schema, pages, and index.ts', () => {
    const resource = {
      name: 'articles',
      label: 'Articles',
      primaryKey: 'id',
      fields: [
        { key: 'id', label: 'ID', type: 'text' as const },
        { key: 'title', label: 'Title', type: 'text' as const, required: true },
        { key: 'content', label: 'Content', type: 'textarea' as const },
      ],
    };
    const bundles = new Map([[resource.name, generateResourceBundle(resource)]]);
    const files = planGeneratedFiles([resource], bundles, 'all');

    const filePaths = files.map(f => f.relativePath).sort();
    expect(filePaths).toEqual([
      'articles.resource.ts',
      'articles.schema.ts',
      'articles/CreatePage.svelte',
      'articles/EditPage.svelte',
      'articles/ListPage.svelte',
      'articles/ShowPage.svelte',
      'index.ts',
    ]);

    const indexFile = files.find(f => f.relativePath === 'index.ts');
    expect(indexFile?.content).toContain("export * from './articles.resource.js';");
    expect(indexFile?.content).toContain("export * from './articles.schema.js';");
    expect(indexFile?.content).toContain("export { default as ArticleListPage } from './articles/ListPage.svelte';");
  });
});

describe('executeInfer with mock fetch & files', () => {
  test('infers from local REST sample data file and dry-run does not write', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'infer-test-'));
    const samplePath = join(tempDir, 'products.json');
    const outDir = join(tempDir, 'src/resources');

    const sampleData = [
      { id: 1, name: 'Laptop', price: 999, in_stock: true, category_id: 2 },
      { id: 2, name: 'Phone', price: 499, in_stock: false, category_id: 2 },
    ];

    try {
      await writeFile(samplePath, JSON.stringify(sampleData, null, 2));

      const dryRunResult = await executeInfer({
        file: samplePath,
        outDir,
        write: false,
      });

      expect(dryRunResult.resources.length).toBe(1);
      expect(dryRunResult.resources[0].name).toBe('products');
      expect(dryRunResult.wrote).toBe(false);
      expect(dryRunResult.files.length).toBeGreaterThan(0);

      // Verify files were not written in dry-run
      const filesExist = await readdir(tempDir);
      expect(filesExist).toEqual(['products.json']);

      // Now run with write: true
      const writeResult = await executeInfer({
        file: samplePath,
        outDir,
        write: true,
      });

      expect(writeResult.wrote).toBe(true);
      const writtenResource = await readFile(join(outDir, 'products.resource.ts'), 'utf-8');
      expect(writtenResource).toContain("name: 'products'");

      const writtenSchema = await readFile(join(outDir, 'products.schema.ts'), 'utf-8');
      expect(writtenSchema).toContain('export const ProductSchema = Type.Object({');
      expect(writtenSchema).toContain('price: Type.Optional(Type.Number())');

      const writtenListPage = await readFile(join(outDir, 'products/ListPage.svelte'), 'utf-8');
      expect(writtenListPage).toContain('<ListPage resourceName="products">');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('infers from OpenAPI mock endpoint URL', async () => {
    const sampleOpenAPI = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0' },
      paths: {
        '/tasks': {
          get: { operationId: 'getTasks' },
          post: { operationId: 'createTask' },
        },
      },
      components: {
        schemas: {
          Task: {
            type: 'object',
            required: ['title'],
            properties: {
              id: { type: 'integer' },
              title: { type: 'string' },
              completed: { type: 'boolean' },
            },
          },
        },
      },
    };

    const mockFetch = async () => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => sampleOpenAPI,
      } as unknown as Response;
    };

    const result = await executeInfer(
      {
        url: 'https://api.example.com/openapi.json',
      },
      mockFetch as unknown as typeof fetch
    );

    expect(result.resources.length).toBe(1);
    expect(result.resources[0].name).toBe('tasks');
    expect(result.resources[0].fields.find((f: FieldDefinition) => f.key === 'completed')?.type).toBe('boolean');
  });

  test('infers from GraphQL endpoint mock URL using introspection query', async () => {
    const sampleGraphQL = {
      data: {
        __schema: {
          queryType: { name: 'Query' },
          mutationType: { name: 'Mutation' },
          types: [
            {
              kind: 'OBJECT',
              name: 'Query',
              fields: [{ name: 'members', type: { kind: 'LIST', ofType: { kind: 'OBJECT', name: 'Member' } } }],
            },
            {
              kind: 'OBJECT',
              name: 'Member',
              fields: [
                { name: 'id', type: { kind: 'NON_NULL', ofType: { kind: 'SCALAR', name: 'ID' } } },
                { name: 'email', type: { kind: 'NON_NULL', ofType: { kind: 'SCALAR', name: 'String' } } },
                { name: 'role', type: { kind: 'SCALAR', name: 'String' } },
              ],
            },
          ],
        },
      },
    };

    let sentQuery = '';
    const mockFetch = async (_url: unknown, init: { body?: string } = {}) => {
      sentQuery = init.body ?? '';
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => sampleGraphQL,
      } as unknown as Response;
    };

    const result = await executeInfer(
      {
        url: 'https://api.example.com/graphql',
        type: 'graphql',
      },
      mockFetch as unknown as typeof fetch
    );

    expect(sentQuery).toContain('__schema');
    expect(result.resources.length).toBe(1);
    expect(result.resources[0].name).toBe('members');
    const emailField = result.resources[0].fields.find((f: FieldDefinition) => f.key === 'email');
    expect(emailField?.type).toBe('email');
    expect(emailField?.required).toBe(true);
  });
});
