import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import InputGroupHarness from '../../test/fixtures/InputGroupHarness.svelte';

describe('InputGroup', () => {
  it('renders addons around the control and keeps a single labelled group', () => {
    const { container, getByRole } = render(InputGroupHarness, { props: { value: 'svadmin' } });
    const group = container.querySelector('.svadmin-input-group');
    expect(group).not.toBeNull();
    expect(group?.getAttribute('data-has-before')).toBe('true');
    expect(group?.getAttribute('data-has-after')).toBe('true');
    expect(getByRole('group', { name: 'Domain' })).toBe(group);

    const addons = container.querySelectorAll('.svadmin-input-group__addon');
    expect(addons).toHaveLength(2);
    expect(addons[0]?.textContent?.trim()).toBe('https://');
    expect(addons[1]?.textContent?.trim()).toBe('.com');

    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('svadmin');
  });

  it('reflects invalid and disabled states on the group container', () => {
    const { container, rerender } = render(InputGroupHarness, {
      props: { invalid: true, disabled: true },
    });
    const group = container.querySelector('.svadmin-input-group');
    expect(group?.getAttribute('data-invalid')).toBe('true');
    expect(group?.getAttribute('data-disabled')).toBe('true');
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true);

    rerender({ invalid: false, disabled: false });
    expect(container.querySelector('.svadmin-input-group')?.getAttribute('data-invalid')).toBeNull();
    expect(container.querySelector('.svadmin-input-group')?.getAttribute('data-disabled')).toBeNull();
  });
});