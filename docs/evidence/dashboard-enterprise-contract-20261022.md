# Dashboard 企业级筛选、时间范围、钻取与错误恢复契约

## 任务约定

- 日期：2026-10-22；parent：`enterprise-ui-acceptance-matrix-20261022.md` B3-10；
  source：用户“继续实施 B3-10 仪表盘企业级契约”；reason：现有 `DashboardView`
  只有受控 `filters`、快照渲染和刷新，缺少时间范围、钻取事件、错误重试以及
  筛选切换竞态的定向证据。
- 目标：扩展类型化公开契约，使全局筛选、UTC 时间范围、metric/text 钻取和
  失败重试具备真实组件测试；筛选/时间范围原位变化后重新查询，迟到响应不能
  覆盖当前选择；钻取载荷必须绑定当前成功快照实际使用的已校验查询。
- 非目标：不新增内置筛选栏、图表、权限界面或演示页面；不接真实 Dashboard
  Provider；不提交、推送、部署。
- 写入范围：`packages/core/src/dashboard-contract.ts`、
  `packages/core/src/dashboard-contract.test.ts`、`packages/core/src/index.ts`、
  `packages/core/src/i18n.svelte.ts`、`packages/ui/src/components/DashboardView.svelte`、
  `packages/ui/src/components/MetricStrip.svelte`、
  `packages/ui/src/components/dashboard-view.test.svelte.ts`、
  `packages/ui/src/components/dashboard-view.reactive.test-host.svelte`、本证据与
  B3-10 矩阵。
- Delegation Decision：low / native；当前 owner 单写入者，风险限于一个公开组件
  契约及其 core 解码器；使用确定性单文件测试和 `git diff --check`，不派发额外
  验证 lane。
- 状态：本地组件契约已实施并通过定向测试；真实 Provider、RBAC、读屏、浏览器
  和发布未验收。

## 公开契约

- `DashboardQuery.timeRange?: { from: string; to: string }`：只接受 UTC ISO
  8601 秒/毫秒时间点，要求 `from <= to`。解码器逐项核对年月日时分秒，拒绝
  `2026-02-29`、`2026-02-30`、`2026-04-31`、`1900-02-29` 等不存在的日历日期，
  拒绝 `24:00:00`、`23:60:00`、`23:59:60`，允许真实闰日如
  `2024-02-29`/`2000-02-29` 以及 1–3 位小数秒；时区偏移和未知时区字段仍拒绝。
- `DashboardDrilldown`：包含 `dashboardId`、`widget`（`id`/`title`/`kind`）、
  可选原始 `metric`、当前成功快照实际使用的 `filters` 和可选 `timeRange`。
  已加载查询是独立解码快照，不复用可能被 Provider 原位修改的请求引用；
  后续 props 原位变化也不会把旧快照与新筛选拼在一起。
- `DashboardView` 新增受控 `timeRange` 与 `onDrillDown`；metric 在存在
  `onDrillDown` 时优先派发类型化事件，否则保留原生 `href` 链接；text widget
  在存在回调时显示“查看详情”按钮。
- 钻取回调同步抛错或异步拒绝时显示通用脱敏 `role="alert"`，不转成 Dashboard
  加载失败，也不丢失已有快照；再次显式点击会先清理旧提示，成功后保持清除。
  切换查询、开始新加载或卸载后，旧的钻取失败结果被忽略。
- 错误分支提供页面内 `Retry`，使用当前 `filters`/`timeRange` 重新查询；失败时
  清空快照与已加载查询，不把旧指标或文本继续显示为当前数据。
- `MetricStripItem.onActivate` 为向后兼容的公开扩展；未提供时行为与原先一致。

## 审查追加与红测

首轮实现前：

- `bun test packages/core/src/dashboard-contract.test.ts`：
  **7 pass / 1 fail**，失败为 `timeRange` 被严格 query 契约拒绝。
- `bunx vitest run src/components/dashboard-view.test.svelte.ts`（cwd
  `packages/ui`）：**3 failed / 3 passed（6）**，失败为筛选/时间范围未透传、
  失败后无 `Retry`、metric/text 无钻取事件。

主线程审查后追加本轮反例，先于修复执行：

- Core：**9 pass / 1 fail（10）**。失败为 `2026-02-29` 被接受；新增断言同时
  覆盖不存在日期、`24:00`、`23:60`、`23:59:60`、合法闰日和小数秒。
- UI：**3 failed / 6 passed（9）**、`9.43s`。新增真实反应式宿主
  `dashboard-view.reactive.test-host.svelte`：输入框原位修改
  `filters[0].value` 与 `timeRange.from`，不替换数组或对象；失败覆盖原位修改
  不重新查询、加载/失败时旧数据仍可见或迟到响应覆盖、以及钻取载荷读取后来
  变更的 props 而不是已加载查询。

失败运行不计为通过，未跳过或删除用例。

主线程最终复核后追加第三轮反例，先于修复执行：

- UI：**3 failed / 12 passed（15）**、`9.81s`。失败为同步抛错和异步拒绝被完全
  吞掉、Provider 原位修改传给它的 request 后钻取载荷变成 `tampered`。新增用例
  同时覆盖失败提示脱敏、失败不丢快照、二次点击成功清理、切查询/卸载后的旧
  失败隔离，以及无 `onDrillDown` 时原 `href` 仍为链接。Core 本轮未修改、未重跑。

## 修复后结果

- `bunx vitest run src/components/dashboard-view.test.svelte.ts`（cwd
  `packages/ui`）：**15/15 passed**、exit `0`、`7.18s`。
- `git diff --check`：exit `0`。
- Core 本轮未修改，按指令未重跑；主线程当前记录的 `10/10` 独立保留，不与本轮
  UI 结果合并。
- 主线程对最终 UI 修正版独立复跑：**15/15 passed**、exit `0`、duration `8.10s`；
  `git diff --check` exit `0`。上述 `7.18s` 为 pi 的独立运行结果。
- 本轮 UI 新增覆盖：同步抛错和异步拒绝均显示通用脱敏 `role="alert"`，原始错误
  不泄漏，已有 `Review queue` 快照保留且不出现 Dashboard 加载失败文案；再次
  点击成功清除提示；切到新查询后旧钻取失败不显示；卸载后旧拒绝被忽略；Provider
  原位修改 request 后钻取仍使用独立的 `home`/`east`/原时间范围；没有
  `onDrillDown` 时 metric 仍是 `/sales` 原生链接。
- 此前结果（独立保留）：Core **10/10 passed**、`57ms`；UI **9/9 passed**、`7.08s`。
- 组件用例覆盖：首次查询精确收到 `filters`/`timeRange`，两者替换后再次传入；
  反应式宿主通过输入原位修改嵌套筛选和时间范围后均触发重新查询；筛选
  `east→west` 后旧请求迟到返回被丢弃；嵌套时间范围请求失败时旧
  `Review queue` 消失、原始错误不泄漏，`Retry` 使用当前嵌套筛选和时间范围恢复；
  metric 与 text 分别派发完整类型化钻取载荷；已加载查询后再原位改动 props，
  钻取仍绑定成功快照对应的 `east`/原时间范围。
- 实现只增加显式嵌套读取：effect 读取每个 filter 的 `field`/`value` 及
  `timeRange.from`/`to`，`provider.get` 和 `load()` 仍在 `untrack` 内执行，避免
  外部 Provider 读取引起 effect 重入；provider 身份变化仍按既有行为触发重载。
  钻取使用加载 epoch 与独立 drill sequence 判定当前作用域，旧结果不覆盖新视图；
  已加载查询在调用 Provider 前单独解码保存，Provider 修改 request 不改变钻取载荷。

## 未验收边界

- 本轮 `filters`/`timeRange` 是受控公开 props，不是内置全局筛选栏或时间选择器；
  真实消费者仍需自行提供控件、URL 状态和授权范围。反应式宿主是本地组件夹具，
  不是完整页面或浏览器表单验收。
- Provider 为本地 `vi.fn` stub；未验证真实聚合口径、服务端时间范围边界、慢请求
  取消、跨租户/RBAC、审计、缓存或真实错误码映射。
- 未新增或运行浏览器、跨浏览器、读屏、SSR、真实 example 在线联调或发布验证；
  `MetricStrip` 的按钮可访问名称只在组件 DOM 层面断言，不等同读屏验收。
- 未证明真实 Dashboard 的全局筛选/时间范围/钻取业务闭环，也不能用本地 stub
  结果外推生产权限或数据正确性。
- 本轮未运行浏览器、真实授权或读屏验证；钻取失败只验证组件 DOM 中的通用提示，
  不代表宿主路由、真实失败码或生产告警链路已验收。
