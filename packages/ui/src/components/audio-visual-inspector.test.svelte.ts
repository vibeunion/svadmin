import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AudioVisualInspector, {
  type AudioVisualMediaMeta,
  type ViolationMarker
} from './AudioVisualInspector.svelte';

const mockMedia: AudioVisualMediaMeta = {
  title: '20261114_客服呼叫中心录音_10086.wav',
  mediaType: 'audio',
  durationSeconds: 180,
  fileSizeMb: 14.2,
  format: 'WAV',
  sampleRateOrResolution: '44.1kHz / 16bit',
  operatorName: '李客服 (工号: 9527)'
};

const mockViolations: ViolationMarker[] = [
  {
    id: 'v-1',
    timestampSeconds: 45,
    title: '未按规范向客户主动报工号',
    level: 'minor',
    deduction: 5,
    description: '通话开场白未包含工号播报要求。'
  },
  {
    id: 'v-2',
    timestampSeconds: 110,
    title: '违规承诺高收益未揭示风险',
    level: 'critical',
    deduction: 30,
    description: '推介理财产品时使用“保本无风险”等违禁用语。'
  }
];

describe('AudioVisualInspector Component', () => {
  it('renders root container, media meta, and calculates final score', () => {
    const { container } = render(AudioVisualInspector, {
      props: {
        media: mockMedia,
        violations: mockViolations,
        maxScore: 100
      }
    });

    const root = container.querySelector('[data-svadmin-component="AudioVisualInspector"]');
    expect(root).toBeTruthy();

    expect(container.textContent).toContain('20261114_客服呼叫中心录音_10086.wav');
    expect(container.textContent).toContain('李客服 (工号: 9527)');
    // 100 - (5 + 30) = 65 -> rework (待复核整改)
    expect(container.textContent).toContain('65');
    expect(container.textContent).toContain('待复核整改');
    expect(container.textContent).toContain('累计扣分：-35 分');
  });

  it('triggers seek callback when clicking violation marker or time bar', async () => {
    const onSeek = vi.fn();
    const { container } = render(AudioVisualInspector, {
      props: {
        media: mockMedia,
        violations: mockViolations,
        onSeek
      }
    });

    const violationItem = container.querySelector('[data-violation-id="v-1"]');
    expect(violationItem).toBeTruthy();
    if (violationItem) {
      await fireEvent.click(violationItem);
      expect(onSeek).toHaveBeenCalledWith(45);
    }
  });

  it('adds a new violation marker', async () => {
    const onAddViolation = vi.fn();
    const { container } = render(AudioVisualInspector, {
      props: {
        media: mockMedia,
        violations: mockViolations,
        currentTime: 75,
        onAddViolation
      }
    });

    const input = container.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    if (input) {
      await fireEvent.input(input, { target: { value: '语速过快' } });
      const addBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('打标')
      );
      expect(addBtn).toBeTruthy();
      if (addBtn) {
        await fireEvent.click(addBtn);
        expect(onAddViolation).toHaveBeenCalledWith(75, '语速过快', 'minor');
      }
    }
  });
});
