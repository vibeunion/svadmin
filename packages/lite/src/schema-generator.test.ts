import { describe, expect, test } from 'bun:test';
import type { FieldDefinition, ResourceDefinition } from '@svadmin/core';
import {
  fieldToInputType,
  fieldsToZodSchema,
  resourceToZodSchema,
} from './schema-generator';

const fields: FieldDefinition[] = [
  {
    key: 'contacts',
    label: 'Contacts',
    type: 'array',
    required: true,
    subFields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'active', label: 'Active', type: 'boolean' },
    ],
  },
];

describe('fieldsToZodSchema array fields', () => {
  test('validates nested rows using each sub-field definition', () => {
    const schema = fieldsToZodSchema(fields);
    const result = schema.safeParse({
      contacts: [{ name: 'Alice', age: 42, active: true }],
    });

    expect(result.success).toBe(true);
  });

  test('rejects invalid nested values and missing required arrays', () => {
    const schema = fieldsToZodSchema(fields);

    expect(schema.safeParse({ contacts: [{ name: 'Alice', age: 'not-a-number' }] }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });

  test('accepts a zero-item optional array but rejects a real row with an empty required child', () => {
    const contacts = fields[0];
    if (!contacts) throw new Error('contacts field fixture is missing');
    const optionalFields: FieldDefinition[] = [{ ...contacts, required: false }];
    const schema = fieldsToZodSchema(optionalFields);

    expect(schema.safeParse({ contacts: [] }).success).toBe(true);
    expect(schema.safeParse({ contacts: [{ name: '' }] }).success).toBe(false);
  });
});

describe('fieldsToZodSchema numeric fields', () => {
  const requiredNumber: FieldDefinition = {
    key: 'count',
    label: 'Count',
    type: 'number',
    required: true,
  };

  test('rejects a required blank number and coerces valid strings or numbers', () => {
    const schema = fieldsToZodSchema([requiredNumber]);

    expect(schema.safeParse({ count: '' }).success).toBe(false);
    expect(schema.parse({ count: '42.5' })).toEqual({ count: 42.5 });
    expect(schema.parse({ count: 7 })).toEqual({ count: 7 });
  });

  test('normalizes an optional blank number without coercing it to zero', () => {
    const schema = fieldsToZodSchema([{ ...requiredNumber, required: false }]);
    const result = schema.parse({ count: '' });

    expect(result.count).toBeUndefined();
    expect(result.count).not.toBe(0);
  });
});

describe('fieldsToZodSchema boolean fields', () => {
  test('parses explicit native-form boolean values without treating false as truthy', () => {
    const schema = fieldsToZodSchema([
      { key: 'active', label: 'Active', type: 'boolean', required: true },
    ]);

    expect(schema.parse({ active: false })).toEqual({ active: false });
    expect(schema.parse({ active: 'false' })).toEqual({ active: false });
    expect(schema.parse({ active: '0' })).toEqual({ active: false });
    expect(schema.parse({ active: 'off' })).toEqual({ active: false });
    expect(schema.parse({ active: true })).toEqual({ active: true });
    expect(schema.parse({ active: 'true' })).toEqual({ active: true });
    expect(schema.parse({ active: '1' })).toEqual({ active: true });
    expect(schema.parse({ active: 'on' })).toEqual({ active: true });
    expect(schema.safeParse({ active: 'unexpected' }).success).toBe(false);
  });
});

describe('fieldsToZodSchema custom field validation', () => {
  test('runs FieldDefinition.validate after type coercion', () => {
    const schema = fieldsToZodSchema([{
      key: 'age',
      label: 'Age',
      type: 'number',
      validate: (value) => typeof value === 'number' && value >= 18 ? null : 'Must be 18 or older',
    }]);

    const rejected = schema.safeParse({ age: '12' });
    expect(rejected.success).toBe(false);
    if (!rejected.success) {
      expect(rejected.error.issues[0]?.message).toBe('Must be 18 or older');
    }
    expect(schema.parse({ age: '18' })).toEqual({ age: 18 });
  });
});

describe('fieldsToZodSchema shared ResourceDefinition values', () => {
  test('preserves numeric option values submitted by native forms', () => {
    const schema = fieldsToZodSchema([
      {
        key: 'role',
        label: 'Role',
        type: 'select',
        options: [{ label: 'Admin', value: 1 }, { label: 'Editor', value: 2 }],
      },
      {
        key: 'teams',
        label: 'Teams',
        type: 'multiselect',
        options: [{ label: 'Core', value: 10 }, { label: 'Docs', value: 20 }],
      },
    ]);

    expect(schema.parse({ role: '1', teams: ['10', '20'] })).toEqual({
      role: 1,
      teams: [10, 20],
    });
    expect(schema.safeParse({ role: '999', teams: ['10'] }).success).toBe(false);
  });

  test('accepts the same URL values used by core image and images fields', () => {
    const schema = fieldsToZodSchema([
      { key: 'avatar', label: 'Avatar', type: 'image', required: true },
      { key: 'gallery', label: 'Gallery', type: 'images', required: true },
    ]);

    expect(schema.parse({
      avatar: 'https://cdn.example/avatar.png',
      gallery: 'https://cdn.example/one.png\nhttps://cdn.example/two.png',
    })).toEqual({
      avatar: 'https://cdn.example/avatar.png',
      gallery: ['https://cdn.example/one.png', 'https://cdn.example/two.png'],
    });
  });

  test('preserves commas inside image URLs', () => {
    const schema = fieldsToZodSchema([
      { key: 'gallery', label: 'Gallery', type: 'images', required: true },
    ]);

    expect(schema.parse({
      gallery: 'https://cdn.example/image.png?crop=1,2\nhttps://cdn.example/second.png',
    })).toEqual({
      gallery: [
        'https://cdn.example/image.png?crop=1,2',
        'https://cdn.example/second.png',
      ],
    });
  });

  test('uses portable password and markdown controls', () => {
    expect(fieldToInputType({ key: 'password', label: 'Password', type: 'password' })).toBe('password');
    expect(fieldToInputType({ key: 'notes', label: 'Notes', type: 'markdown' })).toBe('textarea');
  });
});

describe('resourceToZodSchema primary key compatibility', () => {
  test('excludes the resource primary key from create and edit variables', () => {
    const resource = {
      name: 'posts',
      label: 'Posts',
      primaryKey: 'postId',
      fields: [
        { key: 'postId', label: 'Post ID', type: 'text', required: true },
        { key: 'title', label: 'Title', type: 'text', required: true },
      ],
    } satisfies ResourceDefinition;

    expect(resourceToZodSchema(resource, 'create').parse({ title: 'Release' })).toEqual({
      title: 'Release',
    });
    expect(resourceToZodSchema(resource, 'edit').parse({
      postId: 'post-1',
      title: 'Updated',
    })).toEqual({ title: 'Updated' });
  });
});

describe('fieldsToZodSchema file fields', () => {
  const requiredFileFields: FieldDefinition[] = [
    { key: 'attachment', label: 'Attachment', type: 'file', required: true },
    { key: 'avatar', label: 'Avatar', type: 'image', required: true },
    { key: 'gallery', label: 'Gallery', type: 'images', required: true },
  ];

  test('accepts non-empty File values and required File arrays', () => {
    const attachment = new File(['report'], 'report.txt', { type: 'text/plain' });
    const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const firstImage = new File(['first'], 'first.png', { type: 'image/png' });
    const secondImage = new File(['second'], 'second.png', { type: 'image/png' });
    const schema = fieldsToZodSchema(requiredFileFields);

    const result = schema.parse({
      attachment,
      avatar,
      gallery: [firstImage, secondImage],
    });

    expect(result).toEqual({ attachment, avatar, gallery: [firstImage, secondImage] });
  });

  test('rejects required empty native files and normalizes optional empty uploads', () => {
    const emptyFile = new File([], '');
    const requiredSchema = fieldsToZodSchema(requiredFileFields);
    const optionalSchema = fieldsToZodSchema(
      requiredFileFields.map((field) => ({ ...field, required: false })),
    );

    expect(requiredSchema.safeParse({
      attachment: emptyFile,
      avatar: emptyFile,
      gallery: [emptyFile],
    }).success).toBe(false);

    const optionalResult = optionalSchema.parse({
      attachment: emptyFile,
      avatar: emptyFile,
      gallery: [emptyFile],
    });
    expect(optionalResult.attachment).toBeUndefined();
    expect(optionalResult.avatar).toBeUndefined();
    expect(optionalResult.gallery).toBeUndefined();
  });

  test('does not reference the File constructor unsafely during SSR', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'File');
    Object.defineProperty(globalThis, 'File', { configurable: true, value: undefined });

    try {
      const optionalSchema = fieldsToZodSchema([
        { key: 'attachment', label: 'Attachment', type: 'file' },
      ]);
      const requiredSchema = fieldsToZodSchema([
        { key: 'attachment', label: 'Attachment', type: 'file', required: true },
      ]);

      expect(optionalSchema.safeParse({}).success).toBe(true);
      expect(requiredSchema.safeParse({ attachment: {} }).success).toBe(false);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'File', descriptor);
    }
  });

  test('does not require re-uploading stored files during edit but still rejects invalid replacements', () => {
    const editSchema = fieldsToZodSchema(requiredFileFields, 'edit');

    expect(editSchema.parse({})).toEqual({});
    expect(editSchema.safeParse({ attachment: 'not-a-file' }).success).toBe(false);
  });

  test('accepts retained upload references for edit array rows but not for create', () => {
    const documentArray: FieldDefinition = {
      key: 'documents',
      label: 'Documents',
      type: 'array',
      required: true,
      subFields: [
        { key: 'attachment', label: 'Attachment', type: 'file', required: true },
        { key: 'gallery', label: 'Gallery', type: 'images', required: true },
      ],
    };
    const retained = {
      documents: [{
        attachment: '/stored/report.pdf',
        gallery: ['/stored/first.png', '/stored/second.png'],
      }],
    };

    expect(fieldsToZodSchema([documentArray], 'edit').parse(retained)).toEqual(retained);
    expect(fieldsToZodSchema([documentArray], 'create').safeParse(retained).success).toBe(false);
    expect(fieldsToZodSchema([documentArray], 'edit').safeParse({
      documents: [{ gallery: ['/stored/first.png'] }],
    }).success).toBe(false);
  });
});

describe('fieldsToZodSchema enterprise field types', () => {
  test('coerces currency and percent formatted strings to numbers', () => {
    const schema = fieldsToZodSchema([
      { key: 'price', label: 'Price', type: 'currency', required: true },
      { key: 'discount', label: 'Discount', type: 'percent' },
    ]);

    expect(schema.parse({ price: '$129.99', discount: '15%' })).toEqual({
      price: 129.99,
      discount: 15,
    });
  });

  test('validates phone numbers and code lengths', () => {
    const schema = fieldsToZodSchema([
      { key: 'phone', label: 'Phone', type: 'phone' },
      { key: 'code', label: 'Code', type: 'code' },
    ]);

    expect(schema.safeParse({ phone: '+1 (555) 123-4567' }).success).toBe(true);
    expect(schema.safeParse({ phone: 'invalid-letters-phone!' }).success).toBe(false);
  });

  test('generates input types and placeholders for enterprise fields', () => {
    expect(fieldToInputType({ key: 'price', label: 'Price', type: 'currency' })).toBe('number');
    expect(fieldToInputType({ key: 'ratio', label: 'Ratio', type: 'percent' })).toBe('number');
    expect(fieldToInputType({ key: 'stars', label: 'Stars', type: 'rating' })).toBe('number');
    expect(fieldToInputType({ key: 'phone', label: 'Phone', type: 'phone' })).toBe('tel');
    expect(fieldToInputType({ key: 'snippet', label: 'Snippet', type: 'code' })).toBe('textarea');
  });
});
