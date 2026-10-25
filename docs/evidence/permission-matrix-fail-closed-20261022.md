# PermissionMatrix 非布尔授权决策 fail-closed

## 任务约定

- Parent：`permission-matrix-form-identity-20261022.md`。
- Source：用户继续完成企业级规范。
- Reason：`isGranted` 返回非布尔值或抛错时，界面不能把未知/继承状态显示为已授权，也不能允许据此提交。
- 范围：`packages/ui/src/components/PermissionMatrix.svelte` 的本地决策归一、
  `permission-matrix.test.svelte.ts` 窄回归、`permission-matrix.test-host.svelte` 表单宿主断言及本证据文档。
- 非目标：不新增继承协议、拒绝原因协议、字段权限协议或 RBAC 服务；不修改授权算法、服务端行为、
  消费者 API 形状、视觉样式或动作文案。
- 编排：窄任务 managed；pi 为唯一 writer，主线程为 reviewer。未提交、未推送、未部署。

## 验收场景

1. `isGranted` 明确返回 `true` 时，权限按钮 `aria-pressed="true"` 且可执行切换，
   宿主收到当前角色、资源、动作和取反后的授权值。
2. `isGranted` 明确返回 `false` 时，权限按钮 `aria-pressed="false"` 且仍可点击切换为授权；
   显式拒绝不是禁用原因。
3. `isGranted` 返回继承值（如 `'inherit'`）、`undefined`、未知状态对象等非布尔值时，
   按钮不得显示为已授权，必须渲染为未按下且禁用，点击不调用 `onToggle`，也不提交宿主表单。
4. `isGranted` 抛错时，组件捕获并收敛为未授权/禁用，不泄露原始错误文本；
   后续受控值恢复为 `false` 后按钮重新可操作并可正常切换。

## 实现边界

组件把 `isGranted` 的返回值归一为 `granted | denied | unknown`：仅当值严格等于 `true`
才视为已授权；严格等于 `false` 为显式拒绝；其他值与抛错统一视为未知并 fail-closed。
未知状态渲染为未按下、禁用，且 `onclick` 不触发宿主回调。

本轮只证明本地 UI 对非布尔决策的 fail-closed 行为：

- 不新增继承语义，不解释“继承自哪个角色”。
- 不新增拒绝原因协议，不展示拒绝来源或理由。
- 不新增字段权限能力。
- 不等于真实 RBAC、服务端授权、租户隔离或权限 Provider 验收。

## 验证结果

基线（本轮改动前）pi 自测：

```sh
cd packages/ui
bunx vitest run --config ./vitest.config.ts src/components/permission-matrix.test.svelte.ts
```

结果 **7/7 passed**、exit `0`。

新增非布尔/抛错用例后、生产未改时，同一单文件红测：

- **4 failed / 7 passed**（共 11 项），exit 非 `0`。

最小实现修复后，pi 自测同一单文件：

- **11/11 passed**、exit `0`。

主线程独立复核命令（在 `packages/ui` 运行）：

```sh
bunx vitest run --config ./vitest.config.ts src/components/permission-matrix.test.svelte.ts
```

结果 **11/11 passed**、exit `0`、duration **4.19s**。pi 与主线程两次运行分别记录、
不合并计数。本轮另执行 `git diff --check`，通过。

## 未验收边界

真实 RBAC 服务、继承链、拒绝原因、字段权限、服务端边界、跨用户并发、真实租户授权、
真实屏幕阅读器、生产浏览器版本、消费者发布包和部署均未验收。本地 fail-closed
只说明组件不会把未知决策当作已授权，不能外推为真实授权模型已完成。