import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Host from './error-component.test-host.svelte';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorComponent default failure UI', () => {
  it.each([
    {
      locale: 'zh-CN',
      title: '出错了',
      description: '系统发生了一些问题，请稍后再试或联系支持人员。',
      retryLabel: '重试',
    },
    {
      locale: 'en',
      title: 'Something went wrong',
      description: 'Something went wrong on our end. Please try again later or contact support.',
      retryLabel: 'Retry',
    },
  ])('renders localized defaults without raw keys for $locale', async ({ locale, title, description, retryLabel }) => {
    const retry = vi.fn();
    const view = render(Host, {
      locale,
      error: new Error('PRIVATE_DIAGNOSTIC'),
      retry,
    });

    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(view.getByText(title)).toBeTruthy();
    expect(view.getByText(description)).toBeTruthy();
    expect(view.baseElement.textContent).not.toContain('error.title');
    expect(view.baseElement.textContent).not.toContain('error.description');
    expect(view.baseElement.textContent).not.toContain('buttons.retry');

    await fireEvent.click(view.getByRole('button', { name: retryLabel }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('uses explicit title and description instead of defaults and the diagnostic message', () => {
    const view = render(Host, {
      error: new Error('PRIVATE_DIAGNOSTIC'),
      title: 'Safe host title',
      description: 'Safe host description',
    });

    expect(view.baseElement.textContent).not.toContain('PRIVATE_DIAGNOSTIC');
    expect(view.getByText('Safe host title')).toBeTruthy();
    expect(view.getByText('Safe host description')).toBeTruthy();
  });

  it('keeps host legacy translations ahead of core fallbacks', () => {
    const view = render(Host, {
      locale: 'en',
      translations: {
        'error.title': 'Legacy title',
        'error.description': 'Legacy description',
        'buttons.retry': 'Legacy retry',
      },
      retry: vi.fn(),
    });

    expect(view.getByText('Legacy title')).toBeTruthy();
    expect(view.getByText('Legacy description')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Legacy retry' })).toBeTruthy();
  });
});
