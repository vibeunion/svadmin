import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import LiteSqlConsole from './LiteSqlConsole.svelte';
import LiteEnvVariableEditor from './LiteEnvVariableEditor.svelte';
import LiteScheduledJobManager from './LiteScheduledJobManager.svelte';
import LiteTenantQuotasMatrix from './LiteTenantQuotasMatrix.svelte';
import LiteTableAggregationFooter from './LiteTableAggregationFooter.svelte';
import LiteSecureDataExporter from './LiteSecureDataExporter.svelte';
import LiteDataImportDropzone from './LiteDataImportDropzone.svelte';
import LiteColumnMappingTable from './LiteColumnMappingTable.svelte';
import LiteImportPreviewValidator from './LiteImportPreviewValidator.svelte';
import LiteApprovalChainBuilder from './LiteApprovalChainBuilder.svelte';
import LitePeriodComparisonCard from './LitePeriodComparisonCard.svelte';

describe('Lite Enterprise Parity Wave 6 suite', () => {
  it('renders LiteSqlConsole with query and columns', () => {
    const { getByText } = render(LiteSqlConsole, {
      title: 'SQL 只读控制台'
    });
    expect(getByText('SQL 只读控制台')).toBeTruthy();
    expect(getByText('READONLY')).toBeTruthy();
  });

  it('renders LiteEnvVariableEditor with key-value pairs', () => {
    const { getByText, getAllByText } = render(LiteEnvVariableEditor, {
      title: '环境变量字典'
    });
    expect(getByText('环境变量字典')).toBeTruthy();
    expect(getByText('DATABASE_URL')).toBeTruthy();
    expect(getAllByText('加密机密').length).toBeGreaterThanOrEqual(1);
  });

  it('renders LiteScheduledJobManager with cron jobs', () => {
    const { getByText } = render(LiteScheduledJobManager, {
      title: '调度管理'
    });
    expect(getByText('调度管理')).toBeTruthy();
    expect(getByText('每日数据汇总快照')).toBeTruthy();
    expect(getByText('0 2 * * *')).toBeTruthy();
  });

  it('renders LiteTenantQuotasMatrix with usage bars', () => {
    const { getByText } = render(LiteTenantQuotasMatrix, {
      tenantName: '测试租户'
    });
    expect(getByText('测试租户')).toBeTruthy();
    expect(getByText('API 请求吞吐')).toBeTruthy();
  });

  it('renders LiteTableAggregationFooter with subtotal and grand total', () => {
    const { getByText, getAllByText } = render(LiteTableAggregationFooter);
    expect(getByText('订单总金额 (¥)')).toBeTruthy();
    expect(getAllByText(/选中小计:/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders LiteSecureDataExporter with audit fingerprint', () => {
    const { getByText } = render(LiteSecureDataExporter, {
      fingerprint: 'FP-TEST-001'
    });
    expect(getByText('指纹: FP-TEST-001')).toBeTruthy();
    expect(getByText('🛡️ 安全审计')).toBeTruthy();
  });

  it('renders LiteDataImportDropzone with native file input', () => {
    const { getByText } = render(LiteDataImportDropzone, {
      title: '数据批量导入'
    });
    expect(getByText('数据批量导入')).toBeTruthy();
    expect(getByText('下载标准模板文件')).toBeTruthy();
  });

  it('renders LiteColumnMappingTable with source to target mapping', () => {
    const { getByText } = render(LiteColumnMappingTable, {
      title: '字段映射表'
    });
    expect(getByText('字段映射表')).toBeTruthy();
    expect(getByText('用户姓名')).toBeTruthy();
    expect(getByText('full_name')).toBeTruthy();
  });

  it('renders LiteImportPreviewValidator with error counts', () => {
    const { getByText } = render(LiteImportPreviewValidator, {
      title: '预检定位'
    });
    expect(getByText('预检定位')).toBeTruthy();
    expect(getByText(/发现 2 处数据格式异常/)).toBeTruthy();
  });

  it('renders LiteApprovalChainBuilder with multi-stage steps', () => {
    const { getByText } = render(LiteApprovalChainBuilder, {
      title: '审批流链路'
    });
    expect(getByText('审批流链路')).toBeTruthy();
    expect(getByText('发起申请')).toBeTruthy();
  });

  it('renders LitePeriodComparisonCard with delta percentage', () => {
    const { getByText } = render(LitePeriodComparisonCard, {
      title: '业绩环比'
    });
    expect(getByText('业绩环比')).toBeTruthy();
    expect(getByText('↑ +14.28%')).toBeTruthy();
  });
});
