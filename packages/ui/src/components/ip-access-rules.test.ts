import { describe, expect, it } from 'vitest';
import { clientIpAllowed, ipRuleState, lockoutError, validateIpRuleValue, type IpAccessRule } from './ip-access-rules.js';

const now = Date.parse('2026-11-14T12:00:00Z');
const ip = '203.0.113.195';
const allow: IpAccessRule = { id: 'allow', type: 'SINGLE', value: ip, action: 'ALLOW', enabled: true };

describe('IP parser boundaries', () => {
  // 边界：空值、合法极值、IPv6 压缩/映射、CIDR 整数、同族正序范围、未知类型。
  it.each(['0.0.0.0', '255.255.255.255', '::', '2001:DB8::1', '::ffff:203.0.113.195'])('accepts SINGLE %s', pattern => {
    expect(validateIpRuleValue('SINGLE', pattern).valid).toBe(true);
  });
  it.each(['', 'not:an:ip', '1::2::3', '256.0.0.1', '01.2.3.4', '192.0.2.1/24', 'fe80::1%eth0', '[::1]', '::1/128'])('rejects SINGLE %s', pattern => {
    expect(validateIpRuleValue('SINGLE', pattern).valid).toBe(false);
  });
  it.each(['0.0.0.0/0', '192.0.2.1/32', '192.0.2.5/24', '::/0', '2001:db8::1/128'])('accepts CIDR %s', pattern => {
    expect(validateIpRuleValue('CIDR', pattern).valid).toBe(true);
  });
  it.each(['192.0.2.0/1.5', '192.0.2.0/0x10', '192.0.2.0/1e1', '192.0.2.0/+0', '192.0.2.0/33', '::/129', '::/-1', '::/ 1', '::/01'])('rejects CIDR %s', pattern => {
    expect(validateIpRuleValue('CIDR', pattern).valid).toBe(false);
  });
  it.each(['127.255.255.255-128.0.0.0', '192.0.2.1 - 192.0.2.1', '2001:db8::1-2001:db8::f'])('accepts RANGE %s', pattern => {
    expect(validateIpRuleValue('RANGE', pattern).valid).toBe(true);
  });
  it.each(['192.0.2.200-192.0.2.1', '::f-::1', '192.0.2.1-::1', '192.0.2.1/24-192.0.2.2', '192.0.2.1-'])('rejects RANGE %s', pattern => {
    expect(validateIpRuleValue('RANGE', pattern).valid).toBe(false);
  });
  it('rejects unknown types at the runtime boundary', () => {
    expect(validateIpRuleValue('UNKNOWN' as 'SINGLE', ip).valid).toBe(false);
  });
});

describe('local safety preview, not server enforcement', () => {
  it('defaults to deny for whitelist and allow for blacklist', () => {
    expect(clientIpAllowed([], 'WHITELIST', ip, now)).toBe(false);
    expect(clientIpAllowed([], 'BLACKLIST', ip, now)).toBe(true);
  });
  it.each(['CIDR', 'RANGE'] as const)('uses DENY precedence independent of order and metadata for %s', type => {
    const deny = { ...allow, id: 'deny', action: 'DENY' as const, type,
      value: type === 'CIDR' ? '203.0.113.0/24' : '203.0.113.1-203.0.113.255', priority: -100 };
    for (const rules of [[allow, deny], [deny, allow]]) expect(clientIpAllowed(rules, 'WHITELIST', ip, now)).toBe(false);
  });
  it('includes both range endpoints and excludes adjacent addresses', () => {
    const rule = { ...allow, type: 'RANGE' as const, value: '192.0.2.2-192.0.2.4' };
    for (const end of [1, 2, 4, 5]) expect(clientIpAllowed([rule], 'WHITELIST', `192.0.2.${end}`, now)).toBe(end === 2 || end === 4);
  });
  it('normalizes CIDR host bits for matching', () => {
    expect(clientIpAllowed([{ ...allow, type: 'CIDR', value: '203.0.113.5/24' }], 'WHITELIST', ip, now)).toBe(true);
  });
  it.each(['::ffff:203.0.113.195', '::FFFF:CB00:71C3'])('matches mapped client address %s against IPv4 rules', mapped => {
    expect(clientIpAllowed([allow], 'WHITELIST', mapped, now)).toBe(true);
  });
  it('matches broad and mapped IPv6 DENY subnets against IPv4', () => {
    for (const value of ['::/0', '::ffff:203.0.113.0/120']) {
      expect(clientIpAllowed([allow, { ...allow, id: 'deny', type: 'CIDR', value, action: 'DENY' }], 'WHITELIST', ip, now)).toBe(false);
    }
  });
  it.each([-1, 0, 1])('treats expiration offset %i with an exclusive upper bound', offset => {
    const rule = { ...allow, expiresAt: new Date(now + offset).toISOString() };
    expect(clientIpAllowed([rule], 'WHITELIST', ip, now)).toBe(offset > 0);
  });
  it('treats activation as inclusive and excludes disabled or invalid rules', () => {
    expect(ipRuleState({ ...allow, startsAt: new Date(now + 1).toISOString() }, now)).toBe('Scheduled');
    expect(ipRuleState({ ...allow, startsAt: new Date(now).toISOString() }, now)).toBe('Active');
    expect(ipRuleState({ ...allow, enabled: false }, now)).toBe('Disabled');
    expect(ipRuleState({ ...allow, expiresAt: 'garbage' }, now)).toBe('Invalid');
    expect(ipRuleState({ ...allow, expiresAt: '' }, now)).toBe('Invalid');
  });
  it('rejects a future lockout caused by expiry or a scheduled DENY', () => {
    expect(lockoutError([{ ...allow, expiresAt: new Date(now + 1).toISOString() }], 'WHITELIST', ip, now)).toContain('later block');
    expect(lockoutError([allow, { ...allow, id: 'deny', action: 'DENY', startsAt: new Date(now + 1).toISOString() }], 'WHITELIST', ip, now)).toContain('later block');
  });
  it('accepts an uninterrupted handover between ALLOW rules', () => {
    const date = new Date(now + 1000).toISOString();
    expect(lockoutError([{ ...allow, expiresAt: date }, { ...allow, id: 'next', startsAt: date }], 'WHITELIST', ip, now)).toBeNull();
  });
  it('does not submit existing invalid rules or ambiguous IDs as part of a policy update', () => {
    expect(lockoutError([allow, { ...allow, id: 'bad', expiresAt: 'garbage' }], 'WHITELIST', ip, now)).toContain('Fix invalid');
    expect(lockoutError([allow, { ...allow, id: 'bad', value: 'invalid:ip' }], 'WHITELIST', ip, now)).toContain('Fix invalid');
    expect(lockoutError([allow, { ...allow }], 'WHITELIST', ip, now)).toContain('unique');
  });
});
