// Unit tests for Inferencer
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect } from 'bun:test';
import {
  inferFieldType,
  inferResource,
  generateTypeBoxSchemaCode,
  generateListPageCode,
  generateCreatePageCode,
  generateEditPageCode,
  generateShowPageCode,
  generateComponentCode,
  generateResourceBundle,
} from './inferencer';

describe('inferFieldType', () => {
  test('detects boolean', () => {
    expect(inferFieldType('active', true)).toBe('boolean');
  });

  test('detects number', () => {
    expect(inferFieldType('age', 25)).toBe('number');
  });

  test('detects email', () => {
    expect(inferFieldType('email', 'user@example.com')).toBe('email');
  });

  test('detects email from key name', () => {
    expect(inferFieldType('user_email', 'test')).toBe('email');
  });

  test('detects URL', () => {
    expect(inferFieldType('website', 'https://example.com')).toBe('url');
  });

  test('detects image URL', () => {
    expect(inferFieldType('avatar', 'https://example.com/photo.jpg')).toBe('image');
  });

  test('detects image from key name', () => {
    expect(inferFieldType('avatar', '/uploads/user.png')).toBe('image');
  });

  test('detects date ISO string', () => {
    expect(inferFieldType('created', '2024-01-15T10:30:00Z')).toBe('date');
  });

  test('detects date from key name', () => {
    expect(inferFieldType('created_at', 'some value')).toBe('date');
  });

  test('detects phone', () => {
    expect(inferFieldType('phone', '+1 (555) 123-4567')).toBe('phone');
  });

  test('detects color hex', () => {
    expect(inferFieldType('color', '#ff5533')).toBe('color');
  });

  test('detects textarea for long strings', () => {
    expect(inferFieldType('content', 'a'.repeat(250))).toBe('textarea');
  });

  test('detects textarea from key name', () => {
    expect(inferFieldType('description', 'short')).toBe('textarea');
  });

  test('detects tags array', () => {
    expect(inferFieldType('tags', ['svelte', 'admin'])).toBe('tags');
  });

  test('detects images array', () => {
    expect(inferFieldType('photos', ['https://x.com/a.png', 'https://x.com/b.jpg'])).toBe('images');
  });

  test('detects json object', () => {
    expect(inferFieldType('meta', { foo: 'bar' })).toBe('json');
  });

  test('null defaults to text', () => {
    expect(inferFieldType('unknown', null)).toBe('text');
  });

  test('plain string defaults to text', () => {
    expect(inferFieldType('title', 'Hello World')).toBe('text');
  });
});

describe('inferResource', () => {
  const sampleData = [
    {
      id: 1,
      title: 'First Post',
      content: 'A very long description that is more than two hundred characters. '.repeat(4),
      author_id: 5,
      status: 'published',
      views: 100,
      is_featured: true,
      created_at: '2024-01-15T10:00:00Z',
      email: 'author@blog.com',
      tags: ['svelte', 'admin'],
    },
    {
      id: 2,
      title: 'Second Post',
      content: 'Another long body text that exceeds the 200 char limit easily. '.repeat(5),
      author_id: 3,
      status: 'draft',
      views: 42,
      is_featured: false,
      created_at: '2024-02-20T14:30:00Z',
      email: 'editor@blog.com',
      tags: ['react'],
    },
  ];

  test('returns correct resource name and label', () => {
    const result = inferResource('posts', sampleData);
    expect(result.resource.name).toBe('posts');
    expect(result.resource.label).toBe('Posts');
  });

  test('infers correct number of fields', () => {
    const result = inferResource('posts', sampleData);
    expect(result.fields.length).toBe(10); // id, title, content, author_id, status, views, is_featured, created_at, email, tags
  });

  test('detects id as primary key', () => {
    const result = inferResource('posts', sampleData);
    const idField = result.fields.find(f => f.key === 'id');
    expect(idField).toBeDefined();
    expect(idField!.showInForm).toBe(false);
  });

  test('detects number type for views', () => {
    const result = inferResource('posts', sampleData);
    const viewsField = result.fields.find(f => f.key === 'views');
    expect(viewsField!.type).toBe('number');
  });

  test('detects boolean type for is_featured', () => {
    const result = inferResource('posts', sampleData);
    const field = result.fields.find(f => f.key === 'is_featured');
    expect(field!.type).toBe('boolean');
  });

  test('detects date for created_at', () => {
    const result = inferResource('posts', sampleData);
    const field = result.fields.find(f => f.key === 'created_at');
    expect(field!.type).toBe('date');
  });

  test('detects relation for author_id', () => {
    const result = inferResource('posts', sampleData);
    const field = result.fields.find(f => f.key === 'author_id');
    expect(field!.type).toBe('relation');
    expect(field!.resource).toBe('authors');
  });

  test('detects email type', () => {
    const result = inferResource('posts', sampleData);
    const field = result.fields.find(f => f.key === 'email');
    expect(field!.type).toBe('email');
  });

  test('detects tags array', () => {
    const result = inferResource('posts', sampleData);
    const field = result.fields.find(f => f.key === 'tags');
    expect(field!.type).toBe('tags');
  });

  test('detects textarea for content', () => {
    const result = inferResource('posts', sampleData);
    const field = result.fields.find(f => f.key === 'content');
    expect(field!.type).toBe('textarea');
    expect(field!.showInList).toBe(false);
  });

  test('generates valid TypeScript code', () => {
    const result = inferResource('posts', sampleData);
    expect(result.code).toContain("name: 'posts'");
    expect(result.code).toContain("import type { ResourceDefinition }");
    expect(result.code).toContain("export const postsResource");
  });

  test('handles empty data gracefully', () => {
    const result = inferResource('empty', []);
    expect(result.fields.length).toBe(0);
    expect(result.code).toContain('No data available');
  });

  test('custom primaryKey', () => {
    const data = [{ _id: 'abc', name: 'Test' }];
    const result = inferResource('items', data, { primaryKey: '_id' });
    expect(result.resource.primaryKey).toBe('_id');
    const pkField = result.fields.find(f => f.key === '_id');
    expect(pkField!.showInForm).toBe(false);
  });

  test('generates complete Svelte 5 component code for list, create, edit, show', () => {
    const result = inferResource('posts', sampleData);
    expect(result.componentCode).toBeDefined();
    expect(result.componentCode.list).toContain('<ListPage resourceName="posts">');
    expect(result.componentCode.list).toContain('<AutoTable resourceName="posts" />');
    expect(result.componentCode.create).toContain('<CreatePage resourceName="posts">');
    expect(result.componentCode.create).toContain('<AutoForm resourceName="posts" mode="create" />');
    expect(result.componentCode.edit).toContain('<EditPage resourceName="posts" {id}>');
    expect(result.componentCode.show).toContain('<ShowPage resourceName="posts" {id}>');
  });

  test('generateComponentCode helper produces matching code for each kind', () => {
    const resource = { name: 'users', label: 'Users', primaryKey: 'id', fields: [] };
    expect(generateComponentCode(resource, 'list')).toBe(generateListPageCode(resource));
    expect(generateComponentCode(resource, 'typebox')).toBe(generateTypeBoxSchemaCode(resource));
    expect(generateComponentCode(resource, 'create')).toBe(generateCreatePageCode(resource));
    expect(generateComponentCode(resource, 'edit')).toBe(generateEditPageCode(resource));
    expect(generateComponentCode(resource, 'show')).toBe(generateShowPageCode(resource));
    expect(generateComponentCode(resource, 'resource')).toContain("export const usersResource");
  });

  test('generates valid TypeBox schema code with Static type inference', () => {
    const result = inferResource('posts', sampleData);
    expect(result.typeboxCode).toBeDefined();
    expect(result.typeboxCode).toContain("import { Type, type Static } from '@sinclair/typebox';");
    expect(result.typeboxCode).toContain('export const PostSchema = Type.Object({');
    expect(result.typeboxCode).toContain('export type Post = Static<typeof PostSchema>;');
    expect(result.typeboxCode).toContain('views: Type.Optional(Type.Number())');
    expect(result.typeboxCode).toContain('is_featured: Type.Optional(Type.Boolean())');
    expect(result.typeboxCode).toContain("email: Type.Optional(Type.String({ format: 'email' }))");
    expect(result.typeboxCode).toContain('tags: Type.Optional(Type.Array(Type.String()))');
  });
});

describe('generateResourceBundle', () => {
  test('generates full bundle with code, typeboxCode, and componentCode', () => {
    const resource = {
      name: 'categories',
      label: 'Categories',
      primaryKey: 'id',
      fields: [
        { key: 'id', label: 'ID', type: 'text' as const },
        { key: 'name', label: 'Name', type: 'text' as const, required: true },
      ],
    };
    const bundle = generateResourceBundle(resource);
    expect(bundle.resource).toBe(resource);
    expect(bundle.fields).toBe(resource.fields);
    expect(bundle.code).toContain('export const categoriesResource');
    expect(bundle.typeboxCode).toContain('export const CategorieSchema = Type.Object({');
    expect(bundle.componentCode.list).toContain('<ListPage resourceName="categories">');
    expect(bundle.componentCode.create).toContain('<CreatePage resourceName="categories">');
    expect(bundle.componentCode.edit).toContain('<EditPage resourceName="categories" {id}>');
    expect(bundle.componentCode.show).toContain('<ShowPage resourceName="categories" {id}>');
  });
});
