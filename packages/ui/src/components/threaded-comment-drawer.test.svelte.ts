import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ThreadedCommentDrawer, { type ThreadedComment } from './ThreadedCommentDrawer.svelte';

describe('ThreadedCommentDrawer suite', () => {
  const initialComments: ThreadedComment[] = [
    {
      id: 'c1',
      author: '审计员小张',
      content: '请核实发票附件与开票信息一致性。',
      createdAt: '5 分钟前',
      isResolved: false,
      reactions: { '👍': 3 },
    },
  ];

  it('renders threaded comments stream with author and content', () => {
    render(ThreadedCommentDrawer, {
      open: true,
      comments: initialComments,
    });

    expect(document.body.textContent).toContain('审计员小张');
    expect(document.body.textContent).toContain('请核实发票附件与开票信息一致性。');
    expect(document.body.textContent).toContain('3');
  });

  it('triggers onAddComment when sending a new comment', async () => {
    const onAddComment = vi.fn();
    render(ThreadedCommentDrawer, {
      open: true,
      comments: initialComments,
      onAddComment,
    });

    const textarea = document.body.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    if (textarea) {
      await fireEvent.input(textarea, { target: { value: '已复核完毕，无误。' } });
      const sendBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('发送') || b.textContent?.includes('Send'),
      );
      expect(sendBtn).toBeTruthy();
      if (sendBtn) {
        await fireEvent.click(sendBtn);
        expect(onAddComment).toHaveBeenCalledWith('已复核完毕，无误。', undefined);
      }
    }
  });
});
