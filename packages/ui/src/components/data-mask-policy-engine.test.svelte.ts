import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DataMaskPolicyEngine from './DataMaskPolicyEngine.svelte';

describe('DataMaskPolicyEngine component suite', () => {
  it('renders masking policies table with fields and sensitivity badges', () => {
    const { getByText } = render(DataMaskPolicyEngine, {
      title: '脱敏策略中心'
    });

    expect(getByText('脱敏策略中心')).toBeTruthy();
    expect(getByText('mobile_phone')).toBeTruthy();
    expect(getByText('resident_id_card')).toBeTruthy();
    expect(getByText('实时脱敏算法沙箱验证')).toBeTruthy();
  });

  it('updates test preview when sample changes', async () => {
    const { getByLabelText, getByText } = render(DataMaskPolicyEngine);

    const input = getByLabelText('测试明文数据样本:');
    await fireEvent.input(input, { target: { value: '18888888888' } });

    expect(getByText('188****8888')).toBeTruthy();
  });

  it('toggles policy enable switch and triggers onSavePolicies', async () => {
    let savedPolicies: unknown = null;
    const { container } = render(DataMaskPolicyEngine, {
      onSavePolicies: (p) => {
        savedPolicies = p;
      }
    });

    const checkbox = container.querySelector('input[type="checkbox"]');
    if (checkbox) {
      await fireEvent.click(checkbox);
      expect(savedPolicies).toBeTruthy();
    }
  });
});
