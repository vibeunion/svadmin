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
  let maskedText = text;

  for (const item of activeWords) {
    if (!item.word.trim()) continue;
    let pos = 0;
    const lowerWord = item.word.toLowerCase();
    const lowerText = text.toLowerCase();

    while ((pos = lowerText.indexOf(lowerWord, pos)) !== -1) {
      matches.push({
        word: item.word,
        category: item.category,
        action: item.action,
        severity: item.severity,
        index: pos,
        length: item.word.length,
        replacement: item.replacement,
      });
      pos += item.word.length;
    }
  }

  // Sort matches by offset index
  matches.sort((a, b) => a.index - b.index);

  // Apply masking to generate clean preview text
  for (const match of matches) {
    const originalSlice = text.substring(match.index, match.index + match.length);
    const replacement = match.replacement || '*'.repeat(match.length);
    maskedText = maskedText.replaceAll(originalSlice, replacement);
  }

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
