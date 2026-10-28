import { isJsonValue, jsonValueIssue } from './json.js';
import type { JsonObject, JsonValue } from './types.js';

/**
 * 用户在界面上主动触发的只读交互，不是 action、mutation 或授权凭据。
 * 宿主自行决定是否把它变成后续操作（例如追加一条用户消息）。
 */
export type SurfaceInteraction =
  | {
    readonly type: 'select-record';
    /** 只包含声明列的 JSON 安全值；不完整，也不能当作授权记录。 */
    readonly record: JsonObject;
  }
  | {
    readonly type: 'submit-values';
    /** 组件本地收集的字段值；宿主必须重新校验，不能当作已授权输入。 */
    readonly values: JsonObject;
  };

/** 渲染器补齐作用域后交给宿主的事件；宿主不得把这些字段写回渲染器。 */
export type SurfaceInteractionEvent = SurfaceInteraction & {
  readonly surfaceId: string;
  readonly widgetId: string;
  readonly sourceId?: string;
};

/** 组件一次回传的最大字符数；超过时失败关闭而不是截断。 */
export const SURFACE_INTERACTION_MAX_CHARACTERS = 16_384;

/**
 * 只投影声明过的列，并跳过无法安全序列化的值（如 Date、函数、循环引用）。
 * 嵌套对象和数组会深拷贝，宿主后续修改不会写回渲染器缓存。
 * 返回 `null` 表示没有任何可交付字段，调用方不应发出事件。
 *
 * @param record 数据提供器返回的记录。
 * @param fields 组件声明并已通过 policy 校验的字段。
 * @returns 新的 JSON 对象，或 `null`。
 */
const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);

function detachJsonValue(value: JsonValue): JsonValue {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => detachJsonValue(item));
  const copy: Record<string, JsonValue> = {};
  for (const key of Object.keys(value)) {
    if (dangerousKeys.has(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) continue;
    const nested: unknown = descriptor.value;
    if (!isJsonValue(nested)) continue;
    copy[key] = detachJsonValue(nested);
  }
  return copy;
}

export function projectInteractionRecord(
  record: JsonObject,
  fields: readonly string[],
): JsonObject | null {
  const projected: Record<string, JsonValue> = {};
  let included = 0;
  for (const field of fields) {
    if (dangerousKeys.has(field) || !Object.hasOwn(record, field)) continue;
    const value = record[field];
    if (value === undefined || jsonValueIssue(value) !== null) continue;
    projected[field] = detachJsonValue(value);
    included += 1;
  }
  return included === 0 ? null : projected;
}

/**
 * 校验并深拷贝组件提交的字段值。只接受 JSON 安全值；危险键（如 `__proto__`）、
 * 非 JSON 值和超过字符上限的内容一律失败关闭，调用方不应发出事件。
 *
 * @param values 组件本地状态，例如表单字段。
 * @returns 独立副本，或 `null`。
 */
export function projectInteractionValues(values: JsonObject): JsonObject | null {
  if (jsonValueIssue(values) !== null) return null;
  const detached = detachJsonValue(values);
  if (detached === null || typeof detached !== 'object' || Array.isArray(detached)) return null;
  let serialized: string;
  try {
    serialized = JSON.stringify(detached);
  } catch {
    return null;
  }
  return serialized.length > SURFACE_INTERACTION_MAX_CHARACTERS ? null : (detached as JsonObject);
}
