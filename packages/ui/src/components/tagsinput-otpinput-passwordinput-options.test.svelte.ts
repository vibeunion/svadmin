import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TagsInput from './TagsInput.svelte';
import OtpInput from './OtpInput.svelte';
import PasswordInput from './PasswordInput.svelte';

describe('TagsInput, OtpInput, and PasswordInput option parity', () => {
  it('TagsInput supports defaultValue, size, status, and readonly', () => {
    const { container } = render(TagsInput, {
      props: {
        defaultValue: ['tag1', 'tag2'],
        size: 'small',
        status: 'error',
        readonly: true,
      },
    });

    const root = container.querySelector('.svadmin-tags-input');
    expect(root?.getAttribute('data-size')).toBe('small');
    expect(root?.getAttribute('data-status')).toBe('error');
    expect(root?.getAttribute('data-readonly')).toBe('true');
    expect(container.textContent).toContain('tag1');
    expect(container.textContent).toContain('tag2');

    const input = container.querySelector('input:not([type="hidden"])') as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it('OtpInput supports defaultValue, status, and readonly', () => {
    const { container } = render(OtpInput, {
      props: {
        defaultValue: '123456',
        status: 'error',
        readonly: true,
      },
    });

    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBe(6);
    expect(inputs[0]?.value).toBe('1');
    expect(inputs[0]?.readOnly).toBe(true);
    expect(inputs[0]?.getAttribute('aria-invalid')).toBe('true');
  });

  it('PasswordInput supports visibilityToggle, defaultVisibility, and status', () => {
    const { container } = render(PasswordInput, {
      props: {
        id: 'pwd-1',
        value: 'Secret123!',
        visibilityToggle: false,
        status: 'warning',
      },
    });

    const root = container.querySelector('[data-svadmin-password-input]');
    expect(root?.getAttribute('data-status')).toBe('warning');
    expect(container.querySelector('[data-svadmin-password-toggle]')).toBeNull();

    const { container: container2 } = render(PasswordInput, {
      props: {
        id: 'pwd-2',
        value: 'Secret123!',
        visibilityToggle: true,
        defaultVisibility: true,
      },
    });
    expect(container2.querySelector('[data-svadmin-password-toggle]')).not.toBeNull();
    const input = container2.querySelector('input') as HTMLInputElement;
    expect(input.type).toBe('text');
  });
});
