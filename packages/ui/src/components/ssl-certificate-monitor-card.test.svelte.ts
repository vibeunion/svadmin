import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SslCertificateMonitorCard, {
  type SslCertificateData
} from './SslCertificateMonitorCard.svelte';

const mockCert: SslCertificateData = {
  id: 'cert-001',
  domain: 'api.svadmin.enterprise.io',
  sanDomains: ['api.svadmin.enterprise.io', '*.api.svadmin.enterprise.io', 'gateway.svadmin.io'],
  issuer: 'DigiCert Global Root CA',
  validFrom: '2026-01-01',
  validTo: '2026-12-31',
  daysRemaining: 18,
  algorithm: 'ECDSA P-256',
  tlsVersions: ['TLS 1.2', 'TLS 1.3'],
  ocspStaplingEnabled: true,
  autoRenewEnabled: true,
  chainComplete: true
};

describe('SslCertificateMonitorCard Component', () => {
  it('renders domain, days remaining, and warning status for 18 days', () => {
    const { container } = render(SslCertificateMonitorCard, {
      props: {
        certificate: mockCert
      }
    });

    const root = container.querySelector('[data-svadmin-component="SslCertificateMonitorCard"]');
    expect(root).toBeTruthy();

    expect(container.textContent).toContain('api.svadmin.enterprise.io');
    expect(container.textContent).toContain('到期预警 (18天)');
    expect(container.textContent).toContain('DigiCert Global Root CA');
    expect(container.textContent).toContain('自动续期已开启');
    expect(container.textContent).toContain('ECDSA P-256');
    expect(container.textContent).toContain('*.api.svadmin.enterprise.io');
  });

  it('triggers onTriggerAutoRenew and onRecheckChain callbacks', async () => {
    const onTriggerAutoRenew = vi.fn();
    const onRecheckChain = vi.fn();

    const { container } = render(SslCertificateMonitorCard, {
      props: {
        certificate: mockCert,
        onTriggerAutoRenew,
        onRecheckChain
      }
    });

    const renewBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('立即续期')
    );
    expect(renewBtn).toBeTruthy();
    if (renewBtn) {
      await fireEvent.click(renewBtn);
      expect(onTriggerAutoRenew).toHaveBeenCalledWith('cert-001');
    }

    const recheckBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('校验证书链')
    );
    expect(recheckBtn).toBeTruthy();
    if (recheckBtn) {
      await fireEvent.click(recheckBtn);
      expect(onRecheckChain).toHaveBeenCalledWith('cert-001');
    }
  });
});
