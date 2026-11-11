<script lang="ts">
  interface ServiceItem {
    id: string;
    name: string;
    endpoint: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs: number;
    details?: string;
  }

  interface Props {
    title?: string;
    environment?: string;
    version?: string;
    services?: ServiceItem[];
    class?: string;
  }

  let {
    title = '系统链路健康自检大盘',
    environment = 'production-east-01',
    version = 'v2.8.4-enterprise',
    services = [
      { id: 's1', name: 'PostgreSQL 主数据库集群', endpoint: 'db.internal.svc:5432', status: 'healthy', latencyMs: 3, details: '连接池活跃度 18/100' },
      { id: 's2', name: 'Redis 分布式缓存与锁', endpoint: 'redis-master.internal:6379', status: 'healthy', latencyMs: 1, details: '命中率 99.4%' },
      { id: 's3', name: 'MinIO / S3 企业对象存储', endpoint: 's3.oss-cn-shanghai.internal', status: 'healthy', latencyMs: 18, details: '读写探测成功' },
      { id: 's4', name: 'SupaAuth / SSO 统一鉴权', endpoint: 'auth.svadmin.internal/v1', status: 'healthy', latencyMs: 12, details: 'JWT 验签通畅' },
      { id: 's5', name: 'RabbitMQ 异步事件消息队列', endpoint: 'mq-node1.cluster.internal:5672', status: 'degraded', latencyMs: 145, details: '死信队列堆积 42 条' }
    ],
    class: className = '',
  }: Props = $props();

  const healthyCount = $derived(services.filter(s => s.status === 'healthy').length);
  const avgLatency = $derived(
    services.length > 0 ? Math.round(services.reduce((a, b) => a + b.latencyMs, 0) / services.length) : 0
  );
</script>

<div
  class="lite-health-dash {className}"
  data-svadmin-component="LiteSystemHealthCheckDashboard"
  role="region"
  aria-label="System Health Dashboard"
>
  <header class="lite-health-header">
    <div>
      <h4 class="lite-health-title">{title}</h4>
      <span class="lite-health-meta">环境: {environment} · 版本: {version}</span>
    </div>
    <div class="lite-health-kpi">
      <span class="lite-kpi-pill">健康组件: <strong>{healthyCount}/{services.length}</strong></span>
      <span class="lite-kpi-pill">平均延时: <strong class="font-mono">{avgLatency}ms</strong></span>
    </div>
  </header>

  <div class="lite-health-table-wrap">
    <table class="lite-health-table">
      <thead>
        <tr>
          <th>服务组件名称</th>
          <th>连接端点</th>
          <th>链路状态</th>
          <th>往返延时</th>
          <th>检测指标详情</th>
        </tr>
      </thead>
      <tbody>
        {#each services as s (s.id)}
          <tr>
            <td class="lite-td-srvname">{s.name}</td>
            <td class="lite-td-endpoint font-mono">{s.endpoint}</td>
            <td>
              <span
                class="lite-status-pill"
                class:lite-pill-healthy={s.status === 'healthy'}
                class:lite-pill-warn={s.status === 'degraded'}
                class:lite-pill-err={s.status === 'unhealthy'}
              >
                {s.status === 'healthy' ? '运行健康' : s.status === 'degraded' ? '性能亚健康' : '链路故障'}
              </span>
            </td>
            <td class="lite-td-latency font-mono">{s.latencyMs} ms</td>
            <td class="lite-td-detail">{s.details ?? '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .lite-health-dash {
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    background: #ffffff;
    font-size: 12px;
    overflow: hidden;
  }
  .lite-health-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: #f7f8fa;
    border-bottom: 1px solid #e5e6eb;
  }
  .lite-health-title { margin: 0; font-size: 13px; font-weight: 600; color: #1d2129; }
  .lite-health-meta { font-size: 11px; color: #86909c; display: block; margin-top: 2px; }
  .lite-health-kpi { display: flex; }
  .lite-health-kpi > * + * { margin-left: 8px; }
  .lite-kpi-pill { font-size: 11px; background: #ffffff; border: 1px solid #e5e6eb; padding: 2px 8px; border-radius: 4px; color: #4e5969; }
  .lite-kpi-pill strong { color: #165dff; }
  .lite-health-table-wrap { overflow-x: auto; }
  .lite-health-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
  .lite-health-table th {
    padding: 8px 12px;
    background: #f2f3f5;
    border-bottom: 1px solid #e5e6eb;
    color: #4e5969;
    font-weight: 600;
  }
  .lite-health-table td {
    padding: 8px 12px;
    border-bottom: 1px solid #f2f3f5;
    color: #1d2129;
  }
  .lite-td-srvname { font-weight: 600; }
  .font-mono { font-family: monospace; }
  .lite-td-endpoint { color: #4e5969; }
  .lite-status-pill {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
  }
  .lite-pill-healthy { background: #e8ffea; color: #00b42a; }
  .lite-pill-warn { background: #fff7e8; color: #ff7d00; }
  .lite-pill-err { background: #ffece8; color: #f53f3f; }
  .lite-td-latency { font-weight: 600; }
  .lite-td-detail { color: #86909c; }
</style>
