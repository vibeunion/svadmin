# Lite 与脚手架实施闭环及证据

日期：2026-09-21（Asia/Shanghai）
工作区：`/private/tmp/svadmin-tailwind-openui`
编排：managed，本任务为 `packages/lite/example/` 与 `packages/create-svadmin/template/` 唯一 writer；保留其他改动，无提交、发布或部署。

## 证据来源与边界

实施及验证已完成，本次仅转存既有结果，没有重跑全量测试或 211 路由巡检。

- 原始截图位于 `/tmp/lite-template-evidence/5182-mobile.png`、`/tmp/lite-template-evidence/5183-mobile.png`，现已逐字节复制到下述证据目录。
- 211 路由巡检当时只向会话 stdout 输出两条 JSON，**没有当时落盘的结果 JSON，也没有逐路由明细文件**。本次从原始会话记录解析这两条 JSON，值保持不变。
- 原始会话文件：`/Users/zhd/.codex/sessions/2026/09/21/rollout-2026-09-21T10-44-38-01a0c1d9-e8bc-7b93-9766-ddb15c421c4e.jsonl`。浏览器巡检命令位于原文件第 517 行，返回输出位于第 545 行，输出记录时间为 `2026-09-21T05:51:32.068Z`（北京时间 13:51:32）。
- 未复制完整会话。仅抽取与本次验证相关的工具调用及输出，保留 sourceLine、timestamp、call_id，可在证据目录离线追溯。
- 部分原始 build 输出已被工具截断；转存日志保留 `Warning: truncated output`，不冒充完整构建日志。原记录仍包含退出码和构建成功结尾。
- 本证据对应当时脏工作区快照，不对应某个已提交 SHA；不能证明随后其他 agent 修改后的全树状态。
- 路由巡检的 `scripts:0`、viewport 数值取自每轮末尾 `/lite` 首页，不是逐页面脚本/宽度报告。
- 模板外部 JSONPlaceholder API 使用 Playwright 拦截的空数据。验证了 UI 链路，不代表真实外部 API、生产鉴权或持久化后端验收。

## 证据目录

绝对路径：`/private/tmp/svadmin-tailwind-openui/output/playwright/lite-remediation-20260921/`

该目录被现有 Git ignore 规则忽略，文件已实际落盘，但不会自动进入提交。交接或发布评审时需单独归档；本轮未更改 ignore 规则。

| 文件 | 内容与结果 |
|---|---|
| [dev-results.json](../../../output/playwright/lite-remediation-20260921/dev-results.json) | 5182 dev：211 路由，failures=[]，pageErrors=[]，首页 viewport/document=390/390，scripts=0 |
| [preview-results.json](../../../output/playwright/lite-remediation-20260921/preview-results.json) | 5183 preview：同上 |
| [routes-browser.log](../../../output/playwright/lite-remediation-20260921/routes-browser.log) | 原工具返回，包含上述两条未经改写的 stdout JSON、退出码 0 |
| [5182-mobile.png](../../../output/playwright/lite-remediation-20260921/5182-mobile.png) | dev 首页手机全页截图；截图视口 390×844，PNG 为全页高度 |
| [5183-mobile.png](../../../output/playwright/lite-remediation-20260921/5183-mobile.png) | preview 同视口截图 |
| [dev-before-ssr500.log](../../../output/playwright/lite-remediation-20260921/dev-before-ssr500.log) | 修复前实际复现的 HydrationBoundary.svelte / ERR_UNKNOWN_FILE_EXTENSION / GET /lite 500 |
| [tests-dev.log](../../../output/playwright/lite-remediation-20260921/tests-dev.log) | Lite 5182 + 模板 5184：单文件 6 pass、0 fail、33 expect |
| [tests-preview.log](../../../output/playwright/lite-remediation-20260921/tests-preview.log) | Lite 5183 + 模板 5185：单文件 6 pass、0 fail、33 expect |
| [lite-check.log](../../../output/playwright/lite-remediation-20260921/lite-check.log) | Lite check 退出 0；Svelte 0 errors、0 warnings |
| [template-check.log](../../../output/playwright/lite-remediation-20260921/template-check.log) | 模板独立 Svelte 检查退出 0；0 errors、0 warnings |
| [lite-build.log](../../../output/playwright/lite-remediation-20260921/lite-build.log) | Lite build 退出 0；有 No adapter specified 提示，不宣称部署产物验收 |
| [template-build.log](../../../output/playwright/lite-remediation-20260921/template-build.log) | 模板 Vite build 退出 0 |
| [eslint.log](../../../output/playwright/lite-remediation-20260921/eslint.log) | 目标 ESLint 命令正常退出；原始输出为空 |
| [final-eslint-diff.log](../../../output/playwright/lite-remediation-20260921/final-eslint-diff.log) | 最终限定文件 ESLint、diff 检查及状态输出 |
| [commands.log](../../../output/playwright/lite-remediation-20260921/commands.log) | 上述结果对应的实际命令全文、cwd、工具参数、源记录行号和时间；包括 211 路由内联脚本 |
| [session-excerpts.jsonl](../../../output/playwright/lite-remediation-20260921/session-excerpts.jsonl) | 原始工具记录及关联的启动/轮询记录，不是人工编写的测试输出 |
| [manifest.json](../../../output/playwright/lite-remediation-20260921/manifest.json) | 来源、局限、日志/截图 SHA-256、截图原始路径与 mtime |

211 路由脚本从 `src/lib/admin` 的 resources 枚举：先访问 `/lite`、`/lite/parity`、`/lite/compatibility`，再访问每资源列表、允许创建的 create，以及存在首条记录且允许的 show/edit。不是所有可能的记录 ID，也不是所有 POST 状态。源码算法全文已随 `commands.log` 保存，没有事后补造逐路由状态。

## 逐项闭环

| 缺陷/范围 | 实施 | 验证与状态 |
|---|---|---|
| dev SSR 500 | `packages/lite/example/vite.config.ts` 配置既有 `@tanstack/svelte-query` 的 SSR noExternal，不新增依赖 | 修复前日志 + 修复后 dev/preview 各 211 全 200；已闭环 |
| 创建/更新/删除/批删失败反馈丢失 | `[resource]/+page.svelte`、create/edit 页面显示 action error；列表同时显示成功结果 | 单文件覆盖创建校验失败、更新 provider 失败、删除失败、未选批删；已闭环 |
| 编辑失败丢失输入 | edit 页面合并服务器返回的安全 values，并保持原记录主键 | 浏览器失败 POST 后草稿及主键保留、取消返回列表；已闭环 |
| 手机订单表格撑宽 document | `/lite/+page.svelte` 给表格独立滚动容器，补订单空态 | 375/390/1440 宽度回归；390px 全页截图及 document=390；已闭环 |
| 总收入口径/固定指标误导 | 服务端按 orderDate 降序取最新最多 10 条；KPI 明确样本数量、样本金额；图表来自真实样本；移除固定趋势/延迟 | 标签与无虚假总收入/延迟的浏览器断言；属于明确样本口径，不是全库收入聚合 |
| 邮件资源无菜单入口 | `src/lib/admin.ts` 增加 snoozed/spam/trash 菜单 | 对应路由包含在 211 路由访问中；未单独录制每个菜单点击 |
| compatibility 成功文案夸大 | compatibility 页明确只是演示请求、未持久化文件/排序/结果 | 文案差异检查；保留 fixture 性质，没有实现真实业务服务 |
| 模板 Dashboard/Login 未挂载 | `template/src/App.svelte` 接入两模板；等待异步 DataProvider 并处理初始化加载/错误重试 | 实际登录进入 Recent Posts 首页；单文件回归通过 |
| users 创建 CTA 与能力冲突 | Dashboard 空态改为 View users | 禁止存在 `#/users/create` 链接的浏览器断言通过 |
| 登录抛错后无法恢复 | Login 使用树内 useLogin，防重复提交，try/finally 复位、显示 alert | 注入一次 Storage.setItem 异常，错误可见、按钮恢复、再次登录成功 |
| 模板检查配置无法独立使用 | template tsconfig 自包含；mockAuth identity name 提供确定 fallback | 模板独立 Svelte 检查及 build 通过 |

未修改源码分类项或 vendor。验证过程没有运行全仓套件。真实外部 API/生产部署不在本轮验收范围。

## 改动文件清单

共 13 个已有文件修改及 1 个新增测试文件：

```text
packages/lite/example/vite.config.ts
packages/lite/example/src/lib/admin.ts
packages/lite/example/src/routes/lite/+page.server.ts
packages/lite/example/src/routes/lite/+page.svelte
packages/lite/example/src/routes/lite/[resource]/+page.svelte
packages/lite/example/src/routes/lite/[resource]/create/+page.svelte
packages/lite/example/src/routes/lite/[resource]/edit/[id]/+page.svelte
packages/lite/example/src/routes/lite/compatibility/+page.svelte
packages/lite/example/test/pm-regressions.spec.integration.ts
packages/create-svadmin/template/src/App.svelte
packages/create-svadmin/template/src/pages/Dashboard.svelte
packages/create-svadmin/template/src/pages/Login.svelte
packages/create-svadmin/template/src/providers/mockAuth.ts
packages/create-svadmin/template/tsconfig.json
```

## 测试源码与复跑方法

源码存在：[pm-regressions.spec.integration.ts](../../../packages/lite/example/test/pm-regressions.spec.integration.ts)。它使用 Bun test 与已安装的 Playwright Chromium，包含 1 项模板链路测试和 5 项 Lite 原生 SSR 回归。Lite browser context 明确 `javaScriptEnabled:false`；模板测试使用独立 context。

下面均从工作区根目录执行。先确保已有依赖与 Playwright Chromium 可用；本轮没有重新安装依赖。每个服务使用独立终端，`--strictPort` 防止静默换端口。

### 开发模式

终端 A：

```sh
bun run --cwd packages/lite/example dev --host 127.0.0.1 --port 5182 --strictPort
```

终端 B：

```sh
bunx vite packages/create-svadmin/template --config packages/create-svadmin/template/vite.config.ts --host 127.0.0.1 --port 5184 --strictPort
```

测试终端：

```sh
LITE_TEST_URL=http://127.0.0.1:5182 TEMPLATE_TEST_URL=http://127.0.0.1:5184 bun test ./packages/lite/example/test/pm-regressions.spec.integration.ts
```

路径前的 `./` 需要保留；该文件名包含 `.spec.integration.ts`，此前不带 `./` 时 Bun 将其当作筛选模式，未找到测试。测试不会自动启动服务；两个服务都必须存在。

### 生产 preview

先分别构建：

```sh
bun run --cwd packages/lite/example build
bunx vite build packages/create-svadmin/template --config packages/create-svadmin/template/vite.config.ts
```

终端 A（Lite）：

```sh
cd /private/tmp/svadmin-tailwind-openui/packages/lite/example
bunx vite preview --host 127.0.0.1 --port 5183 --strictPort
```

终端 B（工作区根目录，模板）：

```sh
bunx vite preview packages/create-svadmin/template --config packages/create-svadmin/template/vite.config.ts --host 127.0.0.1 --port 5185 --strictPort
```

测试终端（工作区根目录）：

```sh
LITE_TEST_URL=http://127.0.0.1:5183 TEMPLATE_TEST_URL=http://127.0.0.1:5185 bun test ./packages/lite/example/test/pm-regressions.spec.integration.ts
```

本轮收尾已停止自己启动的 5182–5185 服务，未动旧服务；已删除本轮生成的 `template/dist`，避免将构建产物当作脚手架源模板复制。因此复跑模板 preview 前必须重新构建。测试成功不代表 211 路由被测试文件自动遍历；211 路由是另一次内联浏览器巡检，命令存于 `commands.log`，本次不重跑。

### 定向质量检查

```sh
bun run --cwd packages/lite/example check
bunx svelte-check --workspace packages/create-svadmin/template --tsgo-experimental-api --tsconfig ./tsconfig.json
git diff --check -- packages/lite/example packages/create-svadmin/template
```

目标 ESLint 的完整实际文件列表见 `commands.log` 的 `eslint`、`final-eslint-diff` 段；没有以全仓 lint 或全仓测试替代针对性验证。
