import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import ElectronicSealStamp from './ElectronicSealStamp.svelte';

describe('ElectronicSealStamp component suite', () => {
  it('renders vector seal stamp with company and serial number', () => {
    const { container } = render(ElectronicSealStamp, {
      companyName: '测试集团有限公司',
      sealTitle: '合同专用章',
      serialNumber: '9901020088712'
    });

    const root = container.querySelector('[data-svadmin-component="ElectronicSealStamp"]');
    expect(root).toBeTruthy();
    expect(container.textContent).toContain('测试集团有限公司');
    expect(container.textContent).toContain('合同专用章');
    expect(container.textContent).toContain('9901020088712');
  });

  it('renders approved status stamp badge', () => {
    const { container } = render(ElectronicSealStamp, {
      type: 'approved'
    });

    expect(container.textContent).toContain('已通过');
  });
});
