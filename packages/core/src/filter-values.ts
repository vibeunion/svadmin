import type { CrudOperator, FieldDefinition } from './types';

export const FILTER_COLLECTION_LIMIT = 100;

export function isNumericFilterField(field: FieldDefinition | undefined): boolean {
  return field !== undefined && ['number', 'currency', 'percent', 'rating', 'rate'].includes(field.type);
}

export function isCollectionFilterOperator(operator: string): boolean {
  return ['in', 'nin', 'between', 'nbetween'].includes(operator);
}

export function filterOperatorsForField(field: FieldDefinition | undefined): CrudOperator[] {
  if (!field || field.filterable === false) return [];
  if (isNumericFilterField(field)) {
    return ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'between', 'nbetween', 'null', 'nnull'];
  }
  if (field.type === 'boolean' || field.type === 'select') return ['eq', 'ne', 'in', 'nin', 'null', 'nnull'];
  if (['date', 'time', 'datetime'].includes(field.type)) return ['eq', 'ne', 'lt', 'gt', 'lte', 'gte', 'null', 'nnull'];
  return ['eq', 'ne', 'contains', 'ncontains', 'startswith', 'endswith', 'lt', 'gt', 'lte', 'gte', 'in', 'nin', 'null', 'nnull'];
}

export function isFilterScalarValue(field: FieldDefinition, value: unknown): boolean {
  if (isNumericFilterField(field)) return typeof value === 'number' && Number.isFinite(value);
  if (field.type === 'boolean') return typeof value === 'boolean';
  if (field.type === 'select') return field.options?.some(option => !option.disabled && option.value === value) === true;
  return typeof value === 'string';
}

/** 不排序、不去重、不强制转换；非法集合不能退化为无筛选查询。 */
export function isFilterCollectionValue(field: FieldDefinition | undefined, operator: string, value: unknown): boolean {
  if (!field || !filterOperatorsForField(field).includes(operator as CrudOperator)
    || !isCollectionFilterOperator(operator) || !Array.isArray(value)
    || value.length < 1 || value.length > FILTER_COLLECTION_LIMIT) return false;
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index) || !isFilterScalarValue(field, value[index])) return false;
  }
  if (operator === 'between' || operator === 'nbetween') {
    return value.length === 2 && typeof value[0] === 'number' && typeof value[1] === 'number' && value[0] <= value[1];
  }
  return true;
}
