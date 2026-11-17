import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import Collapse from './Collapse.svelte';
import Carousel from './Carousel.svelte';
import Calendar from './Calendar.svelte';
import MentionsInput from './MentionsInput.svelte';

const emptySnippet = () => createRawSnippet(() => ({ render: () => '<span></span>' }));

describe('Collapse, Carousel, Calendar, and MentionsInput option parity', () => {
  it('supports onChange in Collapse', async () => {
    const onChange = vi.fn();
    const view = render(Collapse, {
      items: [
        { key: 'panel-a', header: '面板 A', content: emptySnippet() },
      ],
      onChange,
    });

    const btn = view.container.querySelector('button.svadmin-collapse__trigger');
    expect(btn).not.toBeNull();
    if (btn) {
      await fireEvent.click(btn);
      expect(onChange).toHaveBeenCalledWith(['panel-a']);
    }
  });

  it('supports defaultCurrent and onChange in Carousel', async () => {
    const onChange = vi.fn();
    const view = render(Carousel, {
      count: 3,
      defaultCurrent: 1,
      onChange,
      children: createRawSnippet<[number]>((getIndex) => ({
        render: () => `<div>Slide ${getIndex?.() ?? 0}</div>`,
      })),
    });

    const dots = view.container.querySelectorAll('.svadmin-carousel__dots button');
    expect(dots.length).toBe(3);
    const selectedDot = dots[1];
    const nextDot = dots[2];
    expect(selectedDot).toBeDefined();
    expect(nextDot).toBeDefined();
    if (selectedDot && nextDot) {
      expect(selectedDot.getAttribute('aria-selected')).toBe('true');

      await fireEvent.click(nextDot);
      expect(onChange).toHaveBeenCalledWith(2);
    }
  });

  it('supports defaultValue and onChange in Calendar', async () => {
    const onChange = vi.fn();
    const view = render(Calendar, {
      defaultValue: '2026-11-17',
      onChange,
    });

    const selectedDay = view.container.querySelector('button.is-selected');
    expect(selectedDay?.getAttribute('aria-label')).toBe('2026-11-17');

    const otherDay = view.container.querySelector('button.svadmin-calendar__day:not(.is-selected):not(:disabled)');
    expect(otherDay).not.toBeNull();
    if (otherDay) {
      await fireEvent.click(otherDay);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('supports defaultValue and onChange in MentionsInput', async () => {
    const onChange = vi.fn();
    const view = render(MentionsInput, {
      defaultValue: 'Initial message',
      onChange,
    });

    const textarea = view.container.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe('Initial message');

    await fireEvent.input(textarea, { target: { value: 'Updated message' } });
    expect(onChange).toHaveBeenCalledWith('Updated message');
  });
});
