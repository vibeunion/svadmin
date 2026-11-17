import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Alert from './alert.svelte';
import AlertTitle from './alert-title.svelte';

afterEach(() => cleanup());

const message = (text: string) => createRawSnippet(() => ({ render: () => `<p>${text}</p>` }));

describe('Alert', () => {
  it('renders a dismiss button only when closable', async () => {
    const onclose = vi.fn();
    const afterClose = vi.fn();
    render(Alert, { closable: true, closeLabel: 'Dismiss notice', onclose, afterClose, children: message('Saved') });
    await fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(onclose).toHaveBeenCalledTimes(1);
    expect(afterClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();

    render(Alert, { children: message('Info') });
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('alert').getAttribute('data-feedback')).toBe('static');
  });

  it('keeps alert title semantics', () => {
    render(AlertTitle, { children: message('Heads up') });
    expect(screen.getByText('Heads up')).toBeTruthy();
  });
});

  it("renders showIcon and title per the alert specification", () => {
    render(Alert, {
      variant: "warning",
      showIcon: true,
      title: "系统维护提醒",
      children: message("今晚 23:00 将进行系统升级。"),
    });

    expect(screen.getByText("系统维护提醒")).toBeTruthy();
    expect(screen.getByText("今晚 23:00 将进行系统升级。")).toBeTruthy();
    const icon = document.querySelector(".svadmin-alert__icon");
    expect(icon).not.toBeNull();
  });

  it("supports controlled visible and custom closeElement", () => {
    const { rerender } = render(Alert, {
      visible: false,
      title: "Hidden alert",
      children: message("Hidden content"),
    });
    expect(screen.queryByRole("alert")).toBeNull();

    const customClose = createRawSnippet(() => ({ render: () => `<span>Close Me</span>` }));
    rerender({
      visible: true,
      closable: true,
      closeElement: customClose,
      title: "Visible alert",
      children: message("Now visible"),
    });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Close Me")).toBeTruthy();
  });
