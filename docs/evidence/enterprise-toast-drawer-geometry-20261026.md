# Toast 与 QuickEditDrawer 浏览器几何验收（2026-10-26）

## 范围

在既有 `scripts/fixtures/enterprise-ui/QuickEditLifecycleFixture.svelte` 中挂载真实
`Toast` 宿主，并保留公开 `toast.warning(..., 60_000, { key })` 产生的持续
Toast 场景；同时新增真实 `QuickEditDrawer → AutoForm → contract-form` 的 update
reject 场景。该场景由既有 `fireErrorNotification → Core toast` 默认反馈路径
产生 error Toast；fixture 不注入自定义 provider，直接走 Core 默认 toast 链和
默认 error 生命周期，并非用宿主按钮直接 toast 作为唯一证据。测试继续使用真实
`AutoTable → QuickEditDrawer → AutoForm`，未引入 mock Toaster，未改共享依赖、
生产 Toast 定位实现或项目公共 API。

本次只扩展专属 `quick-edit-lifecycle.spec.ts` 与对应 fixture，不提交、推送、
发布或部署。整体企业级验收状态仍为 `PARTIAL`。

## 执行结果

```text
./node_modules/.bin/playwright test \
  --config scripts/fixtures/enterprise-ui/playwright.quick-edit-lifecycle.config.ts \
  --reporter=line
30 passed
exit 0
Chromium/WebKit/Firefox × desktop(1440×1000)/narrow(390×844)，workers=1
```

先以 `--grep "surfaces a failed update"` 单独验证新增 error 场景六个 project
（`6 passed`，`exit 0`），再运行上述单文件配置整体；未运行全量 Playwright 套件。

## 新增断言

1. 原 warning 场景保留：Drawer 打开后由真实队列产生 Toast，Toaster 切到
   `data-y-position="bottom" data-x-position="left"`。
2. 新增 error 场景：打开真实 QuickEditDrawer，修改 Title 并点击 Save，等待
   deferred `update` 被宿主 reject；断言 contract-form 既有错误反馈路径经 Core
   默认 toast 产生的 `[data-sonner-toast][data-type="error"]` 可见，文案为
   `Operation failed`/`操作失败`，且不是宿主 warning 文案。
3. 等待 Toast 动画结束后读取真实 `boundingBox()`，逐项断言其不与
   `[data-slot="sheet-header"]`、Close 按钮、Save 按钮的 bounding box 相交；
   warning 与 error 两个场景都执行该几何断言。
4. 关闭 Drawer 后 Toast 仍可见，Toaster 恢复
   `data-y-position="top" data-x-position="right"`；恢复后的 Toast 右边缘不超出
   视口，且位于视口上半部。error 场景关闭前经过既有 tainted 确认对话框，确认
   失败更新未写入记录、未泄漏私有错误诊断。
5. 继续断言页面无横向溢出、pageerror 为空，并保存截图到
   `output/playwright/quick-edit-lifecycle/`。warning 场景保留 Drawer 打开与关闭
   截图；error 场景因默认 5s 生命周期，把截图延后到关闭并恢复 top-right 之后，
   避免截图耗时挤占几何断言窗口。

首次在无激活 Toast 时查询 Toaster 位置会得到 0 个元素，因为 Sonner 仅在存在
Toast 时渲染定位容器；断言已调整为先等待 Toast 可见，再校验定位属性，不伪造
DOM。

## 默认链与旧转发版区别

- 当前版本：fixture 不设置 `notificationProvider`，`contract-form` 的
  `fireErrorNotification` 直接调用 Core 内置 toast 回退，使用生产默认 error
  时长；测试在有效时间内完成可见性、几何和关闭后恢复断言。
- 旧转发版：fixture 注入自定义 `NotificationProvider`，把通知再转发到公开
  `toast` 且把 error 时长延长到 30s。它仍由真实 reject 触发，但最后一步是
  fixture 转发并把生命周期改成测试专用值，不能证明生产默认错误通知链。
- 本版已移除该 provider，没有延长生产 duration，也没有改动共享依赖；未使用
  Playwright clock 接管通知计时器。

## 主线程独立复核（2026-10-27）

- 独立运行同一单文件配置：**30/30 passed、exit 0、1.4m**，三引擎各含桌面和
  窄屏，共六项目；不与 pi 的独立运行相加。
- 确认 fixture 未设置 NotificationProvider，error 场景通过真实表单 Save →
  deferred update reject → Core 默认错误通知 → 真实 Sonner 渲染，未修改默认
  时长、未使用测试时钟。保留 warning 与原有三条生命周期场景。
- 独立检查新增几何断言与关闭确认路径；查看 Chromium、Firefox 窄屏 warning
  截图，当前短表单标题、关闭、Save 区与 Toast 无重叠。error 打开态由矩形断言
  验证，不声称已对该时刻截图做视觉复核。
- 目标 fixture/spec ESLint `--max-warnings 0` 和 `git diff --check` 均 exit 0。
- 当前证据关闭该场景的本地浏览器缺口，不扩大为全局 Toast 布局或读屏认证。

## 未覆盖边界

- 仅验证一次 deferred update 被 reject 后的单条 error Toast；未覆盖真实后端
  失败、认证/租户/RBAC 拒绝、重试、错误详情展开或多错误并发。
- 只验证单条 Toast 与单个 Drawer 的当前视口几何；未覆盖多条堆叠 Toast、长文案
  换行、浏览器文本缩放、页面缩放、RTL、移动端软键盘、减少动画偏好或读屏播报。
- 几何断言使用 `boundingBox()` 与元素矩形相交，不证明视觉对比度、像素级遮挡、
  `z-index` 层叠顺序或指针事件穿透。
- 宿主控件位于 modal overlay 之后，测试沿用既有 DOM click handler 的带外动作
  路径；不宣称真实指针可以点击背景宿主控件。
- 仍不证明真实后端失败、认证/租户/RBAC、发布包、部署或跨设备在线验收。
