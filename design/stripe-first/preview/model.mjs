// 仅用于设计样例：有限场景与合成数据，不注册 Surface 能力或调用后端。
export const scenarios = Object.freeze({
  components: Object.freeze(['ready']),
  'resource-list': Object.freeze(['ready', 'loading', 'initial-empty', 'filtered-empty', 'error', 'forbidden']),
  'record-detail': Object.freeze(['ready', 'loading', 'partial', 'error', 'forbidden']),
  settings: Object.freeze(['ready', 'dirty', 'invalid', 'saving', 'saved', 'error', 'readonly']),
});

export function readPreviewOptions(search = '') {
  const params = new URLSearchParams(search);
  const requested = params.get('view');
  const view = requested && Object.hasOwn(scenarios, requested) ? requested : 'components';
  const requestedState = params.get('state');
  return {
    view,
    state: requestedState && scenarios[view].includes(requestedState) ? requestedState : 'ready',
    locale: params.get('locale') === 'en' ? 'en' : 'zh-CN',
    theme: params.get('theme') === 'dark' ? 'dark' : 'light',
    density: params.get('density') === 'comfortable' ? 'comfortable' : 'compact',
  };
}

export const customers = Object.freeze([
  { id: 'demo_001', name: '青岚工作室 · Aster Studio', email: 'billing@aster.example', status: 'active', amount: 128430, created: '2026-09-01' },
  { id: 'demo_002', name: 'Northstar Lab', email: 'team@northstar.example', status: 'active', amount: 32400, created: '2026-09-08' },
  { id: 'demo_003', name: '海岬设计 · Cape Design', email: 'hello@cape.example', status: 'pending', amount: 0, created: '2026-09-12' },
  { id: 'demo_004', name: 'Long-name operational workspace / 多语言协作与数据服务', email: 'accounts@workspace.example', status: 'pending', amount: -1200, created: '2026-09-16' },
].map(record => Object.freeze(record)));

export function filterCustomers(query) {
  const term = String(query).trim().toLowerCase();
  return customers.filter(record => `${record.name} ${record.email}`.toLowerCase().includes(term));
}

export function settingsSeed(state) {
  return {
    name: state === 'invalid' ? '' : state === 'dirty' || state === 'error' ? 'Aster Operations' : 'Aster Studio',
    email: 'billing@aster.example',
    phase: scenarios.settings.includes(state) ? state : 'ready',
  };
}
