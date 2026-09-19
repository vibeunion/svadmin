import type { FieldDefinition, Filter } from '@svadmin/core';

/** 使用已有拓扑读取当前表单值，不把用户字段名解释成对象路径。服务端仍须独立授权。 */
export function readFilterForm(filters: readonly Filter[], fields: readonly FieldDefinition[], data: FormData): Filter[] {
  const operators = new Set(['eq', 'ne', 'contains', 'ncontains', 'gt', 'gte', 'lt', 'lte', 'null', 'nnull']);
  function read(filter: Filter, path: string): Filter {
    const get = (key: string) => data.get(`filters[${path}][${key}]`);
    if (!('field' in filter)) {
      const operator = get('operator');
      if (operator !== 'and' && operator !== 'or') throw new TypeError('Invalid filter group');
      return { operator, value: filter.value.map((child, index) => read(child, `${path}.value.${index}`)) };
    }
    const field = fields.find(candidate => candidate.key === get('field') && candidate.filterable !== false);
    const operator = get('operator');
    if (!field || typeof operator !== 'string' || !operators.has(operator)) throw new TypeError('Invalid filter rule');
    let value: unknown = get('value');
    if (operator === 'null' || operator === 'nnull') value = null;
    else if (typeof value !== 'string') throw new TypeError('Invalid filter value');
    else if (['number', 'currency', 'percent'].includes(field.type)) {
      if (!value.trim() || !Number.isFinite(Number(value))) throw new TypeError('Invalid numeric filter');
      value = Number(value);
    } else if (field.type === 'boolean') {
      if (value !== 'true' && value !== 'false') throw new TypeError('Invalid boolean filter');
      value = value === 'true';
    }
    return { field: field.key, operator: operator as Extract<Filter, { field: string }>['operator'], value };
  }
  return filters.map((filter, index) => read(filter, String(index)));
}
