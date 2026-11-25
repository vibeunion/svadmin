import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import { resetI18n } from '@svadmin/core/i18n';
import NotificationCenter from './NotificationCenter.svelte';
import ColumnHeaderFilter from './ColumnHeaderFilter.svelte';
import BooleanField from './fields/BooleanField.svelte';
import ProCard from './ProCard.svelte';
import KpiCard from './KpiCard.svelte';
import TableToolbar from './TableToolbar.svelte';
import { AUTO_OVERFLOW_TITLE_ATTR, syncElementOverflowTitle } from '../overflow-tooltip.js';

const originalLanguage = window.navigator.language;

afterEach(() => {
  cleanup();
  Object.defineProperty(window.navigator, 'language', { configurable: true, value: originalLanguage });
  resetI18n();
});

describe('zh-CN i18n coverage and ellipsis tooltips', () => {
  it('localizes NotificationCenter, ColumnHeaderFilter, and BooleanField when locale is zh-CN', () => {
    Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'zh-CN' });
    resetI18n();

    render(NotificationCenter, {
      items: [{ id: '1', title: '风控预警', description: '仓位触及上限', read: false }],
      open: true,
      showDrawerButton: true,
    });
    expect(screen.getByText('消息通知')).toBeTruthy();
    expect(screen.getByRole('button', { name: /查看全部通知/ })).toBeTruthy();

    const filterView = render(ColumnHeaderFilter, {
      field: { key: 'status', label: '状态', type: 'select' },
    });
    expect(filterView.container.querySelector('button[aria-label="筛选 状态"]')).toBeTruthy();

    const boolView = render(BooleanField, { value: true, mode: 'badge' });
    expect(boolView.container.textContent).toContain('是');
  });

  it('adds full-text title attributes on ProCard, KpiCard, and TableToolbar truncated headers', () => {
    const cardView = render(ProCard, {
      title: '超长卡片主标题用于验证省略号悬停完整提示',
      subTitle: '超长副标题说明文字在窄屏下被截断时仍可查看全文',
    });
    expect(cardView.container.querySelector('[title="超长卡片主标题用于验证省略号悬停完整提示"]')).toBeTruthy();
    expect(cardView.container.querySelector('[title="超长副标题说明文字在窄屏下被截断时仍可查看全文"]')).toBeTruthy();

    const kpiView = render(KpiCard, {
      title: '高标空间连板监控',
      value: '9 连板',
      alertMessage: '连板高度进入高波动分歧区间，请注意仓位控制',
    });
    expect(kpiView.container.querySelector('[title="连板高度进入高波动分歧区间，请注意仓位控制"]')).toBeTruthy();

    const toolbarView = render(TableToolbar, {
      title: '全量分区数据明细表',
      description: '支持多维筛选、密度切换与列固定',
    });
    expect(toolbarView.container.querySelector('h3[title="全量分区数据明细表"]')).toBeTruthy();
    expect(toolbarView.container.querySelector('p[title="支持多维筛选、密度切换与列固定"]')).toBeTruthy();
  });

  it('dynamically synchronizes native title for CSS-truncated elements without overriding manual titles', () => {
    const el = document.createElement('span');
    el.textContent = '这是一段因宽度受限而出现省略号的超长指标说明文本';
    el.style.overflowX = 'hidden';
    el.style.textOverflow = 'ellipsis';
    document.body.appendChild(el);

    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 80 });
    Object.defineProperty(el, 'scrollWidth', { configurable: true, value: 240 });

    syncElementOverflowTitle(el);
    expect(el.getAttribute('title')).toBe('这是一段因宽度受限而出现省略号的超长指标说明文本');
    expect(el.hasAttribute(AUTO_OVERFLOW_TITLE_ATTR)).toBe(true);

    // Once width expands and text is no longer clipped, auto-title cleans itself up
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 300 });
    syncElementOverflowTitle(el);
    expect(el.hasAttribute('title')).toBe(false);
    expect(el.hasAttribute(AUTO_OVERFLOW_TITLE_ATTR)).toBe(false);

    // Explicit author title is never overwritten
    el.setAttribute('title', '自定义提示');
    Object.defineProperty(el, 'clientWidth', { configurable: true, value: 80 });
    syncElementOverflowTitle(el);
    expect(el.getAttribute('title')).toBe('自定义提示');

    el.remove();
  });
});
