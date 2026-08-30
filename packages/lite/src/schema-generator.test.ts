import { describe, expect, test } from 'bun:test';
import type { FieldDefinition, ResourceDefinition } from '@svadmin/core';
import {
  fieldToInputType,
  fieldsToTypeBoxSchema,
  resourceToTypeBoxSchema,
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

describe('fieldsToTypeBoxSchema array fields', () => {
  test('validates nested rows using each sub-field definition', () => {
    const schema = fieldsToTypeBoxSchema(fields);
    const valid = schema.Check({
      contacts: [{ name: 'Alice', age: 42, active: true }],
    });

    expect(valid).toBe(true);
  });

  test('rejects invalid nested values and missing required arrays', () => {
    const schema = fieldsToTypeBoxSchema(fields);

    expect(schema.Check({ contacts: [{ name: 'Alice', age: 'not-a-number' }] })).toBe(false);
    expect(schema.Check({})).toBe(false);
  });

  test('accepts a zero-item optional array but rejects a real row with an empty required child', () => {
    const contacts = fields[0];
    if (!contacts) throw new Error('contacts field fixture is missing');
    const optionalFields: FieldDefinition[] = [{ ...contacts, required: false }];
    const schema = fieldsToTypeBoxSchema(optionalFields);

    expect(schema.Check({ contacts: [] })).toBe(true);
    expect(schema.Check({ contacts: [{ name: '' }] })).toBe(false);
  });
});

describe('fieldsToTypeBoxSchema numeric fields', () => {
  const requiredNumber: FieldDefinition = {
    key: 'count',
    label: 'Count',
    type: 'number',
    required: true,
  };

  test('rejects a required blank number and coerces valid strings or numbers', () => {
    const schema = fieldsToTypeBoxSchema([requiredNumber]);

    expect(schema.Check({ count: '' })).toBe(false);
    expect(schema.Decode({ count: '42.5' })).toEqual({ count: 42.5 });
    expect(schema.Decode({ count: 7 })).toEqual({ count: 7 });
  });

  test('normalizes an optional blank number without coercing it to zero', () => {
    const schema = fieldsToTypeBoxSchema([{ ...requiredNumber, required: false }]);
    const result = schema.Decode({ count: '' });

    expect(result.count).toBeUndefined();
    expect(result.count).not.toBe(0);
  });
});

describe('fieldsToTypeBoxSchema boolean fields', () => {
  test('parses explicit native-form boolean values without treating false as truthy', () => {
    const schema = fieldsToTypeBoxSchema([
      { key: 'active', label: 'Active', type: 'boolean', required: true },
    ]);

    expect(schema.Decode({ active: false })).toEqual({ active: false });
    expect(schema.Decode({ active: 'false' })).toEqual({ active: false });
    expect(schema.Decode({ active: '0' })).toEqual({ active: false });
    expect(schema.Decode({ active: 'off' })).toEqual({ active: false });
    expect(schema.Decode({ active: true })).toEqual({ active: true });
    expect(schema.Decode({ active: 'true' })).toEqual({ active: true });
    expect(schema.Decode({ active: '1' })).toEqual({ active: true });
    expect(schema.Decode({ active: 'on' })).toEqual({ active: true });
    expect(schema.Check({ active: 'unexpected' })).toBe(false);
  });
});

describe('fieldsToTypeBoxSchema custom field validation', () => {
  test('runs FieldDefinition.validate after type coercion', () => {
    const schema = fieldsToTypeBoxSchema([{
      key: 'age',
      label: 'Age',
      type: 'number',
      validate: (value) => typeof value === 'number' && value >= 18 ? null : 'Must be 18 or older',
    }]);

    const errors = [...schema.Errors({ age: '12' })];
    expect(errors[0]?.message).toBe('Must be 18 or older');
    expect(schema.Decode({ age: '18' })).toEqual({ age: 18 });
  });
});

describe('fieldsToTypeBoxSchema shared ResourceDefinition values', () => {
  test('preserves numeric option values submitted by native forms', () => {
    const schema = fieldsToTypeBoxSchema([
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

    expect(schema.Decode({ role: '1', teams: ['10', '20'] })).toEqual({
      role: 1,
      teams: [10, 20],
    });
    expect(schema.Check({ role: '999', teams: ['10'] })).toBe(false);
  });

  test('accepts the same URL values used by core image and images fields', () => {
    const schema = fieldsToTypeBoxSchema([
      { key: 'avatar', label: 'Avatar', type: 'image', required: true },
      { key: 'gallery', label: 'Gallery', type: 'images', required: true },
    ]);

    expect(schema.Decode({
      avatar: 'https://cdn.example/avatar.png',
      gallery: 'https://cdn.example/one.png\nhttps://cdn.example/two.png',
    })).toEqual({
      avatar: 'https://cdn.example/avatar.png',
      gallery: ['https://cdn.example/one.png', 'https://cdn.example/two.png'],
    });
  });

  test('preserves commas inside image URLs', () => {
    const schema = fieldsToTypeBoxSchema([
      { key: 'gallery', label: 'Gallery', type: 'images', required: true },
    ]);

    expect(schema.Decode({
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

describe('resourceToTypeBoxSchema primary key compatibility', () => {
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

    expect(resourceToTypeBoxSchema(resource, 'create').Decode({ title: 'Release' })).toEqual({
      title: 'Release',
    });
    expect(resourceToTypeBoxSchema(resource, 'edit').Decode({
      postId: 'post-1',
      title: 'Updated',
    })).toEqual({ title: 'Updated' });
  });
});

describe('fieldsToTypeBoxSchema file fields', () => {
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
    const schema = fieldsToTypeBoxSchema(requiredFileFields);

    const result = schema.Decode({
      attachment,
      avatar,
      gallery: [firstImage, secondImage],
    });

    expect(result).toEqual({ attachment, avatar, gallery: [firstImage, secondImage] });
  });

  test('rejects required empty native files and normalizes optional empty uploads', () => {
    const emptyFile = new File([], '');
    const requiredSchema = fieldsToTypeBoxSchema(requiredFileFields);
    const optionalSchema = fieldsToTypeBoxSchema(
      requiredFileFields.map((field) => ({ ...field, required: false })),
    );

    expect(requiredSchema.Check({
      attachment: emptyFile,
      avatar: emptyFile,
      gallery: [emptyFile],
    })).toBe(false);

    const optionalResult = optionalSchema.Decode({
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
      const optionalSchema = fieldsToTypeBoxSchema([
        { key: 'attachment', label: 'Attachment', type: 'file' },
      ]);
      const requiredSchema = fieldsToTypeBoxSchema([
        { key: 'attachment', label: 'Attachment', type: 'file', required: true },
      ]);

      expect(optionalSchema.Check({})).toBe(true);
      expect(requiredSchema.Check({ attachment: {} })).toBe(false);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'File', descriptor);
    }
  });

  test('does not require re-uploading stored files during edit but still rejects invalid replacements', () => {
    const editSchema = fieldsToTypeBoxSchema(requiredFileFields, 'edit');

    expect(editSchema.Decode({})).toEqual({});
    expect(editSchema.Check({ attachment: 'not-a-file' })).toBe(false);
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

    expect(fieldsToTypeBoxSchema([documentArray], 'edit').Decode(retained)).toEqual(retained);
    expect(fieldsToTypeBoxSchema([documentArray], 'create').Check(retained)).toBe(false);
    expect(fieldsToTypeBoxSchema([documentArray], 'edit').Check({
      documents: [{ gallery: ['/stored/first.png'] }],
    })).toBe(false);
  });
});
