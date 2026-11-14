import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import MediaGallery, { type MediaGalleryItem } from './MediaGallery.svelte';

describe('MediaGallery Component', () => {
  const mockItems: MediaGalleryItem[] = [
    { id: '1', src: '/img1.png', title: '设计稿大图', type: 'image', size: '2.4 MB', dimensions: '1920x1080' },
    { id: '2', src: '/video.mp4', title: '系统演示视频', type: 'video', size: '15.8 MB' },
    { id: '3', src: '/audio.mp3', title: '会议录音', type: 'audio', size: '3.1 MB' },
    { id: '4', src: '/contract.pdf', title: '商务合同文档', type: 'document', size: '840 KB' },
    { id: '5', src: '/img5.png', title: '架构拓扑图', type: 'image' },
  ];

  it('renders thumbnails with correct grid attributes', () => {
    const { container } = render(MediaGallery, {
      props: {
        items: mockItems,
        gridCols: 3,
        maxDisplay: 4,
      },
    });

    const root = container.querySelector('[data-svadmin-component="MediaGallery"]');
    expect(root).toBeTruthy();

    const cards = container.querySelectorAll('.aspect-video');
    expect(cards.length).toBe(4);

    const overflowBadge = container.querySelector('.backdrop-blur-xs');
    expect(overflowBadge?.textContent).toContain('+2');
  });

  it('opens and closes lightbox on thumbnail click', async () => {
    const onItemClick = vi.fn();
    const { container } = render(MediaGallery, {
      props: {
        items: mockItems,
        onItemClick,
      },
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();

    const firstThumb = container.querySelector('.aspect-video');
    expect(firstThumb).toBeTruthy();
    if (firstThumb) {
      await fireEvent.click(firstThumb);
    }

    expect(onItemClick).toHaveBeenCalledWith(mockItems[0], 0);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('设计稿大图');

    const closeBtn = dialog?.querySelector('button[title*="关闭"]');
    expect(closeBtn).toBeTruthy();
    if (closeBtn) {
      await fireEvent.click(closeBtn);
    }

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('navigates next and previous items via controls', async () => {
    const { container } = render(MediaGallery, {
      props: {
        items: mockItems,
      },
    });

    const firstThumb = container.querySelector('.aspect-video');
    if (firstThumb) {
      await fireEvent.click(firstThumb);
    }

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('1 / 5');

    const nextBtn = dialog?.querySelector('button[title*="下一张"]');
    expect(nextBtn).toBeTruthy();
    if (nextBtn) {
      await fireEvent.click(nextBtn);
    }
    expect(dialog?.textContent).toContain('2 / 5');

    const prevBtn = dialog?.querySelector('button[title*="上一张"]');
    expect(prevBtn).toBeTruthy();
    if (prevBtn) {
      await fireEvent.click(prevBtn);
    }
    expect(dialog?.textContent).toContain('1 / 5');
  });

  it('toggles metadata drawer correctly', async () => {
    const { container } = render(MediaGallery, {
      props: {
        items: mockItems,
        enableMetadataDrawer: true,
      },
    });

    const firstThumb = container.querySelector('.aspect-video');
    if (firstThumb) {
      await fireEvent.click(firstThumb);
    }

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.querySelector('aside')).toBeNull();

    const infoBtn = dialog?.querySelector('button[title="详情信息"]');
    expect(infoBtn).toBeTruthy();
    if (infoBtn) {
      await fireEvent.click(infoBtn);
    }

    const drawer = dialog?.querySelector('aside');
    expect(drawer).toBeTruthy();
    expect(drawer?.textContent).toContain('资源元数据');
    expect(drawer?.textContent).toContain('1920x1080');
    expect(drawer?.textContent).toContain('2.4 MB');
  });

  it('renders watermark protection when watermarkText is provided', async () => {
    const { container } = render(MediaGallery, {
      props: {
        items: mockItems,
        watermarkText: 'CONFIDENTIAL-CORP-SEC',
      },
    });

    const firstThumb = container.querySelector('.aspect-video');
    if (firstThumb) {
      await fireEvent.click(firstThumb);
    }

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('CONFIDENTIAL-CORP-SEC');
  });
  it('disables every document download path and unsafe download protocols', async () => {
    const onDownload = vi.fn();
    const { container, unmount } = render(MediaGallery, { props: { items: [mockItems[3] as MediaGalleryItem], enableDownload: false, onDownload } });
    const thumbnail = container.querySelector('button');
    if (!thumbnail) throw new Error('missing thumbnail');
    await fireEvent.click(thumbnail);
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('下载此文档');
    expect(document.querySelector('button[title="下载文件"]')).toBeNull();
    unmount();
    const unsafe = render(MediaGallery, { props: { items: [{ id: 'unsafe', type: 'document', src: 'javascript:alert(1)' }] } });
    const unsafeThumbnail = unsafe.container.querySelector('button');
    if (unsafeThumbnail) await fireEvent.click(unsafeThumbnail);
    expect(document.querySelector<HTMLButtonElement>('button[title="下载文件"]')?.disabled).toBe(true);
    expect(onDownload).not.toHaveBeenCalled();
  });
  it('tracks the active media by ID and closes when that media is removed', async () => {
    const { container, rerender } = render(MediaGallery, { props: { items: mockItems } });
    const thumbnail = container.querySelector('button');
    if (thumbnail) await fireEvent.click(thumbnail);
    await rerender({ items: [...mockItems].reverse() });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('设计稿大图');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('5 / 5');
    await rerender({ items: [] });
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await rerender({ items: mockItems });
    await fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('preserves media control arrow keys and closes through the dialog Escape handler', async () => {
    const { container } = render(MediaGallery, { props: { items: mockItems } });
    const thumbnails = container.querySelectorAll('button');
    const videoThumbnail = thumbnails[1];
    if (videoThumbnail) await fireEvent.click(videoThumbnail);
    const video = document.querySelector('video');
    if (!video) throw new Error('missing video');
    await fireEvent.keyDown(video, { key: 'ArrowRight' });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('2 / 5');
    await fireEvent.keyDown(video, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });

});
