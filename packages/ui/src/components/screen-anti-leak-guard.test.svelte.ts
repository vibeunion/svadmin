import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import ScreenAntiLeakGuard from './ScreenAntiLeakGuard.svelte';

describe('ScreenAntiLeakGuard component suite', () => {
  it('renders watermark overlay with company and employee text', () => {
    const { container } = render(ScreenAntiLeakGuard, {
      text: '张伟 (EMP-01)',
      subtext: '内部机密'
    });

    const root = container.querySelector('[data-svadmin-component="ScreenAntiLeakGuard"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('张伟 (EMP-01)');
    expect(container.textContent).toContain('内部机密');
  });
});
