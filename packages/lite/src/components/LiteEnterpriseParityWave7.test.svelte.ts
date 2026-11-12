import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LitePivotMatrix from './LitePivotMatrix.svelte';
import LiteGeoScatterMap from './LiteGeoScatterMap.svelte';
import LiteDataMaskPolicyEngine from './LiteDataMaskPolicyEngine.svelte';
import LiteSystemHealthCheckDashboard from './LiteSystemHealthCheckDashboard.svelte';

describe('Lite Enterprise Parity Wave 7 suite', () => {
  it('renders LitePivotMatrix with headers and grand totals', () => {
    const { getByText } = render(LitePivotMatrix, {
      title: '多维交叉透视矩阵'
    });
    expect(getByText('多维交叉透视矩阵')).toBeTruthy();
    expect(getByText('2026 Q1')).toBeTruthy();
    expect(getByText('列汇总')).toBeTruthy();
  });

  it('renders LiteGeoScatterMap with region rankings', () => {
    const { getByText } = render(LiteGeoScatterMap, {
      title: '地域空间分布大盘'
    });
    expect(getByText('地域空间分布大盘')).toBeTruthy();
    expect(getByText('华东大区 (上海/江浙)')).toBeTruthy();
    expect(getByText('4,820')).toBeTruthy();
  });

  it('renders LiteDataMaskPolicyEngine with policy table and level badges', () => {
    const { getByText, getAllByText } = render(LiteDataMaskPolicyEngine, {
      title: '数据脱敏中心'
    });
    expect(getByText('数据脱敏中心')).toBeTruthy();
    expect(getByText('mobile_phone')).toBeTruthy();
    expect(getAllByText('L4 极高').length).toBeGreaterThanOrEqual(1);
  });

  it('renders LiteSystemHealthCheckDashboard with service health status', () => {
    const { getByText, getAllByText } = render(LiteSystemHealthCheckDashboard, {
      title: '系统链路健康大盘'
    });
    expect(getByText('系统链路健康大盘')).toBeTruthy();
    expect(getByText('PostgreSQL 主数据库集群')).toBeTruthy();
    expect(getAllByText('运行健康').length).toBeGreaterThanOrEqual(1);
  });
});

import LiteQueryAiExplainer from './LiteQueryAiExplainer.svelte';

describe('LiteQueryAiExplainer test', () => {
  it('renders LiteQueryAiExplainer with query and explanation', () => {
    const { getByText } = render(LiteQueryAiExplainer, {
      title: 'AI 规则语义卡片',
      queryText: 'WHERE age >= 18',
      explanation: '用于筛选成年人用户。'
    });
    expect(getByText('AI 规则语义卡片')).toBeTruthy();
    expect(getByText('WHERE age >= 18')).toBeTruthy();
    expect(getByText('用于筛选成年人用户。')).toBeTruthy();
  });
});
