import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MediaAuthenticityAuditCard, {
  type MediaAuthenticityData
} from './MediaAuthenticityAuditCard.svelte';

const mockData: MediaAuthenticityData = {
  id: 'media-001',
  fileName: '20261114_现场查勘照片_车损核定.jpg',
  fileSizeMb: 3.8,
  mimeType: 'image/jpeg',
  riskLevel: 'safe',
  tamperConfidencePercent: 8,
  exif: {
    make: 'Apple',
    model: 'iPhone 15 Pro Max',
    fNumber: 'f/1.8',
    exposureTime: '1/120s',
    iso: 'ISO 64',
    focalLength: '24mm',
    capturedAt: '2026-11-14 14:22:05',
    software: 'iOS 18.1 Camera'
  },
  location: {
    latitude: 39.9042,
    longitude: 116.4074,
    altitudeMeters: 45,
    addressText: '北京市东城区东长安街 1 号'
  },
  watermark: {
    detected: true,
    tenantId: 'TENANT-INSURANCE-009',
    userId: 'SURVEYOR-8821',
    securityDigest: 'SHA256-D7A8B12C330F9'
  },
  auditFindings: [
    'EXIF 原始快门与设备哈希匹配',
    '未见图像处理软件重编码签名',
    '隐形数字盲水印校验通过'
  ]
};

describe('MediaAuthenticityAuditCard Component', () => {
  it('renders file details, EXIF meta, and authenticity status', () => {
    const { container } = render(MediaAuthenticityAuditCard, {
      props: {
        data: mockData
      }
    });

    const root = container.querySelector('[data-svadmin-component="MediaAuthenticityAuditCard"]');
    expect(root).toBeTruthy();

    expect(container.textContent).toContain('20261114_现场查勘照片_车损核定.jpg');
    expect(container.textContent).toContain('原始可信 · 未见篡改');
    expect(container.textContent).toContain('Apple iPhone 15 Pro Max');
    expect(container.textContent).toContain('北京市东城区东长安街 1 号');
    expect(container.textContent).toContain('TENANT-INSURANCE-009');
    expect(container.textContent).toContain('8%');
  });

  it('triggers onRecheck and onExportEvidence callbacks', async () => {
    const onRecheck = vi.fn();
    const onExportEvidence = vi.fn();

    const { container } = render(MediaAuthenticityAuditCard, {
      props: {
        data: mockData,
        onRecheck,
        onExportEvidence
      }
    });

    const recheckBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('重新核验')
    );
    expect(recheckBtn).toBeTruthy();
    if (recheckBtn) {
      await fireEvent.click(recheckBtn);
      expect(onRecheck).toHaveBeenCalledWith('media-001');
    }

    const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('防伪存证')
    );
    expect(exportBtn).toBeTruthy();
    if (exportBtn) {
      await fireEvent.click(exportBtn);
      expect(onExportEvidence).toHaveBeenCalledWith(mockData);
    }
  });
});
