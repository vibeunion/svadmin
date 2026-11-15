export type ModerationCategory = 'politics' | 'violence' | 'pornography' | 'spam' | 'custom';
export type ModerationAction = 'block' | 'mask' | 'review';
export type ModerationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SensitiveWordItem {
  id: string;
  word: string;
  category: ModerationCategory;
  action: ModerationAction;
  severity: ModerationSeverity;
  replacement?: string;
  enabled: boolean;
}

export interface ModerationMatch {
  word: string;
  category: ModerationCategory;
  action: ModerationAction;
  severity: ModerationSeverity;
  index: number;
  length: number;
  replacement?: string;
}

export interface ModerationScanResult {
  hasViolation: boolean;
  blockRequired: boolean;
  reviewRequired: boolean;
  totalHits: number;
  matches: ModerationMatch[];
  maskedText: string;
}

export interface ModerationTicket {
  id: string;
  title: string;
  sourceModule: string; // e.g. "用户动态 / 论坛发帖", "商品详情 / 广告文案"
  author: string;
  submittedAt: string;
  rawContent: string;
  status: 'pending' | 'approved' | 'rejected' | 'masked';
  riskScore: number; // 0 - 100
  matches: ModerationMatch[];
}

export function maskModerationMatches(text: string, matches: ModerationMatch[]): string {
  const regions: Array<{ start: number; end: number; replacement: string }> = [];
  for (const match of [...matches].sort((a, b) => a.index - b.index)) {
    if (!Number.isInteger(match.index) || !Number.isInteger(match.length)
      || match.index < 0 || match.length < 1 || match.index + match.length > text.length) {
      throw new RangeError('敏感词匹配位置无效');
    }
    const end = match.index + match.length;
    const previous = regions.at(-1);
    // 重叠命中覆盖原文区间的并集；相邻命中独立替换，不处理替换产物。
    if (previous && match.index < previous.end) {
      previous.end = Math.max(previous.end, end);
      previous.replacement = '*'.repeat(previous.end - previous.start);
    } else {
      regions.push({ start: match.index, end, replacement: match.replacement ?? '*'.repeat(match.length) });
    }
  }
  let cursor = 0;
  let masked = '';
  for (const region of regions) {
    masked += text.slice(cursor, region.start) + region.replacement;
    cursor = region.end;
  }
  return masked + text.slice(cursor);
}

/**
 * 扫描文本并根据敏感词库进行分词匹配与脱敏处理
 */
export function scanContent(
  text: string,
  dictionary: SensitiveWordItem[],
): ModerationScanResult {
  if (!text) {
    return {
      hasViolation: false,
      blockRequired: false,
      reviewRequired: false,
      totalHits: 0,
      matches: [],
      maskedText: '',
    };
  }

  const activeWords = dictionary.filter(w => w.enabled);
  const matches: ModerationMatch[] = [];

  for (const item of activeWords) {
    if (!item.word.trim()) continue;
    const pattern = new RegExp(item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let occurrence: RegExpExecArray | null;
    while ((occurrence = pattern.exec(text)) !== null) {
      matches.push({
        word: item.word,
        category: item.category,
        action: item.action,
        severity: item.severity,
        index: occurrence.index,
        length: occurrence[0].length,
        ...(item.replacement ? { replacement: item.replacement } : {}),
      });
      pattern.lastIndex = occurrence.index + 1;
    }
  }

  // Sort matches by offset index
  matches.sort((a, b) => a.index - b.index);

  const maskedText = maskModerationMatches(text, matches);

  const blockRequired = matches.some(m => m.action === 'block' || m.severity === 'critical');
  const reviewRequired = matches.some(m => m.action === 'review' || m.severity === 'high');

  return {
    hasViolation: matches.length > 0,
    blockRequired,
    reviewRequired,
    totalHits: matches.length,
    matches,
    maskedText,
  };
}
