import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import IpAccessRuleEditor, {
  validateIpRuleValue,
  type IpAccessRule,
} from './IpAccessRuleEditor.svelte';
import IpWhitelistDrawer from './IpWhitelistDrawer.svelte';

describe('validateIpRuleValue', () => {
  it('validates single IPv4 addresses', () => {
    expect(validateIpRuleValue('SINGLE', '192.168.1.100').valid).toBe(true);
    expect(validateIpRuleValue('SINGLE', '256.0.0.1').valid).toBe(false);
    expect(validateIpRuleValue('SINGLE', 'invalid-ip').valid).toBe(false);
  });

  it('validates CIDR subnet notations', () => {
    expect(validateIpRuleValue('CIDR', '10.0.0.0/16').valid).toBe(true);
    expect(validateIpRuleValue('CIDR', '192.168.1.0/24').valid).toBe(true);
    expect(validateIpRuleValue('CIDR', '192.168.1.0/35').valid).toBe(false);
  });

  it('validates IP range notations', () => {
    expect(validateIpRuleValue('RANGE', '10.0.0.1 - 10.0.0.50').valid).toBe(true);
    expect(validateIpRuleValue('RANGE', '10.0.0.1-10.0.0.256').valid).toBe(false);
  });
});

describe('IpAccessRuleEditor Component', () => {
  const initialRules: IpAccessRule[] = [
    {
      id: 'r1',
      type: 'SINGLE',
      value: '192.168.1.50',
      action: 'ALLOW',
      description: 'DevOps Jump Server',
      enabled: true,
      expiresAt: null,
    },
    {
      id: 'r2',
      type: 'CIDR',
      value: '10.200.0.0/16',
      action: 'ALLOW',
      description: 'Internal VPN Subnet',
      enabled: true,
      expiresAt: null,
    },
  ];

  it('renders table and header with data-svadmin-component', () => {
    const { container } = render(IpAccessRuleEditor, {
      rules: initialRules,
      currentClientIp: '203.0.113.195',
    });
    const root = container.querySelector('[data-svadmin-component="IpAccessRuleEditor"]');
    expect(root).not.toBeNull();
    expect(screen.getByText('192.168.1.50')).toBeDefined();
    expect(screen.getByText('10.200.0.0/16')).toBeDefined();
  });

  it('adds current administrator IP on Trust My IP click', async () => {
    let changedRules: IpAccessRule[] = [];
    render(IpAccessRuleEditor, {
      rules: initialRules,
      currentClientIp: '203.0.113.195',
      onChange: (r) => {
        changedRules = r;
      },
    });

    const trustBtn = screen.getByRole('button', { name: /trust my ip/i });
    await fireEvent.click(trustBtn);

    expect(changedRules.some((r) => r.value === '203.0.113.195')).toBe(true);
  });

  it('filters rules by search input', async () => {
    render(IpAccessRuleEditor, {
      rules: initialRules,
    });

    const searchInput = screen.getByPlaceholderText(/filter by ip, cidr/i);
    await fireEvent.input(searchInput, { target: { value: 'Jump Server' } });

    expect(screen.getByText('192.168.1.50')).toBeDefined();
    expect(screen.queryByText('10.200.0.0/16')).toBeNull();
  });
});

describe('IpWhitelistDrawer Component', () => {
  it('renders drawer with data-svadmin-component when open is true', () => {
    render(IpWhitelistDrawer, {
      open: true,
      rules: [],
    });
    const drawer = document.querySelector('[data-svadmin-component="IpWhitelistDrawer"]');
    expect(drawer).not.toBeNull();
    expect(screen.getByText(/network security & ip access rules/i)).toBeDefined();
  });

  it('switches enforcement mode between whitelist and blacklist', async () => {
    render(IpWhitelistDrawer, {
      open: true,
      mode: 'WHITELIST',
      rules: [],
      currentClientIp: '203.0.113.195',
    });

    await fireEvent.change(screen.getByLabelText('Enforcement Mode'), { target: { value: 'BLACKLIST' } });

    await waitFor(() => expect(screen.getByText(/blacklist mode/i)).toBeDefined());
  });
});

const clientIp = '203.0.113.195';
const ownRule: IpAccessRule = { id: 'self', type: 'SINGLE', value: clientIp, action: 'ALLOW', enabled: true };

describe('IP security editor contracts', () => {
  it('does not fabricate the current IP or allow trusting an unknown address', () => {
    render(IpAccessRuleEditor);
    expect(screen.getByText('Unavailable')).toBeDefined();
    expect((screen.getByRole('button', { name: 'Trust My IP' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('resolves the server-observed address and validates resolver output', async () => {
    render(IpAccessRuleEditor, { resolveClientIp: async () => clientIp });
    await waitFor(() => expect(screen.getByText(clientIp)).toBeDefined());
    expect((screen.getByRole('button', { name: 'Trust My IP' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('reports resolver errors without inventing a fallback IP', async () => {
    render(IpAccessRuleEditor, { resolveClientIp: async () => 'invalid:address' });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('invalid client IP'));
    expect(screen.getByText('Unavailable')).toBeDefined();
  });

  it('preserves a temporary expiration when only the description changes, including clearing it', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const onChange = vi.fn();
    render(IpAccessRuleEditor, { mode: 'BLACKLIST', currentClientIp: clientIp, onChange,
      rules: [{ ...ownRule, value: '192.0.2.1', description: 'Old description', expiresAt }] });
    await fireEvent.click(screen.getByRole('button', { name: 'Edit 192.0.2.1' }));
    await fireEvent.input(screen.getByLabelText('Description'), { target: { value: '' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save Rule' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0]?.[0]?.[0]).toMatchObject({ expiresAt, description: '' });
  });

  it.each(['Delete', 'Toggle'])('blocks %s of the last self ALLOW rule without mutating frozen props', async operation => {
    const onChange = vi.fn();
    render(IpAccessRuleEditor, { rules: [Object.freeze({ ...ownRule })], currentClientIp: clientIp, onChange });
    await fireEvent.click(screen.getByRole(operation === 'Toggle' ? 'switch' : 'button', { name: `${operation} ${clientIp}` }));
    expect(screen.getByRole('alert').textContent).toContain('would block');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('does not falsely block deleting one of multiple effective ALLOW rules', async () => {
    const onChange = vi.fn();
    render(IpAccessRuleEditor, { currentClientIp: clientIp, onChange, rules: [
      ownRule, { ...ownRule, id: 'subnet', type: 'CIDR', value: '203.0.113.0/24' },
    ] });
    await fireEvent.click(screen.getByRole('button', { name: `Delete ${clientIp}` }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it('reactivates an expired and disabled own ALLOW instead of silently doing nothing', async () => {
    const onChange = vi.fn();
    render(IpAccessRuleEditor, { currentClientIp: clientIp, onChange,
      rules: [{ ...ownRule, enabled: false, expiresAt: '2000-01-01T00:00:00Z' }] });
    await fireEvent.click(screen.getByRole('button', { name: 'Trust My IP' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0]?.[0]).toEqual([expect.objectContaining({ enabled: true, expiresAt: null })]);
  });

  it('does not silently override a matching DENY when trusting an IP', async () => {
    const onChange = vi.fn();
    const onAddMyIp = vi.fn();
    render(IpAccessRuleEditor, { currentClientIp: clientIp, onChange, onAddMyIp,
      rules: [{ ...ownRule, type: 'CIDR', value: '203.0.113.0/24', action: 'DENY' }] });
    await fireEvent.click(screen.getByRole('button', { name: 'Trust My IP' }));
    expect(screen.getByRole('alert').textContent).toContain('conflicting DENY');
    expect(onChange).not.toHaveBeenCalled();
    expect(onAddMyIp).not.toHaveBeenCalled();
  });

  it('does not apply a mutation after persistence fails', async () => {
    render(IpAccessRuleEditor, { currentClientIp: clientIp, rules: [],
      onChange: async () => { throw new Error('Policy service unavailable'); } });
    await fireEvent.click(screen.getByRole('button', { name: 'Trust My IP' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Policy service unavailable'));
    expect(screen.getByText('No IP access rules found.')).toBeDefined();
  });

  it('cancels editing without notifying persistence', async () => {
    const onChange = vi.fn();
    render(IpAccessRuleEditor, { currentClientIp: clientIp, rules: [ownRule], onChange });
    await fireEvent.click(screen.getByRole('button', { name: `Edit ${clientIp}` }));
    await fireEvent.input(screen.getByLabelText('Description'), { target: { value: 'Unsaved' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a stale edit after the host revokes a rule', async () => {
    const onChange = vi.fn();
    const temporary = { ...ownRule, value: '192.0.2.1', expiresAt: '2027-11-08T00:00:00Z' };
    const { rerender } = render(IpAccessRuleEditor, { mode: 'BLACKLIST', currentClientIp: clientIp, rules: [temporary], onChange });
    await fireEvent.click(screen.getByRole('button', { name: 'Edit 192.0.2.1' }));
    await rerender({ rules: [{ ...temporary, action: 'DENY', expiresAt: '2027-11-07T00:00:00Z' }] });
    await fireEvent.input(screen.getByLabelText('Description'), { target: { value: 'Old draft' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save Rule' }));
    expect(screen.getByRole('alert').textContent).toContain('Policy changed while editing');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('preserves a newer host snapshot arriving during an asynchronous save', async () => {
    let finishSave: () => void = () => {};
    const saved = new Promise<void>(resolve => { finishSave = resolve; });
    const { rerender } = render(IpAccessRuleEditor, { mode: 'BLACKLIST', currentClientIp: clientIp, rules: [], onChange: () => saved });
    await fireEvent.click(screen.getByRole('button', { name: 'Trust My IP' }));
    await rerender({ rules: [{ ...ownRule, action: 'DENY' }] });
    finishSave();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Policy changed while saving'));
    const ruleBadges = [...document.querySelectorAll('[data-svadmin-component="IpAccessRuleEditor"] tbody td span')]
      .map(node => node.textContent?.trim());
    expect(ruleBadges).toContain('DENY');
    expect(ruleBadges).not.toContain('ALLOW');
  });

  it('keeps the original activation ISO across a DST repeated local hour', async () => {
    const onChange = vi.fn();
    const startsAt = '2027-11-07T06:30:00.000Z';
    render(IpAccessRuleEditor, { mode: 'BLACKLIST', currentClientIp: clientIp, onChange,
      rules: [{ ...ownRule, value: '192.0.2.1', startsAt, expiresAt: '2027-11-07T08:00:00.000Z' }] });
    await fireEvent.click(screen.getByRole('button', { name: 'Edit 192.0.2.1' }));
    await fireEvent.input(screen.getByLabelText('Description'), { target: { value: 'Description only' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Save Rule' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange.mock.calls[0]?.[0]?.[0]?.startsAt).toBe(startsAt);
  });

  it('keeps the draft open after a backdrop click', async () => {
    render(IpAccessRuleEditor, { currentClientIp: clientIp, mode: 'BLACKLIST' });
    await fireEvent.click(screen.getByRole('button', { name: 'Add IP Rule' }));
    const overlay = document.querySelector('.svadmin-sheet-overlay');
    if (!overlay) throw new Error('Missing editor overlay');
    await fireEvent.click(overlay);
    expect(screen.getByRole('dialog', { name: 'Add IP Access Rule' })).toBeDefined();
  });

  it('keeps nested Escape and focus within the topmost sheet', async () => {
    const onClose = vi.fn();
    render(IpWhitelistDrawer, { open: true, mode: 'BLACKLIST', currentClientIp: clientIp, onClose });
    await fireEvent.click(screen.getByRole('button', { name: 'Add IP Rule' }));
    await waitFor(() => expect(screen.getByLabelText('Rule Type')).toBe(document.activeElement));
    await fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add IP Access Rule' })).toBeNull());
    expect(screen.getByRole('dialog', { name: 'Network Security & IP Access Rules' })).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('rejects mode changes that would lock out the administrator', async () => {
    const onModeChange = vi.fn();
    render(IpWhitelistDrawer, { open: true, mode: 'BLACKLIST', rules: [], currentClientIp: clientIp, onModeChange });
    await fireEvent.change(screen.getByLabelText('Enforcement Mode'), { target: { value: 'WHITELIST' } });
    expect(screen.getByRole('alert').textContent).toContain('would block');
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('does not apply an old mode change after the host policy changes', async () => {
    let finishSave: () => void = () => {};
    const saved = new Promise<void>(resolve => { finishSave = resolve; });
    const { rerender } = render(IpWhitelistDrawer, { open: true, mode: 'BLACKLIST', rules: [ownRule],
      currentClientIp: clientIp, onModeChange: () => saved });
    await fireEvent.change(screen.getByLabelText('Enforcement Mode'), { target: { value: 'WHITELIST' } });
    await rerender({ rules: [] });
    finishSave();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Policy changed while switching mode'));
    expect((screen.getByLabelText('Enforcement Mode') as HTMLSelectElement).value).toBe('BLACKLIST');
  });
});
