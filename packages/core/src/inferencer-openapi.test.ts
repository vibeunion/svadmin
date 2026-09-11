import { requireValue } from '../test/assertions';
/**
 * Tests for OpenAPI → ResourceDefinition inference
 */

import { describe,test,expect } from 'bun:test';
import { inferFromOpenAPI } from './inferencer-openapi';

const sampleOpenAPI={
  openapi: '3.0.0',
  info: { title: 'Blog API',version: '1.0.0' },
  paths: {
    '/api/posts': {
      get: { operationId: 'getPosts' },
      post: { operationId: 'createPost' },
    },
    '/api/posts/{id}': {
      get: { operationId: 'getPost' },
      put: { operationId: 'updatePost' },
      delete: { operationId: 'deletePost' },
    },
    '/api/users': {
      get: { operationId: 'getUsers' },
    },
  },
  components: {
    schemas: {
      Post: {
        type: 'object',
        required: ['title','content'],
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          content: { type: 'string',description: 'Post body content' },
          status: { type: 'string',enum: ['draft','published','archived'] },
          author_id: { type: 'integer' },
          email: { type: 'string',format: 'email' },
          created_at: { type: 'string',format: 'date-time' },
          tags: { type: 'array',items: { type: 'string' } },
          is_featured: { type: 'boolean' },
          views: { type: 'integer' },
          website: { type: 'string',format: 'uri' },
          meta: { type: 'object' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          avatar: { type: 'string',format: 'uri' },
        },
      },
    },
  },
};

describe('inferFromOpenAPI',() => {
  test('parses both schemas',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    expect(resources.length).toBe(2);
  });

  test('resource name is pluralized and lowercase',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=resources.find(r => r.name==='posts');
    expect(post).toBeDefined();
    expect(requireValue(post).label).toBe('Post');
  });

  test('detects required fields',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const titleField=requireValue(post.fields.find(f => f.key==='title'));
    const viewsField=requireValue(post.fields.find(f => f.key==='views'));
    expect(titleField.required).toBe(true);
    expect(viewsField.required).toBeFalsy();
  });

  test('maps integer to number type',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const viewsField=requireValue(post.fields.find(f => f.key==='views'));
    expect(viewsField.type).toBe('number');
  });

  test('maps boolean type',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='is_featured'));
    expect(field.type).toBe('boolean');
  });

  test('maps date-time format to date',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='created_at'));
    expect(field.type).toBe('date');
  });

  test('maps email format',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='email'));
    expect(field.type).toBe('email');
  });

  test('maps uri format to url',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='website'));
    expect(field.type).toBe('url');
  });

  test('maps enum to select with options',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='status'));
    expect(field.type).toBe('select');
    expect(requireValue(field.options).length).toBe(3);
    expect(requireValue(requireValue(field.options)[0]).value).toBe('draft');
  });

  test('maps array of strings to tags',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='tags'));
    expect(field.type).toBe('tags');
  });

  test('maps object to json',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='meta'));
    expect(field.type).toBe('json');
  });

  test('detects relation from _id suffix',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='author_id'));
    expect(field.type).toBe('relation');
    expect(field.resource).toBe('authors');
  });

  test('detects CRUD capabilities from paths',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    expect(post.canCreate).toBe(true);
    expect(post.canEdit).toBe(true);
    expect(post.canDelete).toBe(true);
    expect(post.canShow).toBe(true);
  });

  test('read-only resource has limited capabilities',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const user=requireValue(resources.find(r => r.name==='users'));
    expect(user.canShow).toBe(true);
    expect(user.canCreate).toBe(false);
    expect(user.canDelete).toBe(false);
  });

  test('include filter works',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI,{ include: ['Post'] });
    expect(resources.length).toBe(1);
    expect(requireValue(resources[0]).name).toBe('posts');
  });

  test('exclude filter works',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI,{ exclude: ['User'] });
    expect(resources.length).toBe(1);
    expect(requireValue(resources[0]).name).toBe('posts');
  });

  test('content field is detected as textarea from key name hint',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const field=requireValue(post.fields.find(f => f.key==='content'));
    expect(field.type).toBe('textarea');
    expect(field.showInList).toBe(false);
  });

  test('id field excluded from form',() => {
    const resources=inferFromOpenAPI(sampleOpenAPI);
    const post=requireValue(resources.find(r => r.name==='posts'));
    const idField=requireValue(post.fields.find(f => f.key==='id'));
    expect(idField.showInForm).toBe(false);
  });

  test('empty spec returns empty array',() => {
    const resources=inferFromOpenAPI({});
    expect(resources.length).toBe(0);
  });
});
