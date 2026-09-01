import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatCoreCompoundsHost from './chat-core-compounds.test-host.svelte';
import { messagesToMarkdown } from './conversation/index.js';
import { getStatusBadge } from './tool/index.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('chat core compound components', () => {
  it('renders confirmation, reasoning, sources, and tool state through context', () => {
    render(ChatCoreCompoundsHost);

    expect(screen.getByText('Approval is pending.')).not.toBeNull();
    expect(screen.queryByText('Approved.')).toBeNull();
    expect(screen.getByText('Inspecting the schema.')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Docs' }).getAttribute('href')).toBe('https://example.test/docs');
    expect(screen.getByText('Unsafe').closest('a')).toBeNull();
    expect(screen.getByText(/"id": 42/)).not.toBeNull();
    expect(screen.getByText(/"found": true/)).not.toBeNull();
    expect(getStatusBadge('output-available')).toMatchObject({ label: 'Completed', tone: 'success', icon: 'check-circle' });
  });

  it('cycles message branches through the shared branch context', async () => {
    render(ChatCoreCompoundsHost);

    expect(screen.getByText('Branch 1')).not.toBeNull();
    expect(screen.getByText('1 of 2')).not.toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Next branch' }));
    expect(screen.getByText('Branch 2')).not.toBeNull();
    expect(screen.getByText('2 of 2')).not.toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Next branch' }));
    expect(screen.getByText('Branch 1')).not.toBeNull();
  });

  it('serializes structured messages and downloads the generated markdown', async () => {
    const ondownload = vi.fn();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:conversation');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(ChatCoreCompoundsHost, { ondownload });

    expect(messagesToMarkdown([{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }], createdAt: 1 }])).toBe('**User:** Hello');
    await fireEvent.click(screen.getByRole('button', { name: 'Download conversation' }));

    expect(ondownload).toHaveBeenCalledWith('**Assistant:** Structured response');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:conversation');
  });
});
