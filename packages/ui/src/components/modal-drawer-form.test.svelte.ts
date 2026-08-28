import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import ModalForm from './ModalForm.svelte';
import DrawerForm from './DrawerForm.svelte';

describe('ModalForm and DrawerForm Components', () => {
  it('renders ModalForm trigger button', () => {
    const view = render(ModalForm, {
      title: 'New Member',
      triggerText: 'Add Member',
    });
    expect(view.container.textContent).toContain('Add Member');
  });

  it('renders DrawerForm trigger button', () => {
    const view = render(DrawerForm, {
      title: 'Edit Config',
      triggerText: 'Configure',
    });
    expect(view.container.textContent).toContain('Configure');
  });
});
