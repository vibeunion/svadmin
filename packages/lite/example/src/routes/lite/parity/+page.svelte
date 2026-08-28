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
  } from '@svadmin/lite';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
  const report = $derived(data.parityReport);

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

  <!-- 分类进度面板 -->
  <div class="lite-card" style="margin-bottom: 24px;">
    <h2>模块分类适配进度</h2>
    <p class="lite-muted" style="margin-bottom: 16px;">
      各功能模块的对齐状态与降级承接情况。
    </p>

    <div style="margin-left: -8px; margin-right: -8px; display: flex; flex-wrap: wrap;">
      {#each Object.entries(report.categories) as [catName, cat] (catName)}
        <div style="flex: 1 1 280px; margin: 8px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="text-transform: capitalize; color: #0f172a;">{catName}</strong>
            <span class="lite-badge lite-badge-success">{cat.percentage}%</span>
          </div>
          <div class="lite-progress-track" style="width: 100%; margin-left: 0; margin-bottom: 8px;">
            <div class="lite-progress-fill lite-progress-success" style="width: {cat.percentage}%;"></div>
          </div>
          <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between;">
            <span>1:1: {cat.adapted} | 降级: {cat.fallback}</span>
            <span>总计: {cat.total}</span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- 新增组件现场验证与交互 Showcase -->
  <div class="lite-card" style="margin-bottom: 24px;">
    <h2>SSR 组件现场展示与验证 (Showcase)</h2>
    <p class="lite-muted" style="margin-bottom: 16px;">
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

  <!-- 详细组件对齐清单 -->
  {#if report.items && report.items.length > 0}
    <div class="lite-card">
      <h2>详细组件对齐清单 (Parity Matrix)</h2>
      <p class="lite-muted" style="margin-bottom: 16px;">
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
