import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import ProDescriptions from './ProDescriptions.svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

describe('ProDescriptions data, column, colon, and size options', () => {
  it('renders descriptions using data alias and column prop', () => {
    const { container } = render(ProDescriptions, {
      props: {
        title: 'User Info',
        column: 2,
        colon: true,
        size: 'mini',
        data: [
          { key: 'name', label: 'Name', value: 'John' },
          { key: 'role', label: 'Role', value: 'Admin' },
        ],
      },
    });
    const labels = container.querySelectorAll('.border-border');
    expect(labels.length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Name :');
    expect(container.textContent).toContain('John');
  });
});

describe('ConfirmDialog okText, content, and loading options', () => {
  it('supports okText alias and content prop', () => {
    render(ConfirmDialog, {
      props: {
        open: true,
        title: 'Delete Item',
        content: 'Are you sure?',
        okText: 'Proceed',
        cancelText: 'Dismiss',
        loading: true,
        onconfirm: vi.fn(),
        oncancel: vi.fn(),
      },
    });
    expect(document.body.textContent).toContain('Delete Item');
    expect(document.body.textContent).toContain('Are you sure?');
    expect(document.body.textContent).toContain('Proceed');
  });
});
