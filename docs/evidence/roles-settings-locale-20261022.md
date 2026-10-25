# RolesSettings 状态国际化契约

## 任务约定

- Parent：`roles-settings-feedback-20261022.md`。
- Source：用户继续完成企业级规范。
- Reason：RolesSettings 将读取错误和动作标题保存为初始化时的翻译，
  locale 切换后可能继续显示旧语言。
- 范围：`RolesSettings.svelte` 与 `scoped-provider-actions.test.svelte.ts`。
- 非目标：不修改 AuthProvider RBAC 协议、授权算法、PermissionMatrix 布局、
  服务端冲突解决、浏览器或发布流程。
- 编排：medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收场景

1. 角色读取失败、权限读取失败和缺少 RBAC 能力时，英文/中文切换只更新当前提示，
   不重新发起读取，也不泄露 Provider 原文。
2. 显式 Retry 后，原失败路径恢复；权限读取成功后矩阵恢复可编辑。
3. 已选择第二角色且权限保存在途时切换语言，角色选择、权限状态和 pending 禁用
   保持不变，不重复写入；完成后再次切换只提交一次反向变更。

## 实现

`RolesSettings` 将错误保存为 `roles` / `unsupported` 状态码，渲染时通过当前
i18n 作用域翻译；动作列表改为 `$derived`，因此 Create/Detail/Edit/Delete 标题
随 locale 更新。读取、权限缓存、mutation epoch 和授权协议保持不变。

## 验证

从 `packages/ui` 执行：

```sh
bunx vitest run --config ./vitest.config.ts src/components/scoped-provider-actions.test.svelte.ts
```

修复前共 2 项失败、16 项通过；失败均来自本轮新增场景，
其余通过项包含既有 14 项与新增 2 项。修复后 **18/18** 通过，退出码 0。
本轮另执行 `git diff --check`，通过。

## 边界

本地 Provider stub 不证明真实 RBAC 服务、授权边界或并发冲突。
本轮未覆盖 PermissionMatrix 所有文案、真实屏幕阅读器、跨浏览器、
真实消费者发布包和生产部署。
