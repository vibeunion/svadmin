import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import QRCode from './QRCode.svelte';
import Calendar from './Calendar.svelte';
import Tour from './Tour.svelte';
import Slider from './Slider.svelte';
import RangeSlider from './RangeSlider.svelte';
import SegmentedControl from './SegmentedControl.svelte';
import Watermark from './Watermark.svelte';

describe('QRCode, Calendar, and Tour option parity', () => {
  it('renders QRCode with bordered={false} and center icon', () => {
    const view = render(QRCode, {
      value: 'https://example.com',
      bordered: false,
      icon: 'https://example.com/logo.png',
      iconSize: 32,
    });

    const figure = view.container.querySelector('figure[data-slot="qr-code"]');
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute('data-bordered')).toBe('false');
    expect(figure?.classList.contains('border-0')).toBe(true);
    const img = view.container.querySelector('img[src="https://example.com/logo.png"]');
    expect(img).not.toBeNull();
  });

  it('QRCode supports onRefresh callback alias in expired status', async () => {
    const onRefresh = vi.fn();
    const view = render(QRCode, {
      value: 'https://example.com',
      status: 'expired',
      onRefresh,
    });

    const btn = view.container.querySelector('.svadmin-qr-code__refresh-btn');
    expect(btn).not.toBeNull();
    if (btn) {
      await fireEvent.click(btn);
      expect(onRefresh).toHaveBeenCalled();
    }
  });

  it('renders Calendar with panel alias', () => {
    const view = render(Calendar, {
      value: '2026-11-17',
      panel: true,
    });

    const calendar = view.container.querySelector('.svadmin-calendar');
    expect(calendar?.getAttribute('data-card')).toBe('true');
    expect(calendar?.classList.contains('svadmin-calendar--card')).toBe(true);
  });

  it('renders Tour with mask={false} and defaultCurrent', () => {
    const steps = [
      { title: '步骤 1', description: '第一步说明' },
      { title: '步骤 2', description: '第二步说明' },
    ];

    const view = render(Tour, {
      steps,
      open: true,
      mask: false,
      defaultCurrent: 1,
    });

    const tour = view.container.querySelector('[data-svadmin-component="TourGuide"]');
    expect(tour).not.toBeNull();
    expect(tour?.getAttribute('data-mask')).toBe('false');
    expect(view.container.querySelector('.svadmin-tour__dismiss')).toBeNull();
    expect(view.container.textContent).toContain('步骤 2');
  });

  it('Tour supports visible and onChange, onClose callbacks', async () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    const steps = [
      { title: 'Step 1', description: 'Description 1' },
      { title: 'Step 2', description: 'Description 2' },
    ];

    const view = render(Tour, {
      steps,
      visible: true,
      onChange,
      onClose,
    });

    const tour = view.container.querySelector('[data-svadmin-component="TourGuide"]');
    expect(tour).not.toBeNull();

    const nextBtn = view.container.querySelector('.svadmin-tour__button.is-primary');
    if (nextBtn) {
      await fireEvent.click(nextBtn);
      expect(onChange).toHaveBeenCalledWith(1);
    }

    const skipBtn = view.container.querySelector('.svadmin-tour__footer > .svadmin-tour__button');
    if (skipBtn) {
      await fireEvent.click(skipBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('Slider, RangeSlider, SegmentedControl, and Watermark support design system parity options', async () => {
    const onSliderChange = vi.fn();
    const sliderView = render(Slider, {
      value: 20,
      onChange: onSliderChange,
    });
    const sliderInput = sliderView.container.querySelector('input[type="range"]') as HTMLInputElement;
    await fireEvent.input(sliderInput, { target: { value: '45' } });
    expect(onSliderChange).toHaveBeenCalledWith(45);

    const onRangeChange = vi.fn();
    const rangeView = render(RangeSlider, {
      value: { min: 10, max: 80 },
      onChange: onRangeChange,
    });
    const rangeInputs = rangeView.container.querySelectorAll('input[type="range"]');
    await fireEvent.input(rangeInputs[0], { target: { value: '25' } });
    expect(onRangeChange).toHaveBeenCalledWith({ min: 25, max: 80 });

    const onSegChange = vi.fn();
    const segView = render(SegmentedControl, {
      options: ['Daily', 'Weekly', 'Monthly'],
      value: 'Daily',
      ariaLabel: 'Frequency',
      onChange: onSegChange,
    });
    const buttons = segView.container.querySelectorAll('button');
    await fireEvent.click(buttons[1]);
    expect(onSegChange).toHaveBeenCalledWith('Weekly');

    const wmView = render(Watermark, {
      content: 'CONFIDENTIAL',
      style: 'opacity: 0.8;',
    });
    const wmEl = wmView.container.querySelector('[data-svadmin-watermark-wrapper]') as HTMLElement;
    expect(wmEl.style.cssText).toContain('opacity');
  });
});
