import { describe, expect, it } from 'bun:test';
import {
  inferFromDatabaseColumns,
  inferFromJSONSchema,
  type DatabaseColumnMeta,
  type JSONSchemaInput,
} from './inferencer-schema';

function fieldByKey<T extends { key: string }>(fields: readonly T[], key: string): T {
  const field = fields.find((item) => item.key === key);
  if (!field) {
    throw new Error(`Missing inferred field: ${key}`);
  }
  return field;
}

describe('inferFromDatabaseColumns', () => {
  it('infers field types, primary key, and relations from SQL columns', () => {
    const columns: DatabaseColumnMeta[] = [
      { name: 'id', type: 'bigint', isPrimary: true },
      { name: 'title', type: 'varchar(255)', nullable: false },
      { name: 'content', type: 'text', nullable: true },
      { name: 'user_id', type: 'bigint', isForeignKey: true, referencesResource: 'users' },
      { name: 'is_active', type: 'boolean', defaultValue: true },
      { name: 'created_at', type: 'timestamptz', nullable: false },
      { name: 'metadata', type: 'jsonb', nullable: true },
    ];

    const result = inferFromDatabaseColumns('posts', columns);

    expect(result.resource.name).toBe('posts');
    expect(result.resource.primaryKey).toBe('id');
    expect(result.fields.length).toBe(7);

    const idField = fieldByKey(result.fields, 'id');
    expect(idField.type).toBe('number');
    expect(idField.showInCreate).toBe(false);

    const titleField = fieldByKey(result.fields, 'title');
    expect(titleField.type).toBe('text');
    expect(titleField.required).toBe(true);

    const contentField = fieldByKey(result.fields, 'content');
    expect(contentField.type).toBe('textarea');

    const userField = fieldByKey(result.fields, 'user_id');
    expect(userField.type).toBe('relation');
    expect(userField.resource).toBe('users');

    const activeField = fieldByKey(result.fields, 'is_active');
    expect(activeField.type).toBe('boolean');
    expect(activeField.defaultValue).toBe(true);

    const createdAtField = fieldByKey(result.fields, 'created_at');
    expect(createdAtField.type).toBe('date');

    const metaField = fieldByKey(result.fields, 'metadata');
    expect(metaField.type).toBe('json');

    // Code and Svelte snippets generated
    expect(result.code).toContain("name: 'posts'");
    expect(result.componentCode.list).toContain('<AutoTable');
  });
});

describe('inferFromJSONSchema', () => {
  it('infers field types, enums, formats, and required constraints from JSON Schema', () => {
    const schema: JSONSchemaInput = {
      title: 'Customer Profile',
      type: 'object',
      required: ['name', 'email'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string', title: 'Full Name' },
        email: { type: 'string', format: 'email' },
        website: { type: 'string', format: 'uri' },
        tier: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
        credits: { type: 'number', default: 100 },
        is_verified: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
      },
    };

    const result = inferFromJSONSchema('customers', schema);

    expect(result.resource.name).toBe('customers');
    expect(result.resource.label).toBe('Customer Profile');
    expect(result.fields.length).toBe(8);

    const nameField = fieldByKey(result.fields, 'name');
    expect(nameField.label).toBe('Full Name');
    expect(nameField.required).toBe(true);

    const emailField = fieldByKey(result.fields, 'email');
    expect(emailField.type).toBe('email');
    expect(emailField.required).toBe(true);

    const websiteField = fieldByKey(result.fields, 'website');
    expect(websiteField.type).toBe('url');

    const tierField = fieldByKey(result.fields, 'tier');
    expect(tierField.type).toBe('select');
    expect(tierField.options?.length).toBe(3);

    const creditsField = fieldByKey(result.fields, 'credits');
    expect(creditsField.type).toBe('number');
    expect(creditsField.defaultValue).toBe(100);

    const createdAtField = fieldByKey(result.fields, 'created_at');
    expect(createdAtField.type).toBe('date');
  });
});
