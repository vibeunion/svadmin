import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import {
  evaluateFeatureFlag, hashStringToPercentage, registerFeatureFlags, setFeatureFlag,
  getFeatureFlag, clearFeatureFlags, createFeatureFlagRegistry, useFeatureFlag,
  type FeatureFlag,
} from './useFeatureFlag.svelte.js';
import FeatureFlagStudio from './FeatureFlagStudio.svelte';

const base: FeatureFlag = { key: 'billing', name: 'Billing V2', enabled: true };
const initialFlags: FeatureFlag[] = [
  { key: 'search_v2', name: 'Instant Search V2', description: 'Upgraded search query parser', enabled: true, percentage: 50, tags: ['search', 'beta'] },
  { key: 'export_csv', name: 'Async CSV Export', enabled: false, percentage: 0, tags: ['export'] },
];

describe('Feature flag evaluation and scoped registry', () => {
  beforeEach(() => clearFeatureFlags());

  it('uses stable entity buckets in [0, 100)', () => {
    const buckets = Array.from({ length: 1000 }, (_, index) => hashStringToPercentage(`billing:user-${index}`));
    expect(buckets.every(value => value >= 0 && value < 100)).toBe(true);
    expect(new Set(buckets).size).toBe(100);
    expect(hashStringToPercentage('billing:user-1')).toBe(hashStringToPercentage('billing:user-1'));
  });
  it('keeps kill switch and disabled state above whitelist and percentage', () => {
    const flag: FeatureFlag = { ...base, percentage: 100, rules: [{ field: 'userId', operator: 'in', values: ['vip'] }] };
    expect(evaluateFeatureFlag({ ...flag, killSwitch: true }, { userId: 'vip' })).toBe(false);
    expect(evaluateFeatureFlag({ ...flag, enabled: false }, { userId: 'vip' })).toBe(false);
  });
  it('handles zero, full, invalid and partial rollout without an identity', () => {
    expect(evaluateFeatureFlag({ ...base, percentage: 0 }, { userId: 'user-1' })).toBe(false);
    expect(evaluateFeatureFlag({ ...base, percentage: 100 })).toBe(true);
    expect(evaluateFeatureFlag({ ...base, percentage: NaN }, { userId: 'user-1' })).toBe(false);
    expect(evaluateFeatureFlag({ ...base, percentage: 50 })).toBe(false);
    const percentage = 37;
    expect(evaluateFeatureFlag({ ...base, percentage }, { userId: 'user-1' }))
      .toBe(hashStringToPercentage('billing:user-1') < percentage);
    expect(evaluateFeatureFlag({ ...base, percentage }, { tenantId: 'tenant-1' }))
      .toBe(hashStringToPercentage('billing:tenant-1') < percentage);
  });
  it('restricts a whitelist-only flag, including missing and object-valued context', () => {
    const flag: FeatureFlag = { ...base, rules: [{ field: 'userId', operator: 'in', values: ['vip'] }] };
    expect(evaluateFeatureFlag(flag, { userId: 'vip' })).toBe(true);
    expect(evaluateFeatureFlag(flag, { userId: 'other' })).toBe(false);
    expect(evaluateFeatureFlag(flag)).toBe(false);
    expect(evaluateFeatureFlag({ ...base, rules: [{ field: 'payload', operator: 'equals', values: ['[object Object]'] }] }, { payload: {} })).toBe(false);
  });
  it('supports tenant/role allow rules and gives exclusions precedence regardless of order', () => {
    const allow = { field: 'tenantId', operator: 'in' as const, values: ['tenant-a'] };
    const deny = { field: 'userId', operator: 'notIn' as const, values: ['blocked'] };
    for (const rules of [[allow, deny], [deny, allow]]) {
      expect(evaluateFeatureFlag({ ...base, rules }, { tenantId: 'tenant-a', userId: 'blocked' })).toBe(false);
      expect(evaluateFeatureFlag({ ...base, rules }, { tenantId: 'tenant-a', userId: 'other' })).toBe(true);
    }
    expect(evaluateFeatureFlag({ ...base, rules: [{ field: 'role', operator: 'equals', values: ['admin'] }] }, { role: 'admin' })).toBe(true);
  });
  it('allows a whitelist to opt into a zero-percent rollout while other users stay off', () => {
    const flag: FeatureFlag = { ...base, percentage: 0, rules: [{ field: 'userId', operator: 'in', values: ['vip'] }] };
    expect(evaluateFeatureFlag(flag, { userId: 'vip' })).toBe(true);
    expect(evaluateFeatureFlag(flag, { userId: 'other' })).toBe(false);
  });
  it('isolates registry inputs, return values and separate applications', () => {
    const source: FeatureFlag = { ...base, tags: ['billing'], rules: [{ field: 'role', operator: 'in', values: ['admin'] }] };
    const first = createFeatureFlagRegistry([source]);
    const second = createFeatureFlagRegistry([{ ...base, enabled: false }]);
    source.tags?.push('mutated');
    const snapshot = first.get(base.key);
    if (!snapshot) throw new Error('Flag snapshot missing');
    snapshot.enabled = false;
    snapshot.rules?.[0]?.values.push('guest');
    expect(first.get(base.key)?.enabled).toBe(true);
    expect(first.get(base.key)?.tags).toEqual(['billing']);
    expect(first.get(base.key)?.rules?.[0]?.values).toEqual(['admin']);
    expect(second.get(base.key)?.enabled).toBe(false);
  });
  it('updates hook consumers when registry or reactive context changes', () => {
    const registry = createFeatureFlagRegistry([{ ...base, rules: [{ field: 'role', operator: 'in', values: ['admin'] }] }]);
    const context = $state({ role: 'guest' });
    const feature = useFeatureFlag(base.key, () => context, false, registry);
    let enabled = false;
    const stop = $effect.root(() => { $effect(() => { enabled = feature.enabled; }); });
    try {
      flushSync();
      expect(enabled).toBe(false);
      flushSync(() => { context.role = 'admin'; });
      expect(enabled).toBe(true);
      flushSync(() => registry.set({ ...base, killSwitch: true }));
      expect(enabled).toBe(false);
      flushSync(() => registry.clear());
      expect(feature.flag).toBeUndefined();
    } finally { stop(); }
  });
  it('keeps browser convenience functions and supports explicit request registries', () => {
    registerFeatureFlags([base]);
    expect(getFeatureFlag(base.key)).toEqual(base);
    setFeatureFlag({ ...base, enabled: false });
    expect(getFeatureFlag(base.key)?.enabled).toBe(false);
    const request = createFeatureFlagRegistry();
    registerFeatureFlags([base], request);
    clearFeatureFlags();
    expect(getFeatureFlag(base.key, request)?.enabled).toBe(true);
  });
  it('requires an explicit registry on the server to prevent request leakage', () => {
    vi.stubGlobal('window', undefined);
    try {
      expect(() => registerFeatureFlags([base])).toThrow('SSR feature flags require an explicit');
      const request = createFeatureFlagRegistry([base]);
      expect(useFeatureFlag(base.key, undefined, false, request).enabled).toBe(true);
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('FeatureFlagStudio interactions', () => {
  it('renders and filters cards without mutating the supplied flags', async () => {
    const { container } = render(FeatureFlagStudio, { flags: initialFlags });
    expect(container.querySelector('[data-svadmin-component="FeatureFlagStudio"]')).not.toBeNull();
    await fireEvent.input(screen.getByRole('textbox', { name: 'Search feature flags' }), { target: { value: 'search_v2' } });
    expect(screen.getByText('Instant Search V2')).toBeDefined();
    expect(screen.queryByText('Async CSV Export')).toBeNull();
    await fireEvent.click(screen.getByRole('switch', { name: 'Enable Instant Search V2' }));
    expect(initialFlags[0]?.enabled).toBe(true);
  });
  it('updates from replacement props and removes stale registry entries', async () => {
    const registry = createFeatureFlagRegistry();
    const { rerender } = render(FeatureFlagStudio, { flags: initialFlags, registry });
    await rerender({ flags: [{ ...base, enabled: false }], registry });
    expect(screen.queryByText('Instant Search V2')).toBeNull();
    expect(screen.getByText('Billing V2')).toBeDefined();
    expect(registry.get('search_v2')).toBeUndefined();
    expect(registry.get(base.key)?.enabled).toBe(false);
  });
  it('resets removed tag and simulator selections when props change', async () => {
    const { rerender } = render(FeatureFlagStudio, { flags: initialFlags });
    await fireEvent.change(screen.getByRole('combobox', { name: 'Filter by tag' }), { target: { value: 'search' } });
    await fireEvent.change(screen.getByRole('combobox', { name: 'Target Flag' }), { target: { value: 'search_v2' } });
    await rerender({ flags: [{ ...base, tags: ['billing'] }] });
    expect((screen.getByRole('combobox', { name: 'Filter by tag' }) as HTMLSelectElement).value).toBe('ALL');
    expect((screen.getByRole('combobox', { name: 'Target Flag' }) as HTMLSelectElement).value).toBe('');
    expect(screen.getByText('Billing V2')).toBeDefined();
    expect(screen.getByText('No flag selected')).toBeDefined();
  });
  it('keeps multiple studios isolated and generates unique field IDs', async () => {
    const first = render(FeatureFlagStudio, { flags: [base] });
    const second = render(FeatureFlagStudio, { flags: [{ ...base, enabled: false }] });
    const firstSwitch = within(first.container).getByRole('switch', { name: 'Enable Billing V2' });
    const secondSwitch = within(second.container).getByRole('switch', { name: 'Enable Billing V2' });
    await fireEvent.click(firstSwitch);
    expect(firstSwitch.getAttribute('aria-checked')).toBe('false');
    expect(secondSwitch.getAttribute('aria-checked')).toBe('false');
    const ids = [...document.querySelectorAll('input[id],select[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('requires confirmation, disables connected consumers and restores the switch after revocation', async () => {
    const registry = createFeatureFlagRegistry([base]);
    const onChange = vi.fn(); const onKillSwitchTriggered = vi.fn();
    const consumer = useFeatureFlag(base.key, undefined, false, registry);
    render(FeatureFlagStudio, { flags: [base], registry, onChange, onKillSwitchTriggered });
    await fireEvent.click(screen.getByRole('button', { name: 'Trigger Kill Switch' }));
    const dialog = await screen.findByRole('dialog', { name: 'Emergency Kill Switch Confirmation' });
    expect(consumer.enabled).toBe(true);
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm Kill Switch' }));
    expect(consumer.enabled).toBe(false);
    expect(onKillSwitchTriggered).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0].killSwitch).toBe(true);
    expect(screen.getByRole('switch', { name: 'Enable Billing V2' }).hasAttribute('disabled')).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Revoke Kill Switch' }));
    expect(consumer.enabled).toBe(true);
    expect(base.killSwitch).toBeUndefined();
  });
  it('closes the kill switch dialog with Escape without changing flag state', async () => {
    const registry = createFeatureFlagRegistry([base]);
    render(FeatureFlagStudio, { flags: [base], registry });
    const trigger = screen.getByRole('button', { name: 'Trigger Kill Switch' });
    await fireEvent.click(trigger);
    await screen.findByRole('dialog');
    await fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(registry.get(base.key)?.killSwitch).toBeUndefined();
  });
  it('rejects duplicate keys and invalid percentages in the create dialog', async () => {
    const onChange = vi.fn();
    render(FeatureFlagStudio, { flags: [base], onChange });
    await fireEvent.click(screen.getByRole('button', { name: 'New Feature Flag' }));
    const dialog = await screen.findByRole('dialog', { name: 'Create Feature Flag' });
    const save = within(dialog).getByRole('button', { name: 'Save Flag' });
    await fireEvent.input(within(dialog).getByLabelText('Flag Key (Unique)'), { target: { value: ' billing ' } });
    await fireEvent.input(within(dialog).getByLabelText('Display Name'), { target: { value: 'Duplicate' } });
    expect(save.hasAttribute('disabled')).toBe(true);
    await fireEvent.input(within(dialog).getByLabelText('Flag Key (Unique)'), { target: { value: 'new-flag' } });
    await fireEvent.input(within(dialog).getByLabelText('Initial Rollout Percentage (0% - 100%)'), { target: { value: '101' } });
    expect(save.hasAttribute('disabled')).toBe(true);
    await fireEvent.input(within(dialog).getByLabelText('Initial Rollout Percentage (0% - 100%)'), { target: { value: '25' } });
    await fireEvent.click(save);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ key: 'new-flag', percentage: 25 });
  });
});
