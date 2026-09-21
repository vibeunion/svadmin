import type { ActivityFeedProps } from './business-definitions.js';
import type { JsonValue } from './types.js';
import { asRecordArray, type WidgetValueResult } from './widget-data.js';

export interface SurfaceActivityItem {
  id: string;
  action: string;
  timestamp: string;
  user: { name: string };
  target?: string;
  comment?: string;
  status?: 'info' | 'success' | 'warning' | 'destructive';
}

/** 只映射选中的字段；不推断操作者、补造时间或把未知状态伪装成成功。 */
export function asSurfaceActivities(value: JsonValue, props: ActivityFeedProps, unknownActor: string): WidgetValueResult<SurfaceActivityItem[]> {
  const records = asRecordArray(value);
  if (!records.ok) return records;
  if (records.value.length > 100) return { ok: false, message: 'Too many activity records' };
  const items: SurfaceActivityItem[] = [];
  const ids = new Set<string>();
  for (const record of records.value) {
    const idValue = record[props.idField];
    const action = record[props.actionField];
    const timestamp = record[props.timestampField];
    if (!((typeof idValue === 'string' && idValue.length > 0 && idValue.length <= 128)
      || (typeof idValue === 'number' && Number.isFinite(idValue)))
      || typeof action !== 'string' || !action.trim() || action.length > 500
      || typeof timestamp !== 'string' || !timestamp.trim() || timestamp.length > 128) {
      return { ok: false, message: 'Activity identity, action or timestamp is invalid' };
    }
    // 数字 1 与字符串 "1" 不得造成 keyed each 身份冲突。
    const id = `${typeof idValue}:${idValue}`;
    if (ids.has(id)) return { ok: false, message: 'Duplicate activity identity' };
    ids.add(id);
    const optional = [props.actorField, props.targetField, props.commentField, props.statusField]
      .map((field) => field === undefined ? undefined : record[field]);
    if (optional.some((item) => item != null && (typeof item !== 'string' || item.length > 4000))) {
      return { ok: false, message: 'Optional activity text is invalid' };
    }
    const [actor, target, comment, status] = optional;
    if (status != null && !['info', 'success', 'warning', 'destructive'].includes(String(status))) {
      return { ok: false, message: 'Unknown activity status' };
    }
    items.push({ id, action, timestamp, user: { name: typeof actor === 'string' && actor.trim() ? actor : unknownActor },
      ...(typeof target === 'string' ? { target } : {}),
      ...(typeof comment === 'string' ? { comment } : {}),
      ...(typeof status === 'string' ? { status: status as SurfaceActivityItem['status'] & string } : {}),
    });
  }
  return { ok: true, value: items };
}
