# Dashboard 查询反馈归属

## 任务约定

- 日期：2026-10-21；parent：`ENTERPRISE_PRODUCT_SYSTEM.md` 查询错误归属规则；
  source：用户“继续”；reason：Dashboard 同时维护多个列表查询和页面内错误、
  指标占位、分区重试，默认通知会与这些反馈重复。
- 目标：Dashboard 的 16 个列表查询均由当前页面承接错误；全局重试只重试失败
  查询，分区重试只重试对应查询；不可用指标显示 `—`，不冒充零。
- 非目标：不改 Dashboard 的指标公式、路由、折叠结构、图表或权限；不接真实
  数据服务，不提交、推送或部署。
- 写入范围：`example/src/features/dashboard/Dashboard.svelte`、
  `example/test/fixtures/BusinessPmHarness.svelte`、
  `example/test/pm-business-pages.test.ts`、本证据及产品规范。
- Follow-up Contract：parent 为本文件原查询通知任务；source 为用户“继续”；
  reason 为角色数量直接使用 `?? 0`，以及已有测试未挂载 Dashboard。
  增补角色加载/失败/成功零值与全局、分区重试的运行验证；
  不改指标公式或共享组件，不把 Surface 自己的请求归入 Dashboard 重试；
  Surface 默认组件错误脱敏另立 `surface-query-feedback-20261021.md`。
- Delegation Decision：medium / managed；主线程单写入者，
  一名只读 verifier。缺少 adaptive 的完整能力交集证明，按 managed 落地。
- 状态：本地行为回归、独立只读复核和浏览器走查完成；
  默认 Surface 组件的错误展示小批次也已完成。

## 查询清单

`products`、`suppliers`、`warehouses`、`stock_movements`、`stock_transfers`、
`cycle_counts`、`inventory_adjustments`、`reorder_rules`、`purchase_orders`、
`sales_orders`、`todos`、`users`、`roles`、`calendar_events`、
`ai_conversations`、`notifications` 均显式设置 `errorNotification: false`。

## 验收

```gherkin
Given Dashboard 的任一资源读取失败
When 页面显示全局错误或对应分区错误
Then 只显示页面内错误，不发送默认通知，不把失败数据折算成零

Given 多个资源同时失败
When 用户点击全局重试
Then 只重新请求当前失败资源，已成功资源不重复读取

Given 单个分区读取失败
When 用户点击该分区重试
Then 只重新请求该分区资源，其他指标和记录保持当前状态

Given 角色数量仍在加载或读取失败
When 用户查看资源概览
Then 角色数显示未知占位，用户数量仍保持可用，成功读取空列表后才显示零

Given 日历分区已成功加载
When 后续刷新失败
Then 保留旧记录并明确标记 partial，指标显示未知，分区重试恢复后移除警告
```

## 验证

- `bun run --cwd example test -- test/pm-business-pages.test.ts`：
  2026-10-21 10:44 启动，145/145，退出 0。
  Dashboard 新增 21 项：16 个查询逐一首次失败/再失败/恢复，
  日历分区定向重试，多资源失败后的部分恢复，
  角色加载至非零/真实零值，以及成功后刷新失败保留旧记录节点。
- `bun run --cwd example check`：0 errors / 0 warnings。
- Surface 默认错误文案接入后，11:02 再执行同一文件 `-t Dashboard`：
  21/21 通过，124 项其他页面用例未参与这次专项重跑；
  11:03 全量业务单文件再次为 145/145。
- `git diff --check`：最终回填后通过。
- 基线等待异步 Surface 的两个独立请求已经发起；重试后检查整个请求增量，
  不用过滤掉其他资源的方式掩盖越界重试。角色文案用精确相等断言，
  不以 `10 roles` 包含 `0 roles` 作为空列表证明。
- 初始测试中的链接定位、Surface 挂载时序和断言范围问题已修正；
  失败运行不计为通过，未跳过用例。
- 独立只读 verifier Noether：未发现 P0/P1 或不成立的 Dashboard 测试；
  复核确认 Surface 原始错误是单独缺口，不应外推为 Dashboard 已修复。
- 浏览器 `svadmin-property-20261021`：
  `dashboard-ready-20261021.png` 显示 1440 宽度正常态，
  `dashboard-role-error-20261021.png` 显示角色失败时单一页面错误、
  `— 个角色`、无原始错误和无 Toast，重试后恢复；
  两张截图均位于 `output/playwright/` 并已人工查看。
- 浏览器 DOM 检查确认 `scrollWidth === 1440`，没有横向溢出；
  预览服务保持运行，浏览器会话已关闭。
- 本证据不代表真实后端或全站验收。

## 尚未完成的独立边界

`DeclarativeSurfaceExample` 使用独立的 `SurfaceRenderer`，不属于上述 16 个
`useList` 的错误与重试所有权；Dashboard 全局重试也不重试 Surface 数据源。
默认 metric、bar-chart、line-chart、resource-table 已改为通用本地化错误文案，
并由独立的 `refresh(sourceId)` 恢复。后续内置 SVAR Grid 的错误分类与真实引擎
失败恢复、撤权恢复已另行验收，见 `surface-query-feedback-20261021.md`；
不计入 Dashboard 的 16 查询或本页测试数量。第三方 Widget 仍需独立验收。
