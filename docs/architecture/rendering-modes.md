# 渲染模式边界：SPA、现代 SSR 与 Lite

本文固定当前渲染策略，避免把“SSR 优先”误解为“下线 SPA”。

## 决策

| 形态 | 入口 | 状态 | 职责 |
| --- | --- | --- | --- |
| SPA | `example/` | 保留，短期不迁移 | 现代交互、复杂表格与编辑器、客户端路由、静态部署 |
| Lite SSR | `packages/lite/example/` | 保留 | 零 JS、IE11、服务端 HTML 降级 |
| 现代 SSR | 未新增 | 按需 | 首屏、服务端聚合、流式渲染；不替代 SPA |

SPA 仍是现代交互的主入口。SSR 改变的是首屏如何生成，不改变 hydration 之后的
客户端导航和交互模型。Lite 是独立兼容层，不参与现代 SPA 的 hydration。

## 约束

- `example/` 不为追逐 SSR 而整体迁移到 SvelteKit。
- Lite 继续遵守 `ssr = true`、`csr = false`、无 hydration、IE11 CSS 基线。
- 不维护第三套现代 UI；未来现代 SSR 必须复用 `@svadmin/ui` 与 `@svadmin/core` 契约。
- SPA 与未来现代 SSR 共享 DataProvider、ResourceContract、权限和查询键。
- 后台刷新保留旧内容并显示非阻塞 `DataState state="refreshing"`；初始加载、
  错误、无权限和初始空态仍使用阻塞状态。

## 何时新增现代 SSR

满足至少一项再启动：

1. 有明确的低端设备或弱网首屏指标。
2. 需要服务端聚合多个数据源或流式 Dashboard。
3. 部署方明确要求 SSR。
4. 需要与现代 SSR 共享服务端权限和数据契约。

新增时使用独立 SvelteKit 宿主，消费同一套 UI 与 Core，不重写 `example/`。