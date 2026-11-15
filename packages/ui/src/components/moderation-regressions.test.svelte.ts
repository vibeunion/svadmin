import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { scanContent, type SensitiveWordItem, type ModerationTicket } from './moderation-utils.js';
import SensitiveWordAuditor from './SensitiveWordAuditor.svelte';
import ContentModerationCenter from './ContentModerationCenter.svelte';

function word(text: string, replacement?: string): SensitiveWordItem {
  return { id: text, word: text, category: 'custom', action: 'mask', severity: 'low',
    enabled: true, ...(replacement === undefined ? {} : { replacement }) };
}
describe('moderation regressions', () => {
  it('does not rescan replacements', () => {
    expect(scanContent('ab', [word('a', 'b'), word('b', 'x')]).maskedText).toBe('bx');
  });
  it('covers overlapping intervals independently of dictionary order', () => {
    expect(scanContent('abc', [word('ab'), word('bc')]).maskedText).toBe('***');
    expect(scanContent('abc', [word('bc'), word('ab')]).maskedText).toBe('***');
    expect(scanContent('ababa', [word('aba')]).maskedText).toBe('*****');
  });
  it('keeps original unicode offsets and escapes literal regex punctuation', () => {
    expect(scanContent('İa.a', [word('a.')]).maskedText).toBe('İ**a');
  });
  it('keeps explicit empty caller datasets empty', () => {
    const words = render(SensitiveWordAuditor, { words: [] });
    expect(words.container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(words.container.textContent).toContain('没有找到匹配的敏感词');
    const tickets = render(ContentModerationCenter, { tickets: [] });
    expect(tickets.container.textContent).toContain('当前无待处理');
    expect(tickets.queryByRole('button', { name: '脱敏后发布' })).toBeNull();
  });
  it('publishes masked content without changing the caller audit record', async () => {
    const onMaskPublish = vi.fn();
    const ticket: ModerationTicket = { id: 'caller', title: 'CALLER', sourceModule: 'test',
      author: 'caller', submittedAt: 'today', status: 'pending', riskScore: 1, rawContent: 'ab',
      matches: scanContent('ab', [word('a', 'b'), word('b', 'x')]).matches };
    const view = render(ContentModerationCenter, { tickets: [ticket], onMaskPublish });
    await fireEvent.click(view.getByRole('button', { name: '脱敏后发布' }));
    expect(onMaskPublish).toHaveBeenCalledWith(expect.objectContaining({ rawContent: 'bx', status: 'masked' }));
    expect(ticket.rawContent).toBe('ab');
    expect(ticket.status).toBe('pending');
  });
});
