# Surface 源错误语言与绑定边界 Follow-up Contract（2026-10-27）

## 主线程独立复验

- SurfaceRenderer 单文件 **24/24 passed、exit 0、2.60s**；目标 ESLint
  `--max-warnings 0` 与 `git diff --check` 通过。
- 审查确认 locale/messages 切换不增加 Provider、权限或 onError 调用，渲染期
  绑定错误走同一呈现边界。整体目标保持 PARTIAL。

## 契约

- parent: `docs/evidence/enterprise-surface-source-error-diagnostic-20261027.md`
- source: 用户持续目标“续接 svadmin 企业级规范”；reason: 上轮错误文案收敛后的
  语言/绑定边界复核。
- orchestration/risk: managed / medium；pi 为唯一代码 writer，主线程独立 verifier。
- 唯一写入范围：`packages/surface/src/components/SurfaceRenderer.svelte`、
  必要的 `packages/surface/src/localization.ts`、
  `packages/surface/src/SurfaceRenderer.test.svelte.ts` 与
  `packages/surface/test/fixtures/DiagnosticEchoWidget.svelte`，以及本契约和
  对应证据文档。保留全部既有 dirty 改动，不提交、推送、发布或部署。

## 复核问题

1. 源加载错误已写入 `sourceStates` 后，切换 `locale` / `messages` 时，
  缓存中的本地化文案不会更新，自定义 widget 仍显示旧语言；修复不得为此
  重新请求 Provider 或重复权限检查。
2. `resolveSurfaceSourceData` 在渲染期产生 `binding_pointer_not_found`，
   该状态绕过了上一轮只在 `sourceCache.set` 收敛的边界，自定义 widget 仍可
   直接看到固定英文内部诊断。

## 验收

- 错误状态在统一呈现边界按当前 `activeMessages` 重新本地化，包括渲染期
  绑定错误；切换语言只更新展示，不新增 Provider/权限请求。
- `onError` 继续接收加载期原始诊断，加载隔离与刷新语义不变。
- 仅运行 `SurfaceRenderer.test.svelte.ts` 单文件测试、目标文件 ESLint 与
  `git diff --check`；整体企业级验收维持 `PARTIAL`。
