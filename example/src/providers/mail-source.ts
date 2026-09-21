import type { BaseRecord } from '@svadmin/core';

/** 邮件字段均为标量；固定键序保留完整读取快照，版本由 provider 生成而非正文去重。 */
export function mailSourceFingerprint(record: BaseRecord): string {
  return JSON.stringify(Object.keys(record).sort().map(key => [key, record[key]]));
}
