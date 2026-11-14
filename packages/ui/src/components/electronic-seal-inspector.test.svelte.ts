import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ElectronicSealInspector, {
  type ElectronicSealInfo
} from './ElectronicSealInspector.svelte';

const mockSeal: ElectronicSealInfo = {
  id: 'seal-001',
  sealName: '北京极客未来数字科技有限公司 合同专用章',
  sealType: 'contract',
  enterpriseName: '北京极客未来数字科技有限公司',
  creditCode: '91110108MA01ABCD12',
  sealCode: '1101080098765',
  signerName: '张经理',
  signerDepartment: '法务风控部',
  status: 'valid',
  documentHashMatch: true,
  certificate: {
    issuer: '中国金融认证中心 (CFCA)',
    subject: 'CN=北京极客未来数字科技有限公司, OU=企业认证部, O=CFCA, C=CN',
    serialNumber: '7B3A99201F82E601C2',
    algorithm: 'SM2-with-SM3',
    validFrom: '2024-01-01 00:00:00',
    validTo: '2027-01-01 23:59:59',
    fingerprintSha256: '9A:B3:7C:12:F4:55:EE:88:21:44:90:3A:1B:5C:7D:99:EE:AA:FF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89'
  },
  timestamp: {
    tsaName: '国家授时中心可信时间戳服务 (NTSC TSA)',
    stampedAt: '2026-11-14 15:32:08 CST',
    timestampTokenId: 'TSA-TOKEN-8839210-SHA256-VALID',
    verified: true
  },
  auditLogs: [
    {
      id: 'log-1',
      step: 'CA 根证书信任链核验',
      status: 'pass',
      message: 'CFCA 根证书存在于权威信任锚列表中，未见异常',
      checkedAt: '2026-11-14 15:32:09'
    },
    {
      id: 'log-2',
      step: '文档数字指纹比对',
      status: 'pass',
      message: '电子文档哈希计算值与签名验签结果一致，文档未遭篡改',
      checkedAt: '2026-11-14 15:32:09'
    }
  ]
};

describe('ElectronicSealInspector Component', () => {
  it('renders seal details, svg stamp preview, and status badge', () => {
    const { container } = render(ElectronicSealInspector, {
      props: {
        seal: mockSeal
      }
    });

    const root = container.querySelector('[data-svadmin-component="ElectronicSealInspector"]');
    expect(root).toBeTruthy();

    expect(container.textContent).toContain('北京极客未来数字科技有限公司 合同专用章');
    expect(container.textContent).toContain('验真通过 · 真实有效');
    expect(container.textContent).toContain('91110108MA01ABCD12');
    expect(container.textContent).toContain('中国金融认证中心 (CFCA)');
    expect(container.textContent).toContain('国家授时中心可信时间戳服务');
  });

  it('displays warning when document hash is tampered', () => {
    const tamperedSeal: ElectronicSealInfo = {
      ...mockSeal,
      documentHashMatch: false,
      status: 'tampered'
    };

    const { container } = render(ElectronicSealInspector, {
      props: {
        seal: tamperedSeal
      }
    });

    expect(container.textContent).toContain('文档已被篡改');
  });

  it('triggers onRevalidate and onExportReport callbacks', async () => {
    const onRevalidate = vi.fn();
    const onExportReport = vi.fn();

    const { container } = render(ElectronicSealInspector, {
      props: {
        seal: mockSeal,
        onRevalidate,
        onExportReport
      }
    });

    const revalidateBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('重新验真')
    );
    expect(revalidateBtn).toBeTruthy();
    if (revalidateBtn) {
      await fireEvent.click(revalidateBtn);
      expect(onRevalidate).toHaveBeenCalledWith('seal-001');
    }

    const exportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('验真凭据')
    );
    expect(exportBtn).toBeTruthy();
    if (exportBtn) {
      await fireEvent.click(exportBtn);
      expect(onExportReport).toHaveBeenCalledWith(mockSeal);
    }
  });
});
