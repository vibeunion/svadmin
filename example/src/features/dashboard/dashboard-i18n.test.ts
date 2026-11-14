import { describe, expect, it } from 'bun:test';
import {
  registerDashboardTranslations,
  dashboardTranslationsZh,
  dashboardTranslationsEn,
} from './dashboard-i18n';

describe('dashboard-i18n dictionary registration', () => {
  it('registers all required bilingual entries without missing keys', () => {
    const registered: Record<string, Record<string, string>> = {};
    registerDashboardTranslations((locale, dict) => {
      registered[locale] = dict;
    });

    // Verify critical dashboard headers and metrics
    expect(dashboardTranslationsZh['dashboard.pageTitle']).toBe('运营工作台');
    expect(dashboardTranslationsEn['dashboard.pageTitle']).toBe('Operations workspace');
    expect(dashboardTranslationsZh['dashboard.section.stockRisk']).toBe('库存风险清单');
    expect(dashboardTranslationsEn['dashboard.section.stockRisk']).toBe('Stock risk queue');
    expect(dashboardTranslationsZh['dashboard.metric.stockAtRisk']).toBe('库存风险');
    expect(dashboardTranslationsEn['dashboard.metric.stockAtRisk']).toBe('Stock at risk');
    expect(dashboardTranslationsZh['dashboard.section.scheduleCollaboration']).toBe('日程与协作');
    expect(dashboardTranslationsEn['dashboard.section.scheduleCollaboration']).toBe('Schedule and collaboration');

    // Verify dynamic dictionary entries
    expect(dashboardTranslationsZh['dashboard.eventType.cycle_count']).toBe('盘点');
    expect(dashboardTranslationsEn['dashboard.eventType.cycle_count']).toBe('Cycle count');
    expect(dashboardTranslationsZh['dashboard.eventTitle.warehouse_cycle_count']).toBe('仓库循环盘点');
    expect(dashboardTranslationsEn['dashboard.eventTitle.warehouse_cycle_count']).toBe('Warehouse cycle count');
  });

  it('keeps symmetric key sets between Chinese and English dictionaries', () => {
    const zhKeys = Object.keys(dashboardTranslationsZh).sort();
    const enKeys = Object.keys(dashboardTranslationsEn).sort();

    expect(zhKeys).toEqual(enKeys);
  });
});
