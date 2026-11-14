import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
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
    const { container } = render(IpWhitelistDrawer, {
      open: true,
      rules: [],
    });
    const drawer = container.querySelector('[data-svadmin-component="IpWhitelistDrawer"]');
    expect(drawer).not.toBeNull();
    expect(screen.getByText(/network security & ip access rules/i)).toBeDefined();
  });

  it('switches enforcement mode between whitelist and blacklist', async () => {
    render(IpWhitelistDrawer, {
      open: true,
      mode: 'WHITELIST',
      rules: [],
    });

    const blacklistBtn = screen.getByRole('button', { name: /blacklist block/i });
    await fireEvent.click(blacklistBtn);

    expect(screen.getByText(/blacklist mode/i)).toBeDefined();
  });
});
