import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import AttachmentsHost from './Attachments.test-host.svelte';
import * as AttachmentsExports from './index.js';
import { getAttachmentLabel, getMediaCategory } from './attachments.js';

afterEach(cleanup);

describe('attachments compound components', () => {
  it('exports the complete official runtime surface', () => {
    expect(Object.keys(AttachmentsExports)).toEqual(expect.arrayContaining([
      'getMediaCategory', 'getAttachmentLabel', 'useAttachmentsContext', 'useAttachmentContext',
      'Attachments', 'Attachment', 'AttachmentPreview', 'AttachmentInfo', 'AttachmentRemove',
      'AttachmentHoverCard', 'AttachmentHoverCardTrigger', 'AttachmentHoverCardContent', 'AttachmentEmpty',
    ]));
  });

  it('categorizes files and source documents with stable labels', () => {
    expect(getMediaCategory({ id: 'image', type: 'file', mediaType: 'image/png' })).toBe('image');
    expect(getMediaCategory({ id: 'video', type: 'file', mediaType: 'video/mp4' })).toBe('video');
    expect(getMediaCategory({ id: 'audio', type: 'file', mediaType: 'audio/mpeg' })).toBe('audio');
    expect(getMediaCategory({ id: 'document', type: 'file', mediaType: 'text/plain' })).toBe('document');
    expect(getMediaCategory({ id: 'source', type: 'source-document', title: 'API docs' })).toBe('source');
    expect(getAttachmentLabel({ id: 'source', type: 'source-document', title: 'API docs' })).toBe('API docs');
    expect(getAttachmentLabel({ id: 'legacy', name: 'legacy.txt', mediaType: 'text/plain' })).toBe('legacy.txt');
  });

  it('shares attachment context across preview, info, and remove parts', async () => {
    const view = render(AttachmentsHost);

    expect(view.getByText('report.pdf')).not.toBeNull();
    expect(view.getByText('application/pdf')).not.toBeNull();
    expect(view.container.querySelector('[data-category="document"]')).not.toBeNull();

    await fireEvent.click(view.getByRole('button', { name: 'Delete report' }));
    expect(view.getByRole('status', { name: 'Attachment state' }).textContent).toBe('removed');
  });

  it('opens the hover card from pointer or focus and closes it with Escape', async () => {
    const view = render(AttachmentsHost);
    const trigger = view.getByText('Inspect attachment');

    await fireEvent.mouseEnter(trigger);
    expect(await view.findByRole('dialog')).not.toBeNull();
    expect(view.getByText('Attachment details')).not.toBeNull();

    await fireEvent.keyDown(trigger, { key: 'Escape' });
    await waitFor(() => expect(view.queryByRole('dialog')).toBeNull());

    await fireEvent.focus(trigger);
    expect(await view.findByRole('dialog')).not.toBeNull();
  });
});
