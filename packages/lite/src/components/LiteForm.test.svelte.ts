import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import type { FieldDefinition, ResourceDefinition } from '@svadmin/core';
import LiteForm from './LiteForm.svelte';

vi.mock('@svadmin/core/i18n', () => ({
  t: (key: string) => key,
}));

const contactsField: FieldDefinition = {
  key: 'contacts',
  label: 'Contacts',
  type: 'array',
  required: true,
  subFields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'age', label: 'Age', type: 'number' },
    { key: 'active', label: 'Active', type: 'boolean' },
  ],
};

const optionalContactsField: FieldDefinition = {
  ...contactsField,
  required: false,
};

const uploadFields: FieldDefinition[] = [
  { key: 'attachment', label: 'Attachment', type: 'file', required: true },
  { key: 'avatar', label: 'Avatar', type: 'image', required: true },
  { key: 'gallery', label: 'Gallery', type: 'images', required: true },
];

const documentArrayField: FieldDefinition = {
  key: 'documents',
  label: 'Documents',
  type: 'array',
  subFields: [
    { key: 'attachment', label: 'Attachment', type: 'file', required: true },
    { key: 'gallery', label: 'Gallery', type: 'images', required: true },
  ],
};

describe('LiteForm array fields', () => {
  it('renders existing array values with unique bracketed names', () => {
    const { container } = render(LiteForm, {
      fields: [contactsField],
      values: {
        contacts: [
          { name: 'Alice', age: 42, active: true },
          { name: 'Bob', age: 35, active: false },
        ],
      },
    });

    expect((container.querySelector('[name="contacts[0][name]"]') as HTMLInputElement | null)?.value).toBe('Alice');
    expect((container.querySelector('[name="contacts[1][name]"]') as HTMLInputElement | null)?.value).toBe('Bob');
    expect(container.querySelectorAll('[data-lite-array-item]')).toHaveLength(2);
  });

  it('allows an optional empty array to submit zero rows while retaining a no-JS draft row', () => {
    const { container } = render(LiteForm, {
      fields: [optionalContactsField],
      values: {},
    });

    const form = container.querySelector('form');
    const draftName = container.querySelector<HTMLInputElement>('[name="contacts[0][name]"]');
    expect(container.querySelectorAll('[data-lite-array-item]')).toHaveLength(1);
    expect(container.querySelector('[data-lite-array-draft]')).toBeTruthy();
    expect((container.querySelector('[name="contacts[0][_present]"]') as HTMLInputElement | null)?.value).toBe('1');
    expect(draftName?.required).toBe(false);
    expect(form?.checkValidity()).toBe(true);
    expect(container.querySelector('template[data-lite-array-template]')).toBeTruthy();
    expect(
      container.querySelector<HTMLTemplateElement>('template[data-lite-array-template]')
        ?.content.querySelector<HTMLInputElement>('[name="contacts[__INDEX__][name]"]')
        ?.required,
    ).toBe(true);
  });

  it('applies explicit defaults to initial and enhancement-template array rows', () => {
    const defaultsField: FieldDefinition = {
      key: 'settings',
      label: 'Settings',
      type: 'array',
      subFields: [
        { key: 'name', label: 'Name', type: 'text', defaultValue: 'Untitled' },
        { key: 'retries', label: 'Retries', type: 'number', defaultValue: 3 },
        { key: 'active', label: 'Active', type: 'boolean', defaultValue: true },
        { key: 'metadata', label: 'Metadata', type: 'json', defaultValue: { source: 'lite' } },
      ],
    };
    const { container } = render(LiteForm, { fields: [defaultsField] });

    expect(container.querySelector<HTMLInputElement>('[name="settings[0][name]"]')?.value).toBe('Untitled');
    expect(container.querySelector<HTMLInputElement>('[name="settings[0][retries]"]')?.value).toBe('3');
    expect(container.querySelector<HTMLInputElement>('[name="settings[0][active]"]')?.checked).toBe(true);
    expect(container.querySelector<HTMLTextAreaElement>('[name="settings[0][metadata]"]')?.value)
      .toBe('{\n  "source": "lite"\n}');

    const template = container.querySelector<HTMLTemplateElement>('template[data-lite-array-template]');
    expect(template?.content.querySelector<HTMLInputElement>('[name="settings[__INDEX__][name]"]')?.value)
      .toBe('Untitled');
    expect(template?.content.querySelector<HTMLInputElement>('[name="settings[__INDEX__][active]"]')?.checked)
      .toBe(true);
  });

  it('keeps required child constraints for real rows and bypasses them for no-JS removal', () => {
    const { container } = render(LiteForm, {
      fields: [optionalContactsField],
      values: { contacts: [{ name: '' }] },
    });

    const form = container.querySelector<HTMLFormElement>('form');
    const nameInput = container.querySelector<HTMLInputElement>('[name="contacts[0][name]"]');
    const removeSubmitter = container.querySelector<HTMLButtonElement>('[name="contacts[0][_delete]"]');

    expect(container.querySelector('[data-lite-array-draft]')).toBeNull();
    expect(nameInput?.required).toBe(true);
    expect(form?.checkValidity()).toBe(false);
    expect(removeSubmitter?.type).toBe('submit');
    expect(removeSubmitter?.formNoValidate).toBe(true);
    expect(removeSubmitter?.textContent?.trim()).toBe('Remove item');
    expect(removeSubmitter?.name).toBe('contacts[0][_delete]');
    expect(removeSubmitter?.value).toBe('1');
  });

  it('keeps file uploads native while image fields retain shared URL semantics', () => {
    const createView = render(LiteForm, {
      fields: uploadFields,
      mode: 'create',
      values: {
        attachment: '/stored/report.pdf',
        avatar: '/stored/avatar.png',
        gallery: ['/stored/first.png'],
      },
    });
    const createInputs = createView.container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(createInputs).toHaveLength(1);
    expect(Array.from(createInputs).every((input) => input.required)).toBe(true);
    expect(Array.from(createInputs).every((input) => !input.hasAttribute('value'))).toBe(true);
    expect(createView.container.querySelector<HTMLInputElement>('[name="avatar"]')?.value).toBe('/stored/avatar.png');
    expect(createView.container.querySelector<HTMLTextAreaElement>('[name="gallery"]')?.value).toBe('/stored/first.png');
    createView.unmount();

    const editView = render(LiteForm, {
      fields: uploadFields,
      mode: 'edit',
      values: {
        attachment: '/stored/report.pdf',
        avatar: '/stored/avatar.png',
        gallery: ['/stored/first.png'],
      },
    });
    const editInputs = editView.container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(Array.from(editInputs).every((input) => input.required === false)).toBe(true);
    expect(Array.from(editInputs).every((input) => !input.hasAttribute('value'))).toBe(true);
    editView.unmount();

    const missingEditView = render(LiteForm, {
      fields: uploadFields,
      mode: 'edit',
      values: {},
    });
    expect(
      Array.from(missingEditView.container.querySelectorAll<HTMLInputElement>('input[type="file"]'))
        .every((input) => input.required),
    ).toBe(true);
  });

  it('does not require stored array uploads again during edit but requires new rows and create mode', () => {
    const editView = render(LiteForm, {
      fields: [documentArrayField],
      mode: 'edit',
      values: {
        documents: [{
          attachment: '/stored/report.pdf',
          gallery: ['/stored/first.png'],
        }],
      },
    });
    const storedEditInputs = editView.container.querySelectorAll<HTMLInputElement>('[data-lite-array-item] input[type="file"]');
    expect(Array.from(storedEditInputs).every((input) => input.required === false)).toBe(true);
    expect(
      editView.container.querySelector<HTMLInputElement>('[type="hidden"][name="documents[0][attachment]"]')?.value,
    ).toBe('/stored/report.pdf');
    expect(editView.container.querySelector<HTMLTextAreaElement>('[name="documents[0][gallery]"]')?.value)
      .toBe('/stored/first.png');
    const editTemplateInputs = editView.container
      .querySelector<HTMLTemplateElement>('template[data-lite-array-template]')
      ?.content.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(Array.from(editTemplateInputs ?? []).every((input) => input.required)).toBe(true);
    editView.unmount();

    const createView = render(LiteForm, {
      fields: [documentArrayField],
      mode: 'create',
      values: {
        documents: [{
          attachment: '/stored/report.pdf',
          gallery: ['/stored/first.png'],
        }],
      },
    });
    expect(
      Array.from(createView.container.querySelectorAll<HTMLInputElement>('[data-lite-array-item] input[type="file"]'))
        .every((input) => input.required),
    ).toBe(true);
    expect(createView.container.querySelector<HTMLTextAreaElement>('[name="documents[0][gallery]"]')?.value)
      .toBe('/stored/first.png');
  });
});

describe('LiteForm ResourceDefinition compatibility', () => {
  it('excludes the primary key and applies create defaults with option type parity', () => {
    const resource = {
      name: 'members',
      label: 'Members',
      primaryKey: 'memberId',
      fields: [
        { key: 'memberId', label: 'Member ID', type: 'text', required: true },
        { key: 'name', label: 'Name', type: 'text', defaultValue: 'New member' },
        {
          key: 'role',
          label: 'Role',
          type: 'select',
          defaultValue: 1,
          options: [{ label: 'Admin', value: 1 }, { label: 'Editor', value: 2 }],
        },
      ],
    } satisfies ResourceDefinition;

    const view = render(LiteForm, {
      fields: resource.fields,
      resource,
      mode: 'create',
    });
    const { container } = view;

    expect(container.querySelector('[name="memberId"]')).toBeNull();
    expect(container.querySelector<HTMLInputElement>('[name="name"]')?.value).toBe('New member');
    expect(container.querySelector<HTMLSelectElement>('[name="role"]')?.value).toBe('1');
  });

  it('retains numeric option values returned after server validation fails', () => {
    const fields: FieldDefinition[] = [{
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [{ label: 'Admin', value: 1 }, { label: 'Editor', value: 2 }],
    }, {
      key: 'teams',
      label: 'Teams',
      type: 'multiselect',
      options: [{ label: 'Core', value: 10 }, { label: 'Docs', value: 20 }],
    }];
    const { container } = render(LiteForm, {
      fields,
      values: { role: '2', teams: ['10', 20] },
    });

    const select = container.querySelector<HTMLSelectElement>('[name="role"]');
    expect(Array.from(select?.options ?? []).map((option) => [option.value, option.selected])).toEqual([
      ['', false],
      ['1', false],
      ['2', true],
    ]);
    expect(Array.from(container.querySelectorAll<HTMLOptionElement>('[name="teams"] option'))
      .filter((option) => option.selected)
      .map((option) => option.value)).toEqual(['10', '20']);
  });

  it('renders password and shared image values as native text controls', () => {
    const fields: FieldDefinition[] = [
      { key: 'password', label: 'Password', type: 'password' },
      { key: 'avatar', label: 'Avatar', type: 'image', required: true },
      { key: 'gallery', label: 'Gallery', type: 'images', required: true },
    ];
    const { container } = render(LiteForm, {
      fields,
      values: {
        avatar: 'https://cdn.example/avatar.png',
        gallery: ['https://cdn.example/one.png', 'https://cdn.example/two.png'],
      },
    });

    expect(container.querySelector<HTMLInputElement>('[name="password"]')?.type).toBe('password');
    expect(container.querySelector<HTMLInputElement>('[name="avatar"]')?.value).toBe('https://cdn.example/avatar.png');
    expect(container.querySelector<HTMLTextAreaElement>('[name="gallery"]')?.value).toBe(
      'https://cdn.example/one.png\nhttps://cdn.example/two.png',
    );
  });

  it('round-trips JSON objects and populated relation records', () => {
    const fields: FieldDefinition[] = [
      { key: 'metadata', label: 'Metadata', type: 'json', defaultValue: { active: true } },
      {
        key: 'owner',
        label: 'Owner',
        type: 'relation',
        optionValue: 'userId',
        options: [{ label: 'Alice', value: 7 }],
      },
    ];
    const { container } = render(LiteForm, {
      fields,
      values: { owner: { userId: 7, name: 'Alice' } },
    });

    expect(container.querySelector<HTMLTextAreaElement>('[name="metadata"]')?.value)
      .toBe('{\n  "active": true\n}');
    expect(container.querySelector<HTMLSelectElement>('[name="owner"]')?.value).toBe('7');
  });
});
