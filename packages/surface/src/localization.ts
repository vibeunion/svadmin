export interface SurfaceMessages {
  readonly renderErrorTitle: string;
  readonly providerUnavailable: string;
  readonly metricNoData: string;
  readonly metricInvalidData: string;
  readonly chartLoading: string;
  readonly chartNoData: string;
  readonly chartInvalidData: string;
  readonly chartUnavailable: string;
  readonly tableLoading: string;
  readonly tableNoRecords: string;
  readonly tableInvalidData: string;
  readonly tableUnavailable: string;
  readonly booleanTrue: string;
  readonly booleanFalse: string;
}

const englishMessages: SurfaceMessages = {
  renderErrorTitle: 'Surface could not be rendered',
  providerUnavailable: 'Data provider is unavailable',
  metricNoData: 'No data',
  metricInvalidData: 'Metric data is invalid',
  chartLoading: 'Loading {title}',
  chartNoData: 'No chart data',
  chartInvalidData: 'Chart data is invalid',
  chartUnavailable: 'Chart data is unavailable',
  tableLoading: 'Loading table',
  tableNoRecords: 'No records',
  tableInvalidData: 'Table data is invalid',
  tableUnavailable: 'Table data is unavailable',
  booleanTrue: 'Yes',
  booleanFalse: 'No',
};

const simplifiedChineseMessages: SurfaceMessages = {
  renderErrorTitle: '无法渲染 Surface',
  providerUnavailable: '数据提供器不可用',
  metricNoData: '暂无数据',
  metricInvalidData: '指标数据无效',
  chartLoading: '正在加载{title}',
  chartNoData: '暂无图表数据',
  chartInvalidData: '图表数据无效',
  chartUnavailable: '图表数据不可用',
  tableLoading: '正在加载表格',
  tableNoRecords: '暂无记录',
  tableInvalidData: '表格数据无效',
  tableUnavailable: '表格数据不可用',
  booleanTrue: '是',
  booleanFalse: '否',
};

export function resolveSurfaceMessages(
  locale: string,
  overrides?: Partial<SurfaceMessages>,
): SurfaceMessages {
  const defaults = locale.toLowerCase().startsWith('zh')
    ? simplifiedChineseMessages
    : englishMessages;
  return { ...defaults, ...overrides };
}

export function formatSurfaceMessage(
  template: string,
  params: Readonly<Record<string, string | number>>,
): string {
  let formattedMessage = template;
  for (const [key, value] of Object.entries(params)) {
    formattedMessage = formattedMessage.replaceAll(`{${key}}`, String(value));
  }
  return formattedMessage;
}
