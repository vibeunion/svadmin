import { Type } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core/resource-contract';

const status = Type.Union([Type.Literal('paid'), Type.Literal('pending')]);
export const orders = defineResource('orders', {
  record: Type.Object({ id: Type.Number(), status, amount: Type.Number(), note: Type.Optional(Type.String()) }),
  create: Type.Object({ status, amount: Type.Number({ minimum: 0 }), note: Type.Optional(Type.String()) }),
  update: Type.Object({ status: Type.Optional(status), note: Type.Optional(Type.String()) }),
});
