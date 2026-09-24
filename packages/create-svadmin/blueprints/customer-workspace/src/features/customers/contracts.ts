import { Type, type Static } from '@sinclair/typebox';
import { defineResource } from '@svadmin/core/resource-contract';

export const customerInput = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 160 }),
  contact: Type.String({ minLength: 1, maxLength: 80 }),
  email: Type.String({ minLength: 1, maxLength: 254, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }),
  status: Type.Union([Type.Literal('potential'), Type.Literal('active'), Type.Literal('paused')]),
  owner: Type.String({ minLength: 1 }),
  notes: Type.String({ maxLength: 4000 }),
});
export const customerRecord = Type.Object({ id: Type.String(), ...customerInput.properties });
export type Customer = Static<typeof customerRecord>;
export const customers = defineResource('customers', {
  record: customerRecord, create: customerInput, update: Type.Partial(customerInput),
});

export const followupInput = Type.Object({
  customerId: Type.String({ minLength: 1 }),
  summary: Type.String({ minLength: 1, maxLength: 2000 }),
  owner: Type.String({ minLength: 1 }),
  date: Type.String({ pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$' }),
});
export const followupRecord = Type.Object({ id: Type.String(), ...followupInput.properties });
export type Followup = Static<typeof followupRecord>;
export const followups = defineResource('followups', {
  record: followupRecord, create: followupInput, update: Type.Partial(followupInput),
});

export const approvalInput = Type.Object({
  title: Type.String({ minLength: 1 }),
  applicant: Type.String({ minLength: 1 }),
  status: Type.Union([Type.Literal('pending'), Type.Literal('approved'), Type.Literal('rejected')]),
  reason: Type.String({ minLength: 1 }),
});
export const approvalRecord = Type.Object({ id: Type.String(), ...approvalInput.properties });
export type Approval = Static<typeof approvalRecord>;
export const approvals = defineResource('approvals', {
  record: approvalRecord, update: Type.Pick(approvalInput, ['status', 'reason']),
});

export const workspaceSettings = defineResource('workspace_settings', {
  record: Type.Object({ id: Type.String() }),
});
