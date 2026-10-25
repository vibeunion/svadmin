# ApprovalCenter 浏览器恢复证据

- parent: `approval-center-refresh-feedback-20261022.md`、
  `approval-center-idempotent-retry-20261022.md`
- source: 用户继续完成原始企业级 UI 范围
- scope: enterprise-ui ApprovalCenter fixture、路由、Playwright 专用配置和浏览器用例；
  不修改 ApprovalProvider 协议
- risk/orchestration: medium / managed；主线程 writer，Bohr 只读 verifier

## 验收结果

- `bunx playwright test --config=./playwright.approval-center.config.ts`：**2/2**，
  Chromium 桌面/窄屏通过。
- 读取失败显示 Retry，不显示空审批或 Provider 原文；Retry 后恢复真实记录。
- 审批动作失败时对话框保持打开，意见草稿保留且诊断不泄露；再次确认成功关闭
  对话框并更新为 approved。
- 两次实际 transition 的载荷保持相同的记录 ID、版本、动作、意见和幂等键；
  fixture 同时记录读取/动作次数。
- 已检查 `output/playwright/approval-center/narrow-action-failed.png`。审批对话框
  在窄屏可见，错误提示在意见框下方且按钮仍可操作；fixture 诊断输出已改为可换行。

真实审批 Provider、服务端冲突、读屏、跨浏览器和消费者发布验收仍未关闭。
