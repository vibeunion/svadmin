# PermissionMatrix 真实浏览器验收

## 任务约定

- Parent：`permission-matrix-form-identity-20261022.md`。
- Source：用户继续完成企业级规范。
- Reason：组件级 ID、表单和 `aria-pressed` 回归尚未有真实消费者证据。
- 范围：enterprise-ui 本地 fixture、三引擎两视口 Playwright 场景及本证据。
- 非目标：不把 fixture 受控状态当作真实 RBAC 服务、服务端冲突或读屏认证。
- 编排：medium / managed；主线程唯一 writer，一名只读 verifier。

## 验收场景

1. 两个真实 PermissionMatrix 实例的角色选择互不影响；窄屏使用原生 select，
   label 点击后焦点只回到自身；桌面使用侧栏角色按钮和 Enter 切换。
2. 第二实例权限按钮用 Enter 授予、Space 撤销，`aria-pressed` 与受控状态同步，
   第一实例保持原授权。
3. 矩阵操作不触发宿主 form submit；显式提交按钮仍能提交一次，页面无异常。

## 实现

`PermissionMatrixFixture.svelte` 使用真实 `PermissionMatrix`、两实例、
受控角色/授权状态和真实 form；`App.svelte` 增加
`?view=permissionmatrix` 入口，专属 Playwright 配置覆盖 Chromium、WebKit、
Firefox 的桌面 1440×1000 与窄屏 390×844。

## 验证

从 `scripts/fixtures/enterprise-ui` 执行：

```sh
bunx playwright test --config=./playwright.permission-matrix.config.ts
```

三引擎两视口 **6/6** 通过，退出码 0；每项检查 pageerror，并保存桌面/窄屏
截图。初次 Chromium 窄屏截图发现诊断 JSON 撑宽夹具；测试专用输出已隐藏，
并补充文档宽度不超过视口的断言。不据此宣称全部布局或真实读屏验收完成。
本轮同时执行 `git diff --check`，通过。

## 边界

fixture 使用本地受控状态，不调用真实 AuthProvider 或 RBAC 服务。
本轮验证的是真实浏览器 DOM、键盘和表单行为，不等同屏幕阅读器认证；
未覆盖服务端并发冲突、真实权限 Provider、生产浏览器版本、消费者发布包或部署。
