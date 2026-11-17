import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import TypographyText from './TypographyText.svelte';
import MentionsInput from './MentionsInput.svelte';

describe('TypographyText and MentionsInput option parity', () => {
  it('renders TypographyText with bold, primary type, and disabled state', () => {
    const view = render(TypographyText, {
      text: '主要强调文本',
      type: 'primary',
      bold: true,
      disabled: true,
    });

    const el = view.container.querySelector('.svadmin-typography-text');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-type')).toBe('primary');
    expect(el?.classList.contains('is-strong')).toBe(true);
    expect(el?.getAttribute('data-disabled')).toBe('true');
    expect(view.container.textContent).toContain('主要强调文本');
  });

  it('renders MentionsInput with prefix and options aliases', async () => {
    const options = [
      { id: 'u1', label: '张三', subtitle: '工程师' },
      { id: 'u2', label: '李四', subtitle: '设计师' },
    ];

    const view = render(MentionsInput, {
      prefix: '@',
      options,
      split: ' ',
    });

    const textarea = view.container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();

    await fireEvent.input(textarea, { target: { value: '@' } });
    expect(view.container.textContent).toContain('张三');
    expect(view.container.textContent).toContain('李四');
  });
});
