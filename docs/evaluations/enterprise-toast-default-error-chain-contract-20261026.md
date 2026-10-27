# Toast 默认错误通知链 follow-up 契约

- parent: `docs/evaluations/enterprise-ui-unblock-contract-20261024.md`
- source: 主线程审查 `docs/evidence/enterprise-toast-drawer-geometry-20261026.md`
  的 30/30 结果，指出其 error Toast 由 fixture 自定义 `NotificationProvider`
  转发并延长时长，仍缺 Core 默认错误通知链证据。
- reason: 真实 QuickEditDrawer 的 `update` reject 必须经 `contract-form` 的
  `fireErrorNotification` 默认回退直接产生 error Toast；不能把测试专用转发
  provider 当作生产默认链的替代证据。
- orchestration/risk: managed / medium；pi 唯一代码 writer，主线程独立 verifier
  与复跑。无 `coordination.json` / `agmesh` CLI，以本契约和证据文档记录边界。
- workspace: 隔离工作树 `enterprise-storage-acceptance`；保持既有 dirty 改动，
  不清理、不提交、不推送、不发布或部署。
- scope: 仅修改既有 `QuickEditLifecycleFixture.svelte`、专属
  `quick-edit-lifecycle.spec.ts` 与对应证据/契约文档。移除 fixture 自定义
  `NotificationProvider`；保留原 warning 场景和全部生命周期覆盖；新增 error
  场景继续断言 error Toast 可见、三引擎 desktop/narrow boundingBox 不与 Drawer
  header/close/save 相交，关闭后恢复 top-right。
- timing: 优先使用 Core 生产默认 error 生命周期，不修改生产 duration；必要时
  只把截图延后，避免挤占断言窗口。只有在默认时长无法稳定完成断言时才考虑
  Playwright clock，并且必须明确记录其只接管通知计时器。
- non-goals: 不改共享依赖、生产 Toast 定位、通知实现或公共 API；不延长生产
  duration；不覆盖真实后端失败、认证/租户/RBAC、多条堆叠、RTL、读屏、发布或
  部署验收。
- verification: 先只跑新增 error 场景六个 project，再跑单文件 Playwright 配置
  全量；主线程随后独立复跑。整体企业级状态继续保持 PARTIAL。

## 验收场景

```gherkin
Scenario: 真实 update reject 产生默认 error Toast 且不遮挡 Drawer 动作
  Given 真实 QuickEditDrawer 已打开并提交一次 update
  When 宿主 reject 该 pending update
  Then Core 默认错误通知链产生可见的 error Toast
  And 三引擎 desktop/narrow 下 Toast 不与 Drawer header/close/save 相交
  And 关闭 Drawer 后 Toast 恢复 top-right 且仍在视口上半部
```

## 执行状态

- 新增 error 场景六个 project：`6 passed`，`exit 0`。
- 单文件配置整体复跑：`30 passed`，`exit 0`；Chromium/WebKit/Firefox ×
  desktop/narrow，workers=1。
- 未使用自定义 provider、未延长生产 duration、未使用 Playwright clock。
- 主线程独立复跑已完成：30/30 passed、exit 0、1.4m；定向 ESLint 和 diff 检查
  通过。本轮不提交、不推送、不发布或部署；整体目标仍为 PARTIAL。
