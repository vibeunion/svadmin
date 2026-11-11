import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SystemHealthCheckDashboard from './SystemHealthCheckDashboard.svelte';

describe('SystemHealthCheckDashboard component suite', () => {
  it('renders overall health KPIs and services table', () => {
    const { getByText } = render(SystemHealthCheckDashboard, {
      title: '系统链路自检大盘'
    });

    expect(getByText('系统链路自检大盘')).toBeTruthy();
    expect(getByText('PostgreSQL 主数据库集群')).toBeTruthy();
    expect(getByText('Redis 分布式缓存与 Session 锁')).toBeTruthy();
    expect(getByText('正常健康组件')).toBeTruthy();
  });

  it('triggers run all diagnostics action', async () => {
    let triggered = false;
    const { getByText } = render(SystemHealthCheckDashboard, {
      onRunAllChecks: async () => {
        triggered = true;
      }
    });

    const runBtn = getByText('一键全量链路巡检');
    await fireEvent.click(runBtn);
    expect(triggered).toBe(true);
  });

  it('triggers export report callback', async () => {
    let exportedData: { summary?: unknown } | null = null;
    const { getByText } = render(SystemHealthCheckDashboard, {
      onExportReport: (report) => {
        exportedData = report;
      }
    });

    const exportBtn = getByText('导出诊断报告');
    await fireEvent.click(exportBtn);
    expect(exportedData).toBeTruthy();
    expect(exportedData?.summary).toBeTruthy();
  });
});
