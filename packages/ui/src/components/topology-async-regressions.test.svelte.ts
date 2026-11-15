import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SslCertificateMonitorCard, { type SslCertificateData } from './SslCertificateMonitorCard.svelte';
import TrafficTopologyInspector from './TrafficTopologyInspector.svelte';

const certificate: SslCertificateData = { id: 'a', domain: 'caller.example', issuer: 'caller',
  validFrom: '2026-10-01', validTo: '2027-01-01', daysRemaining: 60 };
function deferred() {
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
describe('certificate truth and async ownership', () => {
  it('separates expiry, unknown fields, and reported security facts', async () => {
    const view = render(SslCertificateMonitorCard, { certificate });
    expect(view.container.textContent).not.toMatch(/核验完备|RSA 2048|TLS 1.2|TLS 1.3|高安全/);
    expect(view.container.textContent).toContain('证书链状态未知');
    expect(view.container.textContent).toContain('未提供');
    expect((view.getByRole('button', { name: '校验证书链' }) as HTMLButtonElement).disabled).toBe(true);
    await view.rerender({ certificate: { ...certificate, chainComplete: false, tlsVersions: [],
      ocspStaplingEnabled: false, algorithm: 'CALLER_ECDSA' } });
    expect(view.container.textContent).toContain('证书链不完整');
    expect(view.container.textContent).toContain('未报告支持版本');
    expect(view.container.textContent).toContain('CALLER_ECDSA');
    expect(view.container.textContent).toContain('未启用');
  });
  it('holds independent renew and chain locks until their own callbacks settle', async () => {
    const renew = deferred(), check = deferred();
    const onTriggerAutoRenew = vi.fn(() => renew.promise), onRecheckChain = vi.fn(() => check.promise);
    const view = render(SslCertificateMonitorCard, { certificate, onTriggerAutoRenew, onRecheckChain });
    const renewButton = view.getByRole('button', { name: '立即续期' }) as HTMLButtonElement;
    const checkButton = view.getByRole('button', { name: '校验证书链' }) as HTMLButtonElement;
    await fireEvent.click(renewButton);
    await fireEvent.click(checkButton);
    await new Promise(resolve => setTimeout(resolve, 550));
    expect(renewButton.disabled).toBe(true);
    expect(checkButton.disabled).toBe(true);
    check.resolve();
    await waitFor(() => expect(checkButton.disabled).toBe(false));
    expect(renewButton.disabled).toBe(true);
    renew.reject(new Error('sensitive'));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('续期失败'));
    expect(view.container.textContent).not.toContain('sensitive');
  });
  it('invalidates old completion across A to B to A switches', async () => {
    const old = deferred(), fresh = deferred();
    const onRecheckChain = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const view = render(SslCertificateMonitorCard, { certificate, onRecheckChain });
    await fireEvent.click(view.getByRole('button', { name: '校验证书链' }));
    await view.rerender({ certificate: { ...certificate, id: 'b' }, onRecheckChain });
    await view.rerender({ certificate, onRecheckChain });
    await fireEvent.click(view.getByRole('button', { name: '校验证书链' }));
    old.reject(new Error('stale'));
    await Promise.resolve();
    expect(view.queryByRole('alert')).toBeNull();
    expect((view.getByRole('button', { name: '校验证书链' }) as HTMLButtonElement).disabled).toBe(true);
    fresh.resolve();
  });
  it.each(['renew', 'check'] as const)('keeps %s locked when only the other callback changes', async action => {
    const task = deferred();
    const callback = vi.fn(() => task.promise);
    const props = { certificate, onTriggerAutoRenew: action === 'renew' ? callback : () => {},
      onRecheckChain: action === 'check' ? callback : () => {} };
    const view = render(SslCertificateMonitorCard, props);
    const name = action === 'renew' ? '立即续期' : '校验证书链';
    await fireEvent.click(view.getByRole('button', { name }));
    await view.rerender({ ...props, ...(action === 'renew' ? { onRecheckChain: () => {} } : { onTriggerAutoRenew: () => {} }) });
    const button = view.getByRole('button', { name }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await fireEvent.click(button);
    expect(callback).toHaveBeenCalledOnce();
    task.resolve();
    await waitFor(() => expect(button.disabled).toBe(false));
  });
  it('catches synchronous errors and supports void callbacks', async () => {
    const view = render(SslCertificateMonitorCard, { certificate,
      onRecheckChain: () => { throw new Error('failed'); } });
    await fireEvent.click(view.getByRole('button', { name: '校验证书链' }));
    expect(view.getByRole('alert').textContent).toContain('检查失败');
    await view.rerender({ certificate, onRecheckChain: () => {} });
    await fireEvent.click(view.getByRole('button', { name: '校验证书链' }));
    expect(view.queryByRole('alert')).toBeNull();
  });
});
describe('topology refresh ownership', () => {
  it('awaits completion and rejects duplicate refreshes', async () => {
    const task = deferred(), onRefresh = vi.fn(() => task.promise);
    const view = render(TrafficTopologyInspector, { nodes: [], onRefresh });
    const button = view.getByRole('button', { name: /刷新/ }) as HTMLButtonElement;
    await fireEvent.click(button);
    await new Promise(resolve => setTimeout(resolve, 550));
    await fireEvent.click(button);
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    task.reject(new Error('failed'));
    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('刷新失败'));
    expect(button.disabled).toBe(false);
  });
  it('ignores rejected requests after callback replacement or unmount', async () => {
    const old = deferred(), fresh = deferred();
    const view = render(TrafficTopologyInspector, { nodes: [], onRefresh: () => old.promise });
    await fireEvent.click(view.getByRole('button', { name: /刷新/ }));
    await view.rerender({ nodes: [], onRefresh: () => fresh.promise });
    await fireEvent.click(view.getByRole('button', { name: /刷新/ }));
    old.reject(new Error('stale'));
    await Promise.resolve();
    expect(view.queryByRole('alert')).toBeNull();
    view.unmount();
    fresh.reject(new Error('unmounted'));
    await Promise.resolve();
  });
});
