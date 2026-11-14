import { Address4, Address6 } from 'ip-address';

export type IpRuleType = 'SINGLE' | 'CIDR' | 'RANGE';
export type IpRuleAction = 'ALLOW' | 'DENY';
export type IpAccessMode = 'WHITELIST' | 'BLACKLIST';

export interface IpAccessRule {
  id: string;
  type: IpRuleType;
  value: string;
  action: IpRuleAction;
  description?: string;
  enabled: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  /** 仅保留宿主元数据；本地安全预览始终 DENY 优先。 */
  priority?: number;
  createdAt?: string;
}

interface AddressBounds { family: 4 | 6; first: bigint; last: bigint }
const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

function parseAddress(address: string): Address4 | Address6 | null {
  if (ipv4.test(address)) return new Address4(address);
  if (!address.includes(':') || /[/\s%[\]]/.test(address) || !Address6.isValid(address)) return null;
  return new Address6(address);
}

function singleBounds(address: string): AddressBounds | null {
  const parsed = parseAddress(address);
  if (!parsed) return null;
  // 映射 IPv6 与普通 IPv4 必须使用同一比较域，防止同一连接绕过冲突检查。
  const normalized = parsed instanceof Address6 && parsed.isMapped4() ? parsed.to4() : parsed;
  return { family: normalized instanceof Address4 ? 4 : 6, first: normalized.bigInt(), last: normalized.bigInt() };
}

function cidrBounds(pattern: string): AddressBounds | null {
  const parts = pattern.split('/');
  const address = parts[0] ? parseAddress(parts[0]) : null;
  if (parts.length !== 2 || !address || !/^(0|[1-9]\d*)$/.test(parts[1] ?? '')) return null;
  const prefix = Number(parts[1]);
  const maximum = address instanceof Address4 ? 32 : 128;
  if (prefix > maximum) return null;
  const subnet = address instanceof Address4 ? new Address4(pattern) : new Address6(pattern);
  if (subnet instanceof Address6 && subnet.isMapped4() && prefix >= 96) {
    const mapped = subnet.to4();
    return { family: 4, first: mapped.startAddress().bigInt(), last: mapped.endAddress().bigInt() };
  }
  return { family: maximum === 32 ? 4 : 6, first: subnet.startAddress().bigInt(), last: subnet.endAddress().bigInt() };
}

function patternBounds(type: IpRuleType, pattern: string): AddressBounds | null {
  if (type === 'SINGLE') return singleBounds(pattern);
  if (type === 'CIDR') return cidrBounds(pattern);
  if (type !== 'RANGE') return null;
  const endpoints = pattern.split('-').map(endpoint => singleBounds(endpoint.trim()));
  const [start, end] = endpoints;
  if (endpoints.length !== 2 || !start || !end || start.family !== end.family || start.first > end.first) return null;
  return { family: start.family, first: start.first, last: end.first };
}

export function validateIpRuleValue(type: IpRuleType, value: string): { valid: boolean; error?: string } {
  if (patternBounds(type, value.trim())) return { valid: true };
  return { valid: false, error: 'Enter a valid IP, decimal CIDR prefix, or ascending same-family IP range.' };
}

export function ruleTimingError(rule: Pick<IpAccessRule, 'startsAt' | 'expiresAt'>): string | null {
  const start = rule.startsAt == null ? null : Date.parse(rule.startsAt);
  const end = rule.expiresAt == null ? null : Date.parse(rule.expiresAt);
  if ((start !== null && !Number.isFinite(start)) || (end !== null && !Number.isFinite(end))) return 'Invalid rule date.';
  if (start !== null && end !== null && end <= start) return 'Expiration must be after activation.';
  return null;
}

export function ipRuleState(rule: IpAccessRule, now: number): 'Disabled' | 'Invalid' | 'Scheduled' | 'Expired' | 'Active' {
  if (!rule.enabled) return 'Disabled';
  if (ruleTimingError(rule) || !validateIpRuleValue(rule.type, rule.value).valid) return 'Invalid';
  if (rule.expiresAt != null && Date.parse(rule.expiresAt) <= now) return 'Expired';
  if (rule.startsAt != null && Date.parse(rule.startsAt) > now) return 'Scheduled';
  return 'Active';
}

function matchesAddress(bounds: AddressBounds, address: AddressBounds): boolean {
  if (bounds.family === address.family) return bounds.first <= address.first && address.first <= bounds.last;
  // IPv6 的 /0 等广域规则也必须覆盖 IPv4-mapped 连接。
  if (bounds.family === 6 && address.family === 4) {
    const mapped = new Address6(`::ffff:${Address4.fromBigInt(address.first).correctForm()}`).bigInt();
    return bounds.first <= mapped && mapped <= bounds.last;
  }
  return false;
}

export function clientIpAllowed(rules: IpAccessRule[], mode: IpAccessMode, ip: string, now: number): boolean {
  const address = singleBounds(ip.trim());
  if (!address) return false;
  const matches = rules.filter(rule => {
    const bounds = patternBounds(rule.type, rule.value.trim());
    return bounds && ipRuleState(rule, now) === 'Active' && matchesAddress(bounds, address);
  });
  if (matches.some(rule => rule.action === 'DENY')) return false;
  return mode === 'BLACKLIST' || matches.some(rule => rule.action === 'ALLOW');
}

export function lockoutError(rules: IpAccessRule[], mode: IpAccessMode, ip: string, now: number): string | null {
  if (!validateIpRuleValue('SINGLE', ip).valid) return 'Resolve a valid server-observed client IP before changing this policy.';
  if (rules.some(rule => !validateIpRuleValue(rule.type, rule.value).valid || ruleTimingError(rule)
    || !['ALLOW', 'DENY'].includes(rule.action))) return 'Fix invalid rule patterns, actions or dates before saving the policy.';
  if (new Set(rules.map(rule => rule.id)).size !== rules.length) return 'Rule IDs must be unique.';
  if (!clientIpAllowed(rules, mode, ip, now)) return 'This change would block your current IP. Keep an active ALLOW rule and remove conflicting DENY rules.';
  // 只检查会改变策略的时刻，防止临时放行到期或未来 DENY 生效后误锁。
  const boundaries = rules.flatMap(rule => [rule.startsAt, rule.expiresAt])
    .filter((date): date is string => date != null).map(date => Date.parse(date)).filter(time => Number.isFinite(time) && time > now);
  return boundaries.some(time => !clientIpAllowed(rules, mode, ip, time))
    ? 'A scheduled rule or expiration would later block your current IP. Keep permanent access before saving.'
    : null;
}
