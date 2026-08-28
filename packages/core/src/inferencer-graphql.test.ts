/**
 * Tests for GraphQL Schema / Introspection → ResourceDefinition inference
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, test, expect } from 'bun:test';
import { inferFromGraphQL, GRAPHQL_INTROSPECTION_QUERY } from './inferencer-graphql';
import { generateTypeBoxSchemaCode, generateListPageCode } from './inferencer';

const sampleGraphQLIntrospection = {
  data: {
    __schema: {
      queryType: { name: 'Query' },
      mutationType: { name: 'Mutation' },
      subscriptionType: null,
      types: [
        {
          kind: 'OBJECT' as const,
          name: 'Query',
          fields: [
            { name: 'posts', type: { kind: 'LIST' as const, ofType: { kind: 'OBJECT' as const, name: 'Post' } }, args: [] },
            { name: 'post', type: { kind: 'OBJECT' as const, name: 'Post' }, args: [] },
            { name: 'users', type: { kind: 'LIST' as const, ofType: { kind: 'OBJECT' as const, name: 'User' } }, args: [] },
          ],
        },
        {
          kind: 'OBJECT' as const,
          name: 'Mutation',
          fields: [
            { name: 'createPost', type: { kind: 'OBJECT' as const, name: 'Post' }, args: [] },
            { name: 'updatePost', type: { kind: 'OBJECT' as const, name: 'Post' }, args: [] },
            { name: 'deletePost', type: { kind: 'SCALAR' as const, name: 'Boolean' }, args: [] },
          ],
        },
        {
          kind: 'ENUM' as const,
          name: 'PostStatus',
          enumValues: [
            { name: 'DRAFT' },
            { name: 'PUBLISHED' },
            { name: 'ARCHIVED' },
          ],
        },
        {
          kind: 'OBJECT' as const,
          name: 'Post',
          description: 'A blog post entity',
          fields: [
            { name: 'id', type: { kind: 'NON_NULL' as const, ofType: { kind: 'SCALAR' as const, name: 'ID' } } },
            { name: 'title', type: { kind: 'NON_NULL' as const, ofType: { kind: 'SCALAR' as const, name: 'String' } } },
            { name: 'content', type: { kind: 'SCALAR' as const, name: 'String' } },
            { name: 'status', type: { kind: 'SCALAR' as const, name: 'PostStatus' } },
            { name: 'author_id', type: { kind: 'SCALAR' as const, name: 'Int' } },
            { name: 'author', type: { kind: 'OBJECT' as const, name: 'User' } },
            { name: 'email', type: { kind: 'SCALAR' as const, name: 'String' } },
            { name: 'views', type: { kind: 'SCALAR' as const, name: 'Int' } },
            { name: 'is_featured', type: { kind: 'SCALAR' as const, name: 'Boolean' } },
            { name: 'created_at', type: { kind: 'SCALAR' as const, name: 'DateTime' } },
            { name: 'tags', type: { kind: 'LIST' as const, ofType: { kind: 'SCALAR' as const, name: 'String' } } },
            { name: 'photos', type: { kind: 'LIST' as const, ofType: { kind: 'SCALAR' as const, name: 'String' } } },
            { name: 'meta', type: { kind: 'SCALAR' as const, name: 'JSON' } },
          ],
        },
        {
          kind: 'OBJECT' as const,
          name: 'User',
          description: 'User profile entity',
          fields: [
            { name: 'id', type: { kind: 'NON_NULL' as const, ofType: { kind: 'SCALAR' as const, name: 'ID' } } },
            { name: 'name', type: { kind: 'NON_NULL' as const, ofType: { kind: 'SCALAR' as const, name: 'String' } } },
            { name: 'avatar', type: { kind: 'SCALAR' as const, name: 'String' } },
          ],
        },
      ],
    },
  },
};

describe('inferFromGraphQL Introspection', () => {
  test('parses entity types and filters out Query/Mutation root types', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    expect(resources.length).toBe(2);
    expect(resources.map(r => r.name).sort()).toEqual(['posts', 'users']);
  });

  test('pluralizes entity names correctly', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts');
    expect(post).toBeDefined();
    expect(post!.label).toBe('Post');
  });

  test('detects required fields from NON_NULL', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const titleField = post.fields.find(f => f.key === 'title')!;
    const contentField = post.fields.find(f => f.key === 'content')!;
    expect(titleField.required).toBe(true);
    expect(contentField.required).toBe(false);
  });

  test('maps Int to number type', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const viewsField = post.fields.find(f => f.key === 'views')!;
    expect(viewsField.type).toBe('number');
  });

  test('maps Boolean to boolean type', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const field = post.fields.find(f => f.key === 'is_featured')!;
    expect(field.type).toBe('boolean');
  });

  test('maps DateTime custom scalar to date', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const field = post.fields.find(f => f.key === 'created_at')!;
    expect(field.type).toBe('date');
  });

  test('maps JSON custom scalar to json', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const field = post.fields.find(f => f.key === 'meta')!;
    expect(field.type).toBe('json');
  });

  test('maps Enum to select with options', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const field = post.fields.find(f => f.key === 'status')!;
    expect(field.type).toBe('select');
    expect(field.options?.length).toBe(3);
    expect(field.options?.map(o => o.value)).toEqual(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
  });

  test('maps object relation field to relation', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const authorField = post.fields.find(f => f.key === 'author')!;
    expect(authorField.type).toBe('relation');
    expect(authorField.resource).toBe('users');
  });

  test('maps author_id relation field to relation from name suffix', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const field = post.fields.find(f => f.key === 'author_id')!;
    expect(field.type).toBe('relation');
    expect(field.resource).toBe('authors');
  });

  test('maps string array to tags and photo array to images', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const tagsField = post.fields.find(f => f.key === 'tags')!;
    const photosField = post.fields.find(f => f.key === 'photos')!;
    expect(tagsField.type).toBe('tags');
    expect(photosField.type).toBe('images');
  });

  test('detects CRUD capabilities from root Query and Mutation fields', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    expect(post.canCreate).toBe(true);
    expect(post.canEdit).toBe(true);
    expect(post.canDelete).toBe(true);
    expect(post.canShow).toBe(true);

    const user = resources.find(r => r.name === 'users')!;
    expect(user.canShow).toBe(true);
    expect(user.canCreate).toBe(false);
    expect(user.canEdit).toBe(false);
    expect(user.canDelete).toBe(false);
  });

  test('include and exclude filters work', () => {
    const included = inferFromGraphQL(sampleGraphQLIntrospection, { include: ['Post'] });
    expect(included.length).toBe(1);
    expect(included[0].name).toBe('posts');

    const excluded = inferFromGraphQL(sampleGraphQLIntrospection, { exclude: ['Post'] });
    expect(excluded.length).toBe(1);
    expect(excluded[0].name).toBe('users');
  });

  test('can generate TypeBox schema and Svelte components from inferred GraphQL resource', () => {
    const resources = inferFromGraphQL(sampleGraphQLIntrospection);
    const post = resources.find(r => r.name === 'posts')!;
    const typebox = generateTypeBoxSchemaCode(post);
    expect(typebox).toContain('export const PostSchema = Type.Object({');
    expect(typebox).toContain('title: Type.String()');
    expect(typebox).toContain('views: Type.Optional(Type.Number())');

    const listPage = generateListPageCode(post);
    expect(listPage).toContain('<ListPage resourceName="posts">');
  });

  test('GRAPHQL_INTROSPECTION_QUERY is exported and contains query', () => {
    expect(GRAPHQL_INTROSPECTION_QUERY).toContain('__schema');
    expect(GRAPHQL_INTROSPECTION_QUERY).toContain('types');
  });
});

describe('inferFromGraphQL SDL String', () => {
  const sdl = `
    enum Role {
      ADMIN
      MEMBER
      VIEWER
    }

    type Account {
      id: ID!
      email: String!
      role: Role!
      isActive: Boolean
      createdAt: DateTime
      bio: String
      website: String
      avatar: String
    }

    type Query {
      accounts: [Account]
      account(id: ID!): Account
    }

    type Mutation {
      createAccount(email: String!): Account
      updateAccount(id: ID!): Account
      deleteAccount(id: ID!): Boolean
    }
  `;

  test('parses SDL string correctly', () => {
    const resources = inferFromGraphQL(sdl);
    expect(resources.length).toBe(1);
    const account = resources[0];
    expect(account.name).toBe('accounts');
    expect(account.label).toBe('Account');

    const emailField = account.fields.find(f => f.key === 'email')!;
    expect(emailField.type).toBe('email');
    expect(emailField.required).toBe(true);

    const roleField = account.fields.find(f => f.key === 'role')!;
    expect(roleField.type).toBe('select');
    expect(roleField.options?.length).toBe(3);

    const bioField = account.fields.find(f => f.key === 'bio')!;
    expect(bioField.type).toBe('textarea');

    const websiteField = account.fields.find(f => f.key === 'website')!;
    expect(websiteField.type).toBe('url');

    expect(account.canCreate).toBe(true);
    expect(account.canEdit).toBe(true);
    expect(account.canDelete).toBe(true);
    expect(account.canShow).toBe(true);
  });
});
