import { describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import ModalForm from './ModalForm.svelte';
import DrawerForm from './DrawerForm.svelte';

const testSnippet = (text: string) => createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));

describe('ModalForm enterprise design system options', () => {
  it('supports visible prop, onVisibleChange, onOk, and onCancel', async () => {
    const onOk = vi.fn();
    const onCancel = vi.fn();
    const onVisibleChange = vi.fn();

    render(ModalForm, {
      props: {
        title: 'Edit Resource',
        visible: true,
        onOk,
        onCancel,
        onVisibleChange,
        children: testSnippet('Form Content'),
      },
    });

    const dialog = document.body.querySelector('.svadmin-dialog-form');
    expect(dialog).not.toBeNull();
    expect(document.body.textContent).toContain('Form Content');

    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(b => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeDefined();
    if (cancelBtn) await fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalled();
    expect(onVisibleChange).toHaveBeenCalledWith(false);
  });

  it('supports defaultVisible and destroyOnClose', () => {
    render(ModalForm, {
      props: {
        title: 'Uncontrolled Closed Form',
        defaultVisible: false,
        destroyOnClose: true,
        children: testSnippet('Sensitive Data'),
      },
    });

    expect(document.body.querySelector('.svadmin-dialog-form')).toBeNull();
    expect(document.body.textContent).not.toContain('Sensitive Data');
  });

  it('supports custom and hidden footer', () => {
    render(ModalForm, {
      props: {
        title: 'No Footer Modal',
        open: true,
        footer: false,
      },
    });

    const submitBtn = Array.from(document.body.querySelectorAll('button')).find(b => b.textContent?.includes('Confirm'));
    expect(submitBtn).toBeUndefined();
  });
});

describe('DrawerForm enterprise design system options', () => {
  it('supports visible, confirmLoading, onOk and onCancel', async () => {
    const onOk = vi.fn();
    const onCancel = vi.fn();
    const onVisibleChange = vi.fn();

    render(DrawerForm, {
      props: {
        title: 'Drawer Config',
        visible: true,
        confirmLoading: false,
        onOk,
        onCancel,
        onVisibleChange,
        children: testSnippet('Drawer Payload'),
      },
    });

    const sheet = document.body.querySelector('[data-slot="sheet"]');
    expect(sheet).not.toBeNull();
    expect(document.body.textContent).toContain('Drawer Payload');

    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(b => b.textContent?.includes('Cancel'));
    expect(cancelBtn).toBeDefined();
    if (cancelBtn) await fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalled();
    expect(onVisibleChange).toHaveBeenCalledWith(false);
  });

  it('supports destroyOnClose and hidden footer', () => {
    render(DrawerForm, {
      props: {
        title: 'Drawer Without Footer',
        visible: false,
        destroyOnClose: true,
        footer: false,
        children: testSnippet('Hidden Drawer Items'),
      },
    });

    expect(document.body.querySelector('[data-slot="sheet"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Hidden Drawer Items');
  });
});
