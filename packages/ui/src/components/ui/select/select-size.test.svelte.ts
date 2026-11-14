import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Select from './select.svelte';

describe('native select sizes', () => {
  it('exposes official heights and a borderless type', () => {
    const mini = render(Select, { size: 'mini', 'aria-label': 'Mini' });
    expect(mini.getByLabelText('Mini').getAttribute('data-size')).toBe('mini');
    expect(mini.getByLabelText('Mini').getAttribute('data-select-type')).toBe('default');

    const small = render(Select, { size: 'small', 'aria-label': 'Small' });
    expect(small.getByLabelText('Small').getAttribute('data-size')).toBe('small');

    const large = render(Select, { size: 'large', borderless: true, 'aria-label': 'Large' });
    const node = large.getByLabelText('Large');
    expect(node.getAttribute('data-size')).toBe('large');
    expect(node.getAttribute('data-select-type')).toBe('borderless');
  });
});
