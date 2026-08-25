import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import FeedbackNotice from './content/FeedbackNotice.svelte';
import FeedbackNoticeHarness from './feedback-notice.test-harness.svelte';

describe('FeedbackNotice', () => {
  it('uses polite status semantics for contextual feedback', () => {
    render(FeedbackNotice, { message: 'Policy context' });

    const notice = screen.getByRole('status');
    expect(notice.getAttribute('aria-live')).toBe('polite');
    expect(notice.getAttribute('data-tone')).toBe('info');
  });

  it('uses assertive alert semantics for blocking feedback', () => {
    render(FeedbackNotice, {
      message: 'Unable to continue',
      tone: 'danger',
      priority: 'blocking',
    });

    const notice = screen.getByRole('alert');
    expect(notice.getAttribute('aria-live')).toBe('assertive');
    expect(notice.getAttribute('data-priority')).toBe('blocking');
  });

  it('renders the single action supplied by the owning workflow', () => {
    render(FeedbackNoticeHarness);

    expect(screen.getByRole('button', { name: 'Resolve now' })).not.toBeNull();
  });
});
