# PR 756 UI evidence

本证据使用当前 PR 的状态契约制作浏览器 fixture，覆盖三个行为变化：

| 组件/状态 | 1440x900 | 1920x1080 | 验证重点 |
| --- | --- | --- | --- |
| `AnnouncementBanner` 非阻断 | ✅ | ✅ | `blocking=false`、`aria-live=polite`，不使用 `role=alert` |
| `DualApprovalGate` 外部审批状态 | ✅ | ✅ | pending / approved 由宿主状态提供，不生成模拟批准或本地审计事实 |
| `PageSkeleton` / `ProSkeleton` 加载态 | ✅ | ✅ | `aria-busy=true`、`aria-live=polite`，不展示旧业务内容 |

截图来自 Chromium，视口为 1440x900 与 1920x1080。fixture 只验证组件状态展示和布局，不替代 xigu-fa 的真实 FA RPC、状态机、权限或生产验收。
