# PermissionMatrix 表单与实例语义

## 任务约定

- Parent：`roles-settings-locale-20261022.md`。
- Source：用户继续完成企业级规范。
- Reason：角色选择框使用固定 DOM ID，矩阵按钮未声明非提交语义。
- 范围：`PermissionMatrix.svelte`、直接组件测试及真实 Svelte 表单宿主夹具。
- 非目标：不修改 RBAC 协议、授权算法、视觉样式、动作文案或服务端行为。
- 编排：medium / managed；主线程唯一 writer，一名只读 verifier。

续接约定：parent 为本文表单与实例语义；source 为用户继续；reason 为授权状态
仅通过图标表达。新增范围仅权限按钮 `aria-pressed` 与本文件组件测试，
延续 medium / managed、单 writer 和只读 verifier，不修改业务权限计算。

## 验收场景

1. 两个 PermissionMatrix 实例的角色 label 只关联自身 select，改变第二个实例
   不改变第一个实例。
2. 角色切换按钮和权限操作按钮均为 `type="button"`，嵌入 form 时不触发宿主提交。
3. 权限操作按钮通过 `aria-pressed` 暴露当前受控授权状态；Enter/Space 使用当前
   角色和授权值调用宿主，不由按钮本地伪造状态。
4. 权限按钮仍只调用一次宿主 `onToggle`；宿主显式 submit 按钮仍可提交。

## 实现

使用 `$props.id()` 为角色 select 生成实例级 ID，并同步 label 的 `for`。
角色侧栏和权限操作按钮显式声明 `type="button"`，避免继承外层 form 的 submit
默认值；权限按钮增加 `aria-pressed={granted}`，名称保持稳定。其权限计算、
回调参数和状态样式保持不变。

## 验证

从 `packages/ui` 执行：

```sh
bunx vitest run --config ./vitest.config.ts src/components/permission-matrix.test.svelte.ts
bunx vitest run --config ./vitest.config.ts src/components/scoped-provider-actions.test.svelte.ts
```

本轮 PermissionMatrix 直接回归 **5/5**，退出 0。
RolesSettings 关联回归 **18/18** 为前一轮表单/实例修复时的结果，本轮未重跑。
将固定 ID 和两个 `type` 改动临时回放时，新增测试分别失败，恢复后重新通过。
真实 Svelte form 宿主测试确认权限操作只回调一次且不会触发宿主 submit。
`git diff --check` 通过。
只读 verifier 确认本轮受控状态和键盘回调未发现新增 P0/P1/P2 阻断。

## 边界

本轮仅覆盖 DOM 层 `aria-pressed` 状态表达，不等同真实屏幕阅读器播报。
完整 PermissionMatrix 文案、真实屏幕阅读器、跨浏览器、真实 RBAC Provider、
消费者发布包或生产部署仍未验收。

## 2026-10-22 文案补充

续接约定：parent 为本文实例语义；source 为用户继续；reason 为权限操作名称
固定英文。范围为 PermissionMatrix、Core 两条翻译词条、两份直接测试及验收文档。
不修改共享翻译算法、授权规则或页面布局，沿用 medium / managed，单 writer 与
Bohr 只读 verifier。

权限操作按钮的辅助名称改为由 `permissions.toggleAction` 按当前 locale 派生，
中文使用“切换”，英文使用“Toggle”。locale 往返测试保持当前角色、aria-pressed、
可操作时的焦点和 loading 禁用状态；不据此证明禁用期间的焦点保持。
只读复核指出动作名称含 `$&`、`$$` 时字符串替换会失真，现使用组件内函数式替换，
并覆盖特殊名称中英文往返；不改共享翻译算法。

验证：

- `bunx vitest run --config ./vitest.config.ts src/components/permission-matrix.test.svelte.ts`：7/7
- `bunx vitest run --config ./vitest.config.ts src/components/scoped-provider-actions.test.svelte.ts`：20/20
- `git diff --check`：通过
