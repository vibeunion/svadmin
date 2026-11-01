import type { Filter } from './types';

function textHit(value: string, expected: string, mode: 'includes' | 'starts' | 'ends', sensitive: boolean): boolean {
  const left = sensitive ? value : value.toLowerCase();
  const right = sensitive ? expected : expected.toLowerCase();
  if (mode === 'includes') return left.includes(right);
  if (mode === 'starts') return left.startsWith(right);
  return left.endsWith(right);
}

function textOperator(
  value: unknown,
  expected: unknown,
  mode: 'includes' | 'starts' | 'ends',
  sensitive: boolean,
  negate: boolean,
): boolean {
  if (typeof value !== 'string' || typeof expected !== 'string') return false;
  const hit = textHit(value, expected, mode, sensitive);
  return negate ? !hit : hit;
}

/** 客户端表格筛选。带 s 的字符串运算符区分大小写，不带 s 的不区分。 */
export function matchClientFilter(item: Record<string, unknown>, filter: Filter): boolean {
  if (!('field' in filter)) {
    if (filter.operator === 'and') return filter.value.every((child) => matchClientFilter(item, child));
    if (filter.operator === 'or') return filter.value.length === 0 || filter.value.some((child) => matchClientFilter(item, child));
    return true;
  }
  const value = item[filter.field];
  const expected = filter.value;
  switch (filter.operator) {
    case 'null': return value == null;
    case 'nnull': return value != null;
    default: break;
  }
  if (expected == null || expected === '') return true;
  switch (filter.operator) {
    case 'eq': return value == expected;
    case 'ne': return value != expected;
    case 'eqs': return Object.is(value, expected);
    case 'nes': return !Object.is(value, expected);
    case 'lt': return typeof value === 'number' && typeof expected === 'number' && value < expected;
    case 'gt': return typeof value === 'number' && typeof expected === 'number' && value > expected;
    case 'lte': return typeof value === 'number' && typeof expected === 'number' && value <= expected;
    case 'gte': return typeof value === 'number' && typeof expected === 'number' && value >= expected;
    case 'in': return !Array.isArray(expected) || expected.length === 0 || expected.includes(value);
    case 'nin': return !Array.isArray(expected) || expected.length === 0 || !expected.includes(value);
    case 'ina': return Array.isArray(value) && Array.isArray(expected) && expected.every((entry) => value.includes(entry));
    case 'nina': return Array.isArray(value) && Array.isArray(expected) && expected.some((entry) => !value.includes(entry));
    case 'contains': return textOperator(value, expected, 'includes', false, false);
    case 'ncontains': return textOperator(value, expected, 'includes', false, true);
    case 'containss': return textOperator(value, expected, 'includes', true, false);
    case 'ncontainss': return textOperator(value, expected, 'includes', true, true);
    case 'startswith': return textOperator(value, expected, 'starts', false, false);
    case 'nstartswith': return textOperator(value, expected, 'starts', false, true);
    case 'startswiths': return textOperator(value, expected, 'starts', true, false);
    case 'nstartswiths': return textOperator(value, expected, 'starts', true, true);
    case 'endswith': return textOperator(value, expected, 'ends', false, false);
    case 'nendswith': return textOperator(value, expected, 'ends', false, true);
    case 'endswiths': return textOperator(value, expected, 'ends', true, false);
    case 'nendswiths': return textOperator(value, expected, 'ends', true, true);
    case 'between': {
      if (!Array.isArray(expected) || expected.length !== 2) return true;
      const [min, max] = expected;
      return typeof value === 'number' && typeof min === 'number' && typeof max === 'number'
        && value >= min && value <= max;
    }
    case 'nbetween': {
      if (!Array.isArray(expected) || expected.length !== 2) return true;
      const [min, max] = expected;
      return typeof value === 'number' && typeof min === 'number' && typeof max === 'number'
        && (value < min || value > max);
    }
    default: return true;
  }
}
