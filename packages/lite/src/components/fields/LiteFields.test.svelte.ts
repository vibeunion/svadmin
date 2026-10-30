import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteAvatarField from './LiteAvatarField.svelte';
import LiteCodeField from './LiteCodeField.svelte';
import LiteCopyField from './LiteCopyField.svelte';
import LiteCurrencyField from './LiteCurrencyField.svelte';
import LiteDateField from './LiteDateField.svelte';
import LiteMarkdownField from './LiteMarkdownField.svelte';
import LiteRichTextField from './LiteRichTextField.svelte';
import LiteDateRangeField from './LiteDateRangeField.svelte';
import LiteTagField from './LiteTagField.svelte';
import LiteTextField from './LiteTextField.svelte';
import LitePercentField from './LitePercentField.svelte';
import LitePhoneField from './LitePhoneField.svelte';
import LiteRatingField from './LiteRatingField.svelte';

describe('Lite Fields SSR rendering', () => {
  it('renders LiteAvatarField with image or initials fallback and status dot', () => {
    const withImg = render(LiteAvatarField, {
      src: 'https://example.com/avatar.png',
      name: 'Alice Johnson',
      status: 'online',
      showName: true,
      subtitle: 'Admin',
    });
    expect(withImg.container.querySelector('img')?.getAttribute('src')).toBe('https://example.com/avatar.png');
    expect(withImg.container.querySelector('.lite-avatar-dot-sm')).toBeTruthy();
    expect(withImg.container.textContent).toContain('Alice Johnson');
    expect(withImg.container.textContent).toContain('Admin');
    withImg.unmount();

    const withInitials = render(LiteAvatarField, {
      name: 'Bob Smith',
      showName: false,
    });
    expect(withInitials.container.querySelector('img')).toBeNull();
    expect(withInitials.container.querySelector('.lite-avatar-initials')?.textContent).toBe('BS');
  });

  it('renders LiteCodeField with language badge and pre block in show and edit mode', () => {
    const showView = render(LiteCodeField, {
      value: 'console.log("hello");',
      language: 'javascript',
      mode: 'show',
    });
    expect(showView.container.querySelector('.lite-badge')?.textContent).toBe('JAVASCRIPT');
    expect(showView.container.querySelector('pre')?.textContent).toContain('console.log("hello");');
    showView.unmount();

    const editView = render(LiteCodeField, {
      value: 'const x = 1;',
      mode: 'edit',
    });
    expect(editView.container.querySelector('textarea')?.value).toBe('const x = 1;');
  });

  it('renders LiteCopyField with raw text or masked display', () => {
    const showView = render(LiteCopyField, {
      value: 'secret-api-key-12345678',
      masked: true,
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('secr...5678');
    showView.unmount();

    const editView = render(LiteCopyField, {
      value: 'plain-token',
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('plain-token');
  });

  it('renders LiteCurrencyField with formatting and tone colors', () => {
    const showView = render(LiteCurrencyField, {
      value: 1250.5,
      currency: 'USD',
      locale: 'en-US',
      colored: true,
      tone: 'auto',
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('$1,250.50');
    expect(showView.container.querySelector('.lite-text-success')).toBeTruthy();
    showView.unmount();

    const editView = render(LiteCurrencyField, {
      value: 99.9,
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('99.9');
  });

  it('renders LiteDateRangeField formatted in show mode and two date inputs in edit mode', () => {
    const showView = render(LiteDateRangeField, {
      startDate: '2026-08-01',
      endDate: '2026-08-29',
      separator: '~',
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('~');
    showView.unmount();

    const editView = render(LiteDateRangeField, {
      startDate: '2026-08-01',
      endDate: '2026-08-29',
      mode: 'edit',
    });
    const inputs = editView.container.querySelectorAll('input[type="date"]');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('2026-08-01');
    expect((inputs[1] as HTMLInputElement).value).toBe('2026-08-29');
  });

  it('renders LitePercentField with precision and optional progress bar', () => {
    const showView = render(LitePercentField, {
      value: 0.854,
      scale: '1',
      precision: 1,
      showProgress: true,
      tone: 'auto',
      mode: 'show',
    });
    expect(showView.container.textContent).toContain('85.4%');
    expect(showView.container.querySelector('.lite-progress-track')).toBeTruthy();
    showView.unmount();

    const editView = render(LitePercentField, {
      value: 75,
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('75');
  });

  it('renders LitePhoneField with tel link in show mode and tel input in edit mode', () => {
    const showView = render(LitePhoneField, {
      value: '+1 (555) 234-5678',
      showIcon: true,
      clickable: true,
      mode: 'show',
    });
    expect(showView.container.querySelector('a')?.getAttribute('href')).toBe('tel:+15552345678');
    expect(showView.container.textContent).toContain('📞');
    showView.unmount();

    const editView = render(LitePhoneField, {
      value: '+15552345678',
      mode: 'edit',
    });
    expect((editView.container.querySelector('input[type="tel"]') as HTMLInputElement)?.value).toBe('+15552345678');
  });

  it('renders LiteRatingField with star symbols in show mode and number input in edit mode', () => {
    const showView = render(LiteRatingField, {
      value: 4.5,
      max: 5,
      showValue: true,
      mode: 'show',
    });
    expect(showView.container.querySelectorAll('.lite-rating-star-full')).toHaveLength(4);
    expect(showView.container.querySelectorAll('.lite-rating-star-half')).toHaveLength(1);
    expect(showView.container.textContent).toContain('4.5');
    showView.unmount();

    const editView = render(LiteRatingField, {
      value: 4,
      max: 5,
      mode: 'edit',
    });
    expect(editView.container.querySelector('input')?.value).toBe('4');
  });
});

describe('Lite native field domains', () => {
  it('renders date-only fields with a native date control and no UTC shift', () => {
    const view = render(LiteDateField, {
      mode: 'edit',
      value: '2024-03-15',
      field: {
        key: 'dueOn',
        label: 'Due on',
        type: 'date',
        required: true,
        dateInput: { min: '2024-01-01', max: '2024-12-31' },
      },
    });

    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('date');
    expect(input.value).toBe('2024-03-15');
    expect(input.getAttribute('min')).toBe('2024-01-01');
    expect(input.getAttribute('max')).toBe('2024-12-31');
    expect(input.required).toBe(true);
    expect(input.name).toBe('dueOn');
  });

  it('keeps datetime fields on datetime-local input', () => {
    const view = render(LiteDateField, {
      mode: 'edit',
      value: '2024-03-15T09:30:45Z',
      field: { key: 'startsAt', label: 'Starts at', type: 'datetime' },
    });

    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('datetime-local');
    expect(input.value).toBe('2024-03-15T09:30');
    expect(input.hasAttribute('min')).toBe(false);
  });

  it('maps time, datetime, colour, email, url and phone domains to native inputs', () => {
    const cases: Array<[FieldDefinition['type'], string, string, Record<string, unknown>?]> = [
      ['time', '09:30', 'time'],
      ['datetime', '2024-03-15T09:30', 'datetime-local'],
      ['color', '#165DFF', 'color'],
      ['email', 'ada@example.test', 'email'],
      ['url', 'https://example.test', 'url'],
      ['phone', '+8613800000000', 'tel'],
      ['text', 'plain', 'text'],
    ];

    for (const [type, value, expectedType] of cases) {
      const view = render(LiteTextField, {
        mode: 'edit',
        value,
        field: { key: 'value', label: 'Value', type },
      });
      const input = view.container.querySelector('input') as HTMLInputElement;
      expect([type, input.type]).toEqual([type, expectedType]);
      // Native colour inputs normalize hex to lower case.
      expect(input.value.toLowerCase()).toBe(value.toLowerCase());
      view.unmount();
    }
  });

  it('falls back to a text control for non-hex colour values', () => {
    const view = render(LiteTextField, {
      mode: 'edit',
      value: 'rgb(22, 93, 255)',
      field: { key: 'accent', label: 'Accent', type: 'color' },
    });

    const input = view.container.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text');
    expect(input.value).toBe('rgb(22, 93, 255)');

    const empty = render(LiteTextField, {
      mode: 'edit',
      value: '',
      field: { key: 'accent', label: 'Accent', type: 'color' },
    });
    const color = empty.container.querySelector('input') as HTMLInputElement;
    expect(color.type).toBe('color');
    expect(color.value).toBe('#000000');
  });

  it('submits one field per tag instead of a comma string', () => {
    const view = render(LiteTagField, {
      mode: 'edit',
      value: ['admin', 'internal'],
      field: { key: 'tags', label: 'Tags', type: 'tags', required: true },
    });

    const inputs = Array.from(view.container.querySelectorAll('input[type="text"]'));
    expect(inputs.map((input) => input.getAttribute('name'))).toEqual(['tags', 'tags', 'tags']);
    expect(inputs.map((input) => input.value)).toEqual(['admin', 'internal', '']);
    expect(inputs.map((input) => input.getAttribute('aria-label'))).toEqual([
      'Tags 1',
      'Tags 2',
      'Tags (new)',
    ]);
    expect(view.getByText(/One tag per field/u)).toBeTruthy();
  });

  it('keeps tag display mode as badges without inputs', () => {
    const view = render(LiteTagField, {
      mode: 'show',
      value: ['admin'],
      field: { key: 'tags', label: 'Tags', type: 'tags' },
    });

    expect(view.container.querySelector('input')).toBeNull();
    expect(view.getByText('admin').className).toContain('lite-badge');
  });
});

describe('Lite rich content fields', () => {
  it('renders a Markdown preview server-side and keeps the source editable', () => {
    const view = render(LiteMarkdownField, {
      mode: 'show',
      value: '# Release notes\n\n- **shipped** a fix\n- linked [docs](https://example.test/docs)',
      field: { key: 'notes', label: 'Notes', type: 'markdown' },
    });

    const preview = view.container.querySelector('.lite-markdown-preview');
    expect(preview?.querySelector('h1')?.textContent).toBe('Release notes');
    expect(preview?.querySelectorAll('li')).toHaveLength(2);
    expect(preview?.querySelector('strong')?.textContent).toBe('shipped');
    expect(preview?.querySelector('a')?.getAttribute('href')).toBe('https://example.test/docs');

    const empty = render(LiteMarkdownField, {
      mode: 'show',
      value: '',
      field: { key: 'notes', label: 'Notes', type: 'markdown' },
    });
    expect(empty.container.textContent).toContain('—');
    expect(empty.container.querySelector('.lite-markdown-preview')).toBeNull();

    const editable = render(LiteMarkdownField, {
      mode: 'edit',
      value: '## Draft',
      field: { key: 'notes', label: 'Notes', type: 'markdown', required: true },
    });
    const textarea = editable.container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('## Draft');
    expect(textarea.required).toBe(true);
    expect(editable.container.querySelector('.lite-markdown-preview h2')?.textContent).toBe('Draft');
  });

  it('sanitizes rich HTML before rendering and previews it while editing', () => {
    const view = render(LiteRichTextField, {
      mode: 'show',
      value: '<p>Hello <strong>team</strong></p><script>alert(1)</script><img src="javascript:alert(1)" alt="x">',
      field: { key: 'body', label: 'Body', type: 'richtext' },
    });

    const preview = view.container.querySelector('.lite-rich-preview');
    expect(preview?.querySelector('strong')?.textContent).toBe('team');
    expect(view.container.innerHTML).not.toContain('script');
    expect(view.container.innerHTML).not.toContain('javascript:');

    const editable = render(LiteRichTextField, {
      mode: 'edit',
      value: '**bold** source',
      field: { key: 'body', label: 'Body', type: 'richtext' },
    });
    const textarea = editable.container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('**bold** source');
    // Markdown source is rendered for preview instead of being shown as HTML.
    expect(editable.container.querySelector('.lite-rich-preview strong')?.textContent).toBe('bold');
  });
});
