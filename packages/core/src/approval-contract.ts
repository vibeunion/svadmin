import { Type, type Static } from '@sinclair/typebox';
import { checkExact } from './schema-validation';
import { snapshotPlainData } from './plain-data';
import type { EnterpriseProviderRequestContext } from './enterprise';

const identifier = Type.String({ minLength: 1, maxLength: 200, pattern: '^\\S(?:[\\s\\S]*\\S)?$' });
const version = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
const comment = Type.String({ maxLength: 10000 });
const action = Type.Object({
  id: identifier,
  label: Type.String({ minLength: 1, maxLength: 200 }),
  commentRequired: Type.Boolean(),
  targetRequired: Type.Boolean(),
}, { additionalProperties: false });
const attachment = Type.Object({
  id: identifier,
  name: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false });
const history = Type.Object({
  id: identifier,
  action: identifier,
  actor: Type.String({ minLength: 1, maxLength: 200 }),
  at: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z$' }),
  comment,
}, { additionalProperties: false });
const recordSchema = Type.Object({
  id: identifier,
  version,
  title: Type.String({ minLength: 1, maxLength: 500 }),
  status: identifier,
  applicant: Type.String({ minLength: 1, maxLength: 200 }),
  allowedActions: Type.Array(action, { maxItems: 30 }),
  attachments: Type.Array(attachment, { maxItems: 100 }),
  history: Type.Array(history, { maxItems: 1000 }),
}, { additionalProperties: false });
const transitionSchema = Type.Object({
  id: identifier,
  expectedVersion: version,
  action: identifier,
  comment,
  targetId: Type.Optional(identifier),
  idempotencyKey: identifier,
}, { additionalProperties: false });
const listSchema = Type.Object({
  data: Type.Array(recordSchema, { maxItems: 200 }),
  total: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });

export type ApprovalRecord = Static<typeof recordSchema>;
export type ApprovalTransition = Static<typeof transitionSchema>;
export type ApprovalList = Static<typeof listSchema>;
export type ApprovalReceipt =
  | { ok: true; record: ApprovalRecord }
  | { ok: false; code: 'VERSION_CONFLICT'; current: ApprovalRecord };

/** 宿主执行授权与状态机；附件仅返回引用，不接受任意下载 URL。 */
export interface ApprovalProvider {
  list(context: EnterpriseProviderRequestContext, query: {
    view: 'pending' | 'history'; page: number; pageSize: number; search: string;
  }): Promise<unknown>;
  get(context: EnterpriseProviderRequestContext, id: string): Promise<unknown>;
  transition?(context: EnterpriseProviderRequestContext, input: ApprovalTransition): Promise<unknown>;
}

export class ApprovalContractError extends Error {
  constructor(readonly code: 'INVALID_APPROVAL_INPUT' | 'INVALID_APPROVAL_RESPONSE') {
    super(code === 'INVALID_APPROVAL_INPUT' ? 'Invalid approval input.' : 'Invalid approval response.');
    this.name = 'ApprovalContractError';
  }
}

function unique(items: readonly { id: string }[]): boolean {
  return new Set(items.map(item => item.id)).size === items.length;
}

export function decodeApprovalRecord(value: unknown, expectedId?: string): ApprovalRecord {
  try {
    const record = snapshotPlainData(value);
    if (checkExact(recordSchema, record)
      && (expectedId === undefined || record.id === expectedId)
      && unique(record.allowedActions) && unique(record.attachments) && unique(record.history)
      && record.history.every(event => {
        const parsed = new Date(event.at);
        return Number.isFinite(parsed.getTime())
          && parsed.toISOString().replace('.000Z', 'Z') ===
            event.at.replace(/(?:\.0{1,3})Z$/, 'Z').replace(/\.(\d{1,2})Z$/, (_, digits: string) => `.${digits.padEnd(3, '0')}Z`);
      })) return record;
  } catch { /* 不回显 Provider 载荷或执行访问器。 */ }
  throw new ApprovalContractError('INVALID_APPROVAL_RESPONSE');
}

export function decodeApprovalList(value: unknown): ApprovalList {
  try {
    const result = snapshotPlainData(value);
    if (checkExact(listSchema, result) && result.total >= result.data.length && unique(result.data)) {
      return { data: result.data.map(record => decodeApprovalRecord(record)), total: result.total };
    }
  } catch { /* 统一失败，不返回部分合法记录。 */ }
  throw new ApprovalContractError('INVALID_APPROVAL_RESPONSE');
}

export function decodeApprovalTransition(value: unknown, current: ApprovalRecord): ApprovalTransition {
  try {
    const input = snapshotPlainData(value);
    const record = decodeApprovalRecord(current);
    if (checkExact(transitionSchema, input) && input.id === record.id && input.expectedVersion === record.version) {
      const permitted = record.allowedActions.find(candidate => candidate.id === input.action);
      if (permitted && (!permitted.commentRequired || !!input.comment.trim())
        && (permitted.targetRequired ? input.targetId !== undefined : input.targetId === undefined)) return input;
    }
  } catch { /* 不将本地允许动作视为服务端授权。 */ }
  throw new ApprovalContractError('INVALID_APPROVAL_INPUT');
}

export function decodeApprovalReceipt(value: unknown, input: ApprovalTransition): ApprovalReceipt {
  try {
    const request = snapshotPlainData(input);
    const receipt = snapshotPlainData(value);
    if (!checkExact(transitionSchema, request) || typeof receipt !== 'object' || receipt === null || Array.isArray(receipt)) throw new Error();
    if (receipt['ok'] === true && Object.keys(receipt).every(key => ['ok', 'record'].includes(key))) {
      const record = decodeApprovalRecord(receipt['record'], request.id);
      if (record.version > request.expectedVersion) return { ok: true, record };
    }
    if (receipt['ok'] === false && receipt['code'] === 'VERSION_CONFLICT'
      && Object.keys(receipt).every(key => ['ok', 'code', 'current'].includes(key))) {
      const current = decodeApprovalRecord(receipt['current'], request.id);
      if (current.version >= request.expectedVersion) return { ok: false, code: 'VERSION_CONFLICT', current };
    }
  } catch { /* 错配和未知回执不作为成功。 */ }
  throw new ApprovalContractError('INVALID_APPROVAL_RESPONSE');
}
