# Dashboard 真实 example 消费者：截图稳定性与复核记录

## 任务约定

- 日期：2026-10-22；parent：`enterprise-ui-acceptance-matrix-20261022.md` B3-10；
  source：续轮合同“B3-10 主线程独立复核与截图稳定性”。
- 本轮目标：只修专属 e2e 截图 helper，使用 Playwright `animations: 'disabled'`，
  并在截图前确认详情容器及相关祖先 `opacity` 已稳定为 1；不修改生产视觉、不
  放松行为断言、不睡眠掩盖。
- 非目标：不重跑未改 core/数据单测；不跑全量测试/架构检查/typecheck；不接真实
  服务；不提交、推送、部署。
- Delegation Decision：medium / managed；pi 为唯一 writer，主线程为独立
  verifier；只跑同专属 18 项与 `git diff --check`。
- 状态：主线程已独立复核上一版浏览器 **18/18、1.2m**、example 配置单测
  **6/6、1.10s**、diffcheck `0`；本轮截图 helper 修复后 pi 自测 **18/18、1.4m**，
  待主线程复核新截图。

## 主线程独立复核记录

- 主线程独立浏览器：**18/18 passed**、duration `1.2m`。
- 主线程按 example 配置单文件：**6/6 passed**、duration `1.10s`。
- 主线程 `git diff --check`：exit `0`。
- 主线程首个从根目录、未带 example 配置的 vitest 因 `$state` 报错并得到
  **0 test**；随后按实际 example 配置运行成功。该失败仅作为错误命令的独立记录，
  不计入单测通过结果，也不与 pi 结果合并。

## 截图问题与修复

- 主线程抽查发现旧 `webkit-narrow-detail.png` 与
  `chromium-desktop-detail.png` 捕获到淡入低 opacity 中间态，不能作为稳定视觉
  证据。旧截图结论作废。
- 根因：`AdminApp.svelte` 使用 `.svadmin-page-enter`，对应
  `svadmin-page-enter 180ms ease-out`（从 `opacity: 0` 到 `1`）；详情截图在动画
  结束前触发。
- 只修改 `e2e/dashboard-workspace.spec.ts` 截图 helper：
  - `page.screenshot({ animations: 'disabled' })`；
  - 详情截图传入详情容器；截图前遍历容器及祖先，等待有限 `getAnimations()`
    完成，并断言每一层 computed `opacity >= 0.999`；
  - 不使用固定 sleep，不修改生产 CSS/过渡，不改变任何行为断言。
- `detail` 与 `detail-returned` 截图均使用稳定目标；其余截图也启用
  `animations: 'disabled'`。

## 本轮 pi 结果

- `bunx playwright test --config playwright.dashboard-workspace-example.config.ts`
  **18/18 passed**、exit `0`、duration `1.4m`，Chromium/WebKit/Firefox ×
  desktop/narrow，端口 `5185`，`workers: 1`。
- `git diff --check`：exit `0`。
- 按指令未重跑未改的 core/数据单测；主线程 previous example 配置单测 **6/6**
  独立保留。
- 截图路径：
  `output/playwright/dashboard-workspace-example-20261022/`；本轮同名覆盖
  `*-detail.png` 与 `*-detail-returned.png`。

## 待主线程复核项

- 本轮 pi **18/18、1.4m** 与新的 detail 截图待主线程独立复核。
- 需主线程确认新 `webkit-narrow-detail.png`、`chromium-desktop-detail.png`
  不再处于淡入低 opacity 中间态；helper 已通过 computed opacity 和
  `getAnimations` 等待保证，但不把 pi 自测当作视觉认证。
- 主线程已复核上一版 18/18；本轮仅截图 helper 变化，仍需按新结果独立记录，
  不与上一版合并。

## 最终主线程复核

- 截图 helper 修正后，主线程独立执行同一专属配置：**18/18 passed**、exit `0`、
  duration `1.2m`。此运行与此前运行、pi 的 `18/18 / 1.4m` 分别记录。
- 抽查本次生成的 `webkit-narrow-detail.png`：淡入已结束，返回按钮、record id、
  数量、备注和日期可见，未见明显遮挡。这不是读屏或全面视觉认证。
- 此结果补齐上文“新截图待主线程复核”项；数据单文件沿用本轮已独立验证的
  **6/6 / 1.10s**，未因仅调整截图重复运行。

## 未授权真实服务边界

- 仍使用 `inMemoryDataProvider`、`mockAuthProvider` 和本地 hash 路由；未授权
  真实 Dashboard Provider、真实聚合/详情服务或生产权限。
- 未验证真实 RBAC/跨租户、服务端时间范围边界、详情权限、慢请求取消、错误码
  映射、审计、屏幕阅读器、SSR、发布或部署。
- 未重建 `packages/ui/dist`，不证明已发布包消费路径；本轮不发布、不提交。
