import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { providers, safeExternalUrl } from '../open-in-chat/providers.js';
import WorkflowComponentsTestHost from './WorkflowComponentsTestHost.svelte';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('workflow and code compounds', () => {
  it('copies code, commit hashes, and environment exports', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const oncodecopy = vi.fn();
    const oncommitcopy = vi.fn();
    const onenvcopy = vi.fn();
    render(WorkflowComponentsTestHost, { oncodecopy, oncommitcopy, onenvcopy });

    await fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Copy commit hash' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Copy export' }));

    expect(writeText.mock.calls.map(([value]) => value)).toEqual([
      'const answer = 42;\nreturn answer;',
      'abc123',
      'export SECRET="top-secret"',
    ]);
    expect(oncodecopy).toHaveBeenCalledOnce();
    expect(oncommitcopy).toHaveBeenCalledOnce();
    expect(onenvcopy).toHaveBeenCalledOnce();
  });

  it('toggles sensitive values, reasoning, tools, language, and sandbox tabs', async () => {
    render(WorkflowComponentsTestHost);
    expect(screen.getByLabelText('Hidden value').textContent).toBe('**********');
    await fireEvent.click(screen.getByRole('switch', { name: 'Toggle value visibility' }));
    expect(screen.getByText('top-secret')).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: /Chain of Thought/ }));
    expect(screen.getByText('Inspect schemas')).not.toBeNull();
    await fireEvent.click(screen.getByText('Search the web'));
    expect(screen.getByText(/"query"/)).not.toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Choose code language' }));
    await fireEvent.click(screen.getByRole('option', { name: 'JavaScript' }));
    expect(screen.getByTestId('language').textContent).toBe('javascript');

    await fireEvent.click(screen.getByRole('tab', { name: 'Result' }));
    expect(screen.getByText('Result output')).not.toBeNull();
    expect(screen.queryByText('Log output')).toBeNull();
  });

  it('submits multiple selected options and trimmed free text once', async () => {
    const onquestionsubmit = vi.fn().mockResolvedValue(undefined);
    render(WorkflowComponentsTestHost, { onquestionsubmit });

    const submit = screen.getByRole('button', { name: 'Submit' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));
    await fireEvent.input(screen.getByRole('textbox', { name: 'Question details' }), { target: { value: '  details  ' } });
    await fireEvent.click(submit);

    await waitFor(() => expect(onquestionsubmit).toHaveBeenCalledOnce());
    expect(onquestionsubmit.mock.calls[0]?.[0]).toEqual({ selectedValues: ['alpha', 'beta'], text: 'details' });
  });

  it('encodes provider queries and rejects unsafe external protocols', async () => {
    render(WorkflowComponentsTestHost);
    await fireEvent.click(screen.getByRole('button', { name: /Open in chat/ }));
    const chatgpt = screen.getByRole('menuitem', { name: /Open in ChatGPT/ }) as HTMLAnchorElement;
    expect(new URL(chatgpt.href).searchParams.get('prompt')).toBe('hello & world');
    expect(screen.getByRole('menuitem', { name: 'Unsafe' }).tagName).toBe('BUTTON');
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(providers.github.createUrl('https://evil.example/repo')).toBeUndefined();
    expect(providers.github.createUrl('https://github.com/svadmin/ai-elements')).toContain('github.com');
  });
});
