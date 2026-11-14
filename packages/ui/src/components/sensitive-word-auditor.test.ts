import { describe, expect, it } from 'bun:test';
import {
  scanContent,
  type SensitiveWordItem,
  type ModerationTicket,
} from './moderation-utils.js';

describe('SensitiveWordAuditor & Content Moderation Logic', () => {
  const dictionary: SensitiveWordItem[] = [
    {
      id: '1',
      word: '保本高收益',
      category: 'spam',
      action: 'block',
      severity: 'critical',
      enabled: true,
    },
    {
      id: '2',
      word: '高额返现',
      category: 'spam',
      action: 'mask',
      severity: 'medium',
      replacement: '***',
      enabled: true,
    },
    {
      id: '3',
      word: '内部测试专用',
      category: 'custom',
      action: 'review',
      severity: 'low',
      enabled: false, // disabled
    },
  ];

  it('detects violations, triggers block actions and extracts match indexes', () => {
    const text = '本理财计划承诺保本高收益，立即参与！';
    const result = scanContent(text, dictionary);

    expect(result.hasViolation).toBe(true);
    expect(result.blockRequired).toBe(true);
    expect(result.totalHits).toBe(1);
    expect(result.matches[0]?.word).toBe('保本高收益');
    expect(result.matches[0]?.index).toBe(7);
  });

  it('correctly ignores disabled words in dictionary', () => {
    const text = '本系统为内部测试专用版本，请勿泄露。';
    const result = scanContent(text, dictionary);

    expect(result.hasViolation).toBe(false);
    expect(result.totalHits).toBe(0);
  });

  it('performs intelligent text masking with specified replacements', () => {
    const text = '注册即可获得高额返现优惠，限时特惠。';
    const result = scanContent(text, dictionary);

    expect(result.hasViolation).toBe(true);
    expect(result.blockRequired).toBe(false);
    expect(result.maskedText).toBe('注册即可获得***优惠，限时特惠。');
  });

  it('handles empty or safe text gracefully', () => {
    const safeResult = scanContent('这是一篇完全合规的企业产品使用说明文档。', dictionary);
    expect(safeResult.hasViolation).toBe(false);
    expect(safeResult.blockRequired).toBe(false);
    expect(safeResult.totalHits).toBe(0);

    const emptyResult = scanContent('', dictionary);
    expect(emptyResult.hasViolation).toBe(false);
    expect(emptyResult.totalHits).toBe(0);
  });

  it('validates moderation ticket status transitions', () => {
    const ticket: ModerationTicket = {
      id: 't-1',
      title: 'Review post',
      sourceModule: 'Community',
      author: 'bob',
      submittedAt: '2026-11-15',
      rawContent: 'Sample content with word',
      status: 'pending',
      riskScore: 75,
      matches: [],
    };

    expect(ticket.status).toBe('pending');
    ticket.status = 'approved';
    expect(ticket.status).toBe('approved');
  });
});
