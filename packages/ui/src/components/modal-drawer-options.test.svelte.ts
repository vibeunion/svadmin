import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import DrawerForm from './DrawerForm.svelte';
import ModalForm from './ModalForm.svelte';

describe('DrawerForm placement and width options', () => {
  it('supports placement="left" and custom numeric width', () => {
    render(DrawerForm, {
      props: {
        open: true,
        title: 'Edit Item',
        placement: 'left',
        width: 480,
      },
    });
    const sheet = document.body.querySelector('[data-slot="sheet"]');
    expect(sheet?.getAttribute('data-side')).toBe('left');
    expect(sheet?.getAttribute('style')).toContain('width: 480px');
  });
});

describe('ModalForm size, maskClosable, and width options', () => {
  it('supports size="lg" and maskClosable={true}', () => {
    render(ModalForm, {
      props: {
        open: true,
        title: 'Create Item',
        size: 'lg',
        maskClosable: true,
        width: 600,
      },
    });
    const dialog = document.body.querySelector('[data-slot="dialog-content"]');
    expect(dialog?.getAttribute('data-dialog-size')).toBe('lg');
    expect(dialog?.getAttribute('data-close-on-overlay')).toBe('true');
    expect(dialog?.getAttribute('style')).toContain('width: 600px');
  });
});
