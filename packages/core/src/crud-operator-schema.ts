import { Type, type Static } from 'typebox';
import type { CrudOperator } from './types';

/** 与 CRUD_FIELD_OPERATORS 保持同一组字面量，供查询快照和资源 schema 共用。 */
export const crudFieldOperatorSchema = Type.Union([
  Type.Literal('eq'), Type.Literal('ne'), Type.Literal('eqs'), Type.Literal('nes'),
  Type.Literal('lt'), Type.Literal('gt'), Type.Literal('lte'), Type.Literal('gte'),
  Type.Literal('in'), Type.Literal('nin'), Type.Literal('ina'), Type.Literal('nina'),
  Type.Literal('contains'), Type.Literal('ncontains'), Type.Literal('containss'), Type.Literal('ncontainss'),
  Type.Literal('startswith'), Type.Literal('nstartswith'), Type.Literal('startswiths'), Type.Literal('nstartswiths'),
  Type.Literal('endswith'), Type.Literal('nendswith'), Type.Literal('endswiths'), Type.Literal('nendswiths'),
  Type.Literal('null'), Type.Literal('nnull'),
  Type.Literal('between'), Type.Literal('nbetween'),
]);

type OperatorParity = Static<typeof crudFieldOperatorSchema> extends CrudOperator
  ? CrudOperator extends Static<typeof crudFieldOperatorSchema> ? true : never
  : never;
const operatorParity: OperatorParity = true;
void operatorParity;
