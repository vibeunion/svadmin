<script lang="ts">
  import {
    LiteAvatarField,
    LiteCurrencyField,
    LitePercentField,
    LiteRatingField,
    LiteCodeField,
    LiteCopyField,
    LiteDateRangeField,
    LitePhoneField,
    LiteStatsCard,
    LiteTreeSelect,
    LiteCascader,
    LiteTransfer,
    LiteFilterBuilder,
    LiteDynamicFormList,
    LiteTrendIndicator,
    LiteMetricGrid,
    LiteOrgChart,
    LiteCronExpressionBuilder,
    LiteVirtualTreeSelect,
    LiteConcurrentConflictModal,
    LiteTaskCenter,
    LiteMicroAppFrame,
    LiteSafeDeleteConfirm,
    LitePresenceAvatarGroup,
    LiteGaugeChart,
    LiteAuditLog,
  } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  const report = $derived(data.parityReport);
  const classHooks = $derived(data.classHooks);

  const statusLabel: Record<string, { label: string; badgeClass: string }> = {
    exact: { label: '1:1 对齐', badgeClass: 'lite-badge-success' },
    fallback: { label: '语义降级', badgeClass: 'lite-badge-warning' },
    spa_only: { label: '免适配 (SPA)', badgeClass: 'lite-badge-info' },
    missing: { label: '待补齐', badgeClass: 'lite-badge-danger' },
  };
</script>

<svelte:head>
  <title>Component Parity Tracker — @svadmin/lite</title>
</svelte:head>

<div class="lite-page">
  <div class="lite-page-header">
    <div>
      <h1 class="lite-page-title">组件对齐与适配进度看板</h1>
      <p class="lite-muted">
        实时追踪 <code>@svadmin/ui</code> 与 <code>@svadmin/lite</code> 组件对齐矩阵与现场 SSR 验证。
      </p>
    </div>
    <a class="lite-btn" href="/lite">返回控制台</a>
  </div>

  <div class="lite-dashboard-stats">
    <LiteStatsCard
      label="总体覆盖率"
      value={`${report.overallCoveragePercentage}%`}
      description={`${report.adaptedCount + report.fallbackCount + report.spaOnlyCount} / ${report.totalComponents} 个组件已承接`}
    />
    <LiteStatsCard
      label="1:1 完全对齐"
      value={String(report.adaptedCount)}
      description="DOM 结构与表单语义 100% 对齐"
      trend="up"
      trendValue="核心基石"
    />
    <LiteStatsCard
      label="确定性语义降级"
      value={String(report.fallbackCount)}
      description="无 JS / 静态化 / 表格降级策略"
    />
    <LiteStatsCard
      label="待补齐组件"
      value={String(report.missingCount)}
      description={report.missingCount === 0 ? '全量覆盖，无缺口' : '需尽快补齐'}
    />
  </div>


  <!-- Recent enterprise fallback showroom -->
  <section class="lite-card" id="recent-fallbacks" style="margin-bottom: 24px;">
    <h2 class="lite-card-title" style="font-size: 16px; margin-bottom: 4px;">新版企业组件 SSR 降级展示</h2>
    <p class="lite-card-subtitle" style="margin-bottom: 16px;">
      以下组件在无 JavaScript 环境下保留指标、表单、任务与审计语义，交互增强由 SPA 承接。
    </p>

    <div class="lite-dashboard-stats">
      <div style="flex: 1 1 260px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteTrendIndicator</h3>
        <div class="lite-card"><LiteTrendIndicator value={12} prevValue={10} /></div>
      </div>
      <div style="flex: 1 1 320px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LitePresenceAvatarGroup</h3>
        <div class="lite-card">
          <LitePresenceAvatarGroup
            users={[
              { id: '1', name: 'Ada Lovelace', status: 'editing' },
              { id: '2', name: 'Lin Chen', status: 'viewing' },
              { id: '3', name: 'Sam Rivera', status: 'idle' },
            ]}
            maxVisible={2}
          />
        </div>
      </div>
      <div style="flex: 1 1 360px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteGaugeChart</h3>
        <LiteGaugeChart value={72} unit="%" target={80} thresholds={[{ value: 60, label: 'Normal' }, { value: 85, label: 'Warning' }]} />
      </div>
    </div>

    <h3 style="margin: 8px 0 8px; font-size: 13px; color: #0a2540;">LiteMetricGrid</h3>
    <LiteMetricGrid
      title="Service health"
      cols={3}
      items={[
        { label: 'Requests', value: '18.4k', trend: 'up', trendValue: '+6.2%' },
        { label: 'Errors', value: '0.12%', trend: 'down', trendValue: '-0.04%' },
        { label: 'P95 latency', value: '182ms', description: 'Target < 250ms' },
      ]}
    />

    <div style="display: flex; flex-wrap: wrap; margin: 16px -8px 0;">
      <div style="flex: 1 1 460px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteOrgChart</h3>
        <LiteOrgChart
          data={[{ id: 'ceo', name: 'Ada Lovelace', title: 'CEO', department: 'Executive', children: [{ id: 'cto', name: 'Lin Chen', title: 'CTO', department: 'Engineering' }] }]}
        />
      </div>
      <div style="flex: 1 1 460px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteTaskCenter</h3>
        <LiteTaskCenter
          tasks={[
            { id: 't1', title: 'Export orders', status: 'running', progress: 42 },
            { id: 't2', title: 'Import users', status: 'completed', downloadHref: '/lite/parity' },
          ]}
        />
      </div>
      <div style="flex: 1 1 460px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteCronExpressionBuilder</h3>
        <LiteCronExpressionBuilder
          value="0 9 * * 1"
          formAction="/lite/parity"
          presets={[{ label: 'Weekly', value: '0 9 * * 1' }, { label: 'Daily', value: '0 0 * * *' }]}
        />
      </div>
      <div style="flex: 1 1 460px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteVirtualTreeSelect</h3>
        <div class="lite-card">
          <LiteVirtualTreeSelect
            label="Team"
            value="child"
            nodes={[{ value: 'root', label: 'Root', children: [{ value: 'child', label: 'Child' }] }]}
          />
        </div>
      </div>
      <div style="flex: 1 1 460px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteConcurrentConflictModal</h3>
        <LiteConcurrentConflictModal
          formAction="/lite/parity"
          modifiedBy="Ada"
          fields={[{ field: 'price', label: 'Price', localValue: 10, remoteValue: 12 }]}
        />
      </div>
      <div style="flex: 1 1 460px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteSafeDeleteConfirm</h3>
        <LiteSafeDeleteConfirm
          action="/lite/parity"
          impactItems={[{ label: 'Line items', count: 3 }, { label: 'Attachments' }]}
          confirmationText="DELETE"
        />
      </div>
      <div style="flex: 1 1 980px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteAuditLog</h3>
        <LiteAuditLog
          entries={[{
            id: 'a1',
            timestamp: '2026-11-10T00:00:00.000Z',
            action: 'update',
            resource: 'orders',
            recordId: 7,
            userId: 'ada',
            previousData: { status: 'pending' },
            data: { status: 'approved' },
          }]}
        />
      </div>
      <div style="flex: 1 1 980px; margin: 0 8px 16px;">
        <h3 style="margin: 0 0 8px; font-size: 13px; color: #0a2540;">LiteMicroAppFrame</h3>
        <LiteMicroAppFrame src="about:blank" title="Embedded metrics" fallbackHref="/lite/parity" />
      </div>
    </div>
  </section>

  <!-- Metric definitions: three separate numbers, never one blended score -->
  <div class="lite-card" style="margin-bottom: 24px;">
    <h2>指标口径</h2>
    <p class="lite-muted" style="margin-bottom: 16px;">
      三个数字分开统计、互不换算。缺少样式钩子不计入能力判定，也不改变任何条目的状态。
    </p>
    <div class="lite-dashboard-stats">
      <LiteStatsCard
        label="能力对齐率"
        value={`${report.exactPercentage}%`}
        description={`${report.adaptedCount} / ${report.totalComponents} 条与参考能力 1:1，其余为语义降级或免适配`}
        href="/lite/parity#items"
      />
      <LiteStatsCard
        label="行为断言覆盖率"
        value={`${report.behaviorAssertedPercentage}%`}
        description={`${report.behaviorAssertedCount} / ${report.totalComponents} 条有测试导入且断言密度达标`}
      />
      <LiteStatsCard
        label="样式钩子覆盖率"
        value={`${classHooks.coveragePercentage}%`}
        description={`${classHooks.preservedCount} / ${classHooks.referenceHookCount} 条接受宿主 class（债务 ${classHooks.missing.length} 条，不参与状态判定）`}
      />
    </div>
    <ul class="lite-muted" style="margin: 12px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.7;">
      <li><strong>能力对齐率</strong>：服务端 HTML 与原生表单语义是否完整保留参考能力；只有客户端增强才算缺口。</li>
      <li><strong>行为断言覆盖率</strong>：测试文件导入该组件且断言预算达标（<code>expect()</code> 数 ÷ 导入组件数）。</li>
      <li><strong>样式钩子覆盖率</strong>：参考组件暴露 <code>class</code> 时 Lite 是否也接受；Lite 自带 <code>lite.css</code> 基线，宿主也可用外层容器收口，所以它单独统计、不抬状态。</li>
    </ul>
  </div>

  <!-- Category progress panel -->
  <div class="lite-card" style="margin-bottom: 24px;">
    <h2 class="lite-card-title" style="font-size: 16px; margin-bottom: 4px;">模块分类适配进度</h2>
    <p class="lite-card-subtitle" style="margin-bottom: 16px;">
      各功能模块的对齐状态与降级承接情况。
    </p>

    <div class="lite-category-grid">
      {#each Object.entries(report.categories) as [catName, cat] (catName)}
        <div class="lite-category-card">
          <div class="lite-category-card-header">
            <strong>{catName}</strong>
            <span class="lite-badge lite-badge-success">{cat.percentage}%</span>
          </div>
          <div class="lite-progress-track" style="width: 100%; margin-left: 0; margin-bottom: 8px;">
            <div class="lite-progress-fill lite-progress-success" style="width: {cat.percentage}%;"></div>
          </div>
          <div class="lite-category-card-footer">
            <span>1:1: {cat.adapted} | 降级: {cat.fallback}</span>
            <span>总计: {cat.total}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Interactive showcase for newly added components -->
  <div class="lite-card" style="margin-bottom: 24px;">
    <h2 class="lite-card-title" style="font-size: 16px; margin-bottom: 4px;">SSR 组件现场展示与验证 (Showcase)</h2>
    <p class="lite-card-subtitle" style="margin-bottom: 16px;">
      以下展示所有字段组件在纯服务端渲染（Zero-JS SSR）模式下的视觉呈现与原生表单控件：
    </p>

    <div class="lite-table-scroll">
      <table class="lite-table">
        <thead>
          <tr>
            <th style="width: 180px;">字段组件</th>
            <th style="width: 280px;">Show 模式 (展示形态)</th>
            <th>Edit/Form 模式 (原生控件)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>LiteAvatarField</strong></td>
            <td>
              <LiteAvatarField
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                name="Sarah Connor"
                subtitle="Security Lead"
                status="online"
                showName={true}
              />
            </td>
            <td>
              <LiteAvatarField mode="edit" value="Sarah Connor" />
            </td>
          </tr>

          <tr>
            <td><strong>LiteCurrencyField</strong></td>
            <td>
              <LiteCurrencyField value={125000.5} currency="USD" locale="en-US" colored={true} tone="auto" />
            </td>
            <td>
              <LiteCurrencyField mode="edit" value={125000.5} />
            </td>
          </tr>

          <tr>
            <td><strong>LitePercentField</strong></td>
            <td>
              <LitePercentField value={0.885} scale="1" precision={1} showProgress={true} tone="auto" />
            </td>
            <td>
              <LitePercentField mode="edit" value={88.5} />
            </td>
          </tr>

          <tr>
            <td><strong>LiteRatingField</strong></td>
            <td>
              <LiteRatingField value={4.5} max={5} showValue={true} />
            </td>
            <td>
              <LiteRatingField mode="edit" value={4.5} max={5} />
            </td>
          </tr>

          <tr>
            <td><strong>LiteDateRangeField</strong></td>
            <td>
              <LiteDateRangeField startDate="2026-08-01" endDate="2026-08-29" separator="至" />
            </td>
            <td>
              <LiteDateRangeField mode="edit" startDate="2026-08-01" endDate="2026-08-29" />
            </td>
          </tr>

          <tr>
            <td><strong>LitePhoneField</strong></td>
            <td>
              <LitePhoneField value="+1 (555) 839-2049" showIcon={true} clickable={true} />
            </td>
            <td>
              <LitePhoneField mode="edit" value="+1 (555) 839-2049" />
            </td>
          </tr>

          <tr>
            <td><strong>LiteCodeField</strong></td>
            <td>
              <LiteCodeField value={'{\n  "status": "active",\n  "tier": "enterprise"\n}'} language="json" />
            </td>
            <td>
              <LiteCodeField mode="edit" value={'{\n  "status": "active"\n}'} />
            </td>
          </tr>

          <tr>
            <td><strong>LiteTreeSelect</strong></td>
            <td>
              <LiteTreeSelect
                value="backend"
                options={[
                  { value: "eng", label: "Engineering", children: [{ value: "frontend", label: "Frontend" }, { value: "backend", label: "Backend" }] }
                ]}
                mode="show"
              />
            </td>
            <td>
              <LiteTreeSelect
                name="dept"
                value="frontend"
                options={[
                  { value: "eng", label: "Engineering", children: [{ value: "frontend", label: "Frontend" }, { value: "backend", label: "Backend" }] }
                ]}
                mode="edit"
              />
            </td>
          </tr>

          <tr>
            <td><strong>LiteCascader</strong></td>
            <td>
              <LiteCascader
                value={["zhejiang", "hangzhou", "xihu"]}
                options={[
                  { value: "zhejiang", label: "浙江省", children: [{ value: "hangzhou", label: "杭州市", children: [{ value: "xihu", label: "西湖区" }] }] }
                ]}
                mode="show"
              />
            </td>
            <td>
              <LiteCascader
                name="region"
                value={["zhejiang", "hangzhou", "xihu"]}
                options={[
                  { value: "zhejiang", label: "浙江省", children: [{ value: "hangzhou", label: "杭州市", children: [{ value: "xihu", label: "西湖区" }] }] }
                ]}
                mode="edit"
              />
            </td>
          </tr>

          <tr>
            <td><strong>LiteTransfer</strong></td>
            <td colspan="2">
              <LiteTransfer
                dataSource={[
                  { key: "1", title: "Read Permissions" },
                  { key: "2", title: "Write Permissions" },
                  { key: "3", title: "Audit Log Access" },
                  { key: "4", title: "Admin Role" }
                ]}
                targetKeys={["1", "2"]}
                titles={["Available Permissions", "Assigned Permissions"]}
              />
            </td>
          </tr>

          <tr>
            <td><strong>LiteFilterBuilder</strong></td>
            <td colspan="2">
              <LiteFilterBuilder
                fields={[
                  { key: "title", label: "Post Title", type: "text" },
                  { key: "views", label: "View Count", type: "number" }
                ]}
                filters={[
                  { field: "title", operator: "contains", value: "Svelte" }
                ]}
              />
            </td>
          </tr>

          <tr>
            <td><strong>LiteDynamicFormList</strong></td>
            <td colspan="2">
              <LiteDynamicFormList
                name="orderItems"
                label="Dynamic Order Items"
                items={[
                  { product: "Server Node Alpha", qty: 2, price: 499 },
                  { product: "SSD Storage 2TB", qty: 4, price: 199 }
                ]}
              />
            </td>
          </tr>
          <tr>
            <td><strong>LiteCopyField</strong></td>
            <td>
              <LiteCopyField value="sk_live_92048572019485" masked={true} />
            </td>
            <td>
              <LiteCopyField mode="edit" value="sk_live_92048572019485" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Detailed component parity checklist -->
  {#if report.items && report.items.length > 0}
    <div class="lite-card">
      <h2 class="lite-card-title" style="font-size: 16px; margin-bottom: 4px;">详细组件对齐清单 (Parity Matrix)</h2>
      <p class="lite-card-subtitle" style="margin-bottom: 16px;">
        完整映射 <code>@svadmin/ui</code> 与 <code>@svadmin/lite</code> 组件目录。
      </p>

      <div class="lite-table-scroll">
        <table class="lite-table">
          <thead>
            <tr>
              <th>分类</th>
              <th>UI 组件 (SPA)</th>
              <th>Lite 对应组件 (SSR)</th>
              <th>状态</th>
              <th>降级策略 / 承接方案</th>
            </tr>
          </thead>
          <tbody>
            {#each report.items as item (item.name)}
              {@const st = statusLabel[item.status] ?? { label: item.status, badgeClass: '' }}
              <tr>
                <td><span class="lite-badge">{item.category}</span></td>
                <td><strong>{item.name}</strong></td>
                <td>
                  {#if item.liteComponent}
                    <code>{item.liteComponent}</code>
                  {:else}
                    <span class="lite-text-muted">—</span>
                  {/if}
                </td>
                <td>
                  <span class="lite-badge {st.badgeClass}">{st.label}</span>
                </td>
                <td style="font-size: 12px;">{item.strategy}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
