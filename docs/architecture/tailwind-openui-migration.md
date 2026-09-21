# Tailwind / OpenUI 迁移任务契约

- 基线：`7b83b892`，分支 `codex/tailwind-openui`。
- 风险：high；orchestration：panel。按 UI、Surface、构建边界分段迁移；收口后冻结修改，由独立 reviewer 只读核验，主任务汇总并修复。
- 授权：用户明确授权本地样式迁移；禁止 commit、push、发布、部署及修改原工作区。
- 目标：引入 shadcn-svelte 作为组件作者工具，以 Tailwind 语义类、tokens、`tailwind-variants` recipes 和 Bits UI primitives 承载 OpenUI 思想；移除 Panda 构建链及生成依赖。
- 保留：语义 tokens/themes、Slots 有限变体、无障碍行为、最新业务修复、DevTools，以及 OpenUI 的 schema/registry/validation/受控动作与权限边界。
- 兼容范围：xigu-fa 当前 vendor `@svadmin/ui@0.71.3` 的组件导出、props、theme token 与 class 覆盖；不兼容未使用的 Panda recipe、hashed class 或 generated styled-system。
- 非目标：不整体 revert 混合提交、不重写业务逻辑、不覆盖已有增强组件、不发布或部署。

## 后续授权

- parent/source：以上初始 Button 迁移契约。
- reason：用户明确要求“完成剩余所有阶段，实行全量迁移”，并再次授权“实施”。
- 范围：UI 和 Surface 的编译器、recipes、CSS 产物、构建与门禁；保留全部业务组件、OpenUI 协议和权限逻辑。
- 验证：直接相关的组件测试、recipe/CSS 测试，以及两包构建与产物检查。发现既有合并损坏时，仅修复阻塞这些组件的最小范围。

## 验收

1. Given 当前组件业务行为，When 引入 shadcn-svelte 基础设施并迁移 Button recipe，Then 仅改变样式组合实现并保留组件接口、Slots 与 accessible behaviors。
2. Given 语义主题变量，When 新 recipe 组合 Button 类名，Then 只使用既有语义 CSS 变量和稳定类名，不引入调色板硬编码。
3. Given OpenUI schema 与注册组件，When 输入非法属性或未授权动作，Then 既有验证及权限边界保持不变，不开放任意 CSS 或代码。
4. Given 现有增强组件，When 使用 shadcn-svelte 生成器，Then 只生成可审查的候选源码，不覆盖现有实现或伪装成已完成迁移。
5. Given 本地改动，When 验证，Then 仅运行一个直接相关测试文件及 git diff --check；可补充目标样式构建/类型核验，分别报告失败与未验收项。

## 执行状态

迁移实现与 example 本地整改已完成，后续验证详见 [PM 收尾报告](../evaluations/example-pm-audit-2026-09-21/followup.md)。已移除 Panda 构建配置、依赖与 styled-system 残留，修正 example 样式入口和相关 CI 路径。公开 recipe 统一返回 slot 字符串对象，Surface design-contract 从 UI 单一来源导入。

2026-09-21 后续授权：用户要求清理全部 Panda 残留并实施 AI 编写体验优化。新增 `@svadmin/ui/component-registry` 为纯作者元数据入口，不替代 Surface schema、授权或执行协议。当前覆盖十二个 UI 组件和十四个 recipe 家族；`class` 与 snippet 是可信开发者编写接口，不是运行时模型权限。

根目录提供 `check:ui-style`、`check:surface-style`、`check:openui`，分别验证目标构建、样式与发布边界；不是全仓测试或上线验收。

UI 构建已通过，但存在既有 `import.meta.env` 打包提示。注册表为显式支持的作者元数据子集，不宣称覆盖全部组件；xigu-fa 最低版本真实升级不属于此次 example 浏览器验收。浏览器及活动文档整改的最新状态以 PM 收尾报告为准，不将本地结果等同于生产发布。

## 提交与合并授权

- 日期：2026-09-21；parent：本迁移契约及 PM 收尾报告。
- source/reason：用户明确要求“全部完成后 git 提交 push，合并到 main，可以强制推送，覆盖之前 pandacss 提交”。
- 本轮目标：提交已完成的迁移和相关整改，推送 `codex/tailwind-openui`，将相同提交合入远端 `main` 并读回验证。
- 非目标：npm 发布、部署、改动原工作区的未跟踪文件、清除无关提交。
- 合并风险中等；orchestration：managed，主 writer 执行交付，一名只读 verifier 核查提交边界及迁移契约。原迁移实现的 panel 记录保持不变。
- 已拉取远端，`origin/main` 与迁移起点同为 `7b83b892`。优先普通快进，以新实现替代 Panda；不需要重写或强推已发布历史。
- 验证沿用已冻结实现的专项测试、构建和浏览器证据，追加样式源边界、注册表契约、暂存差异检查及远端 SHA 读回。不运行全仓测试，不冒称远端 CI 通过。
