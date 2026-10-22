import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import SvadminLogo from './SvadminLogo.svelte';

describe('SvadminLogo', () => {
  it('exposes a host-facing logo hook', () => {
    const view = render(SvadminLogo, { size: 24 });
    expect(view.container.querySelector('[data-svadmin-logo]')).not.toBeNull();
  });
});