# 企业基础组件当前状态复核

日期：2026-10-21。基线 HEAD：`51ce56238061ede8a3ee3e882f6799a5d896440c`。
验证发生在包含查询反馈改动的未提交工作区，不代表该 HEAD 的发布候选已验收。

## 任务边界

来源：用户要求继续完善企业级统一规范，直到全部完成。
本次原子任务是校正历史企业组件计划与当前实现的差异，避免重复开发或把历史
结果当作当前证明。只修改计划、正确性说明和相关迁移文档，不改组件行为、
依赖、权限、发布或部署。

文档校准为低风险、单写入者；无需独立实现委派。全线程目标仍包含视觉、
页面工作流、状态恢复、公开契约和相应验收，不由这三份测试缩减为“全部完成”。

## 当前证据

在 `packages/ui` 执行
`node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts <文件>`：

| 文件（相对于 packages/ui） | 结果 | 直接证明的范围 |
| --- | --- | --- |
| `src/components/filter-builder.test.svelte.ts` | 38/38，退出码 0 | 递归条件往返、历史条件保留、完整查询校验、集合类型、禁用公开方法、SPA/Lite 类型契约 |
| `src/components/json-schema-form-enterprise.test.svelte.ts` | 41/41，退出码 0 | 递归默认值、类型化枚举、条件字段、错误关联与聚焦、数组边界、Lite 可信 Schema 解码、类型契约 |
| `src/components/spreadsheet-safety.test.svelte.ts` | 122/122，退出码 0 | 有界公式、只读、CSV/剪贴板/工作簿、可选 XLSX、异步结果归属、类型契约 |

三份测试均有 `svelte2tsx/index.js.map` 缺失警告，未导致失败；没有通过屏蔽
异常或修改断言使测试通过。组件、辅助代码和上述测试本次未改动。

源码核对发现并校正：

- 历史计划的“待实施”不能直接当作当前缺口；原始需求保留，不自动关闭。
- `JsonSchemaForm` 不再是标量表单，已有对象、数组及受限条件字段。
- FilterBuilder 保留未变化的只读宿主条件，不把它们当作新建无效条件。
- SPA 保留顶层 `logicalOperator`，Lite 不提供，迁移文档必须分别说明。
- SpreadsheetView 默认预算以当前组件的 `defaultLimits` 为准，不沿用旧辅助解析器预算。

## 当前浏览器证据

- `bun run --cwd packages/ui build`：退出码 0；保留库打包的 `import.meta.env`
  可移植性提示，没有把它解释为运行时错误，也没有屏蔽提示。
- `bun run vite build --config scripts/fixtures/enterprise-ui/vite.config.ts`：退出码 0。
- `node node_modules/@playwright/test/cli.js test --config output/playwright/enterprise-foundation-20261021/playwright.config.ts`：
  10/10，退出码 0。配置复用仓库的企业测试，仅指定本机 Chromium、报告路径
  和新启动的 preview 服务，不复用旧服务。
- 浏览器覆盖提交与显式重试、嵌套筛选、错误阻断、公式更新、CSV、只读与非法
  Schema；公式场景确认 CSP 不含 `unsafe-eval` 且无页面 JavaScript 异常。
- 3 个视口（1440x900、1920x1080、390x844），亮暗主题各捕获 ready/invalid，
  共 12 张截图。人工检查了 1440 浅色 invalid 与 390 深色 ready 两张。
  这不是对其余截图、完整无障碍或所有控件几何边界的认证。

报告：`output/playwright/enterprise-foundation-20261021/report.json`。
截图：`output/playwright/enterprise-foundation-20261021/screenshots/`。
原始 fixture 构建产物归档在同目录的 `dist/`，以免混入待提交源码。

## 尚未证明

- 三个组件没有完成读屏、跨浏览器、性能或全部状态的当前验收。
- 没有重跑完整应用构建、包消费者、SSR 专项、全仓测试和真实 Provider 联调。
- 批次二至四的所有原始能力仍需逐项核对，不能因当前组件存在或本次测试通过而关闭。
- 本线程的 InfiniteList 当前浏览器恢复证据见 `../infinite-list-recovery/README.md`，
  与本页的三组件 fixture 分开计数，不能推导所有业务页面通过。
- 设计文件、真实权限与持久化、合并、发布和生产部署不属于本次已完成结论。

后续按 `docs/ENTERPRISE_PRODUCT_SYSTEM.md` 和 `docs/ui-state-matrix.md` 的要求，
逐项记录当前实现、聚焦测试、浏览器交互及未完成项；不得用全绿计数替代覆盖检查。
