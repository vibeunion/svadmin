# Lite、脚手架与验证 Fixture PM 审计

日期：2026-09-21
工作区：`/private/tmp/svadmin-tailwind-openui`

## 1. 范围与证据等级

- 按 `pm-spec` 核对入口、JTBD、动作、空状态、等待与错误恢复；本轮为只读源码审计。
- 覆盖 `packages/lite/example`、`packages/create-svadmin/template`、`packages/surface/fixtures/native-styles`、`scripts/fixtures/enterprise-ui`、`scripts/fixtures/svar-grid`、`scripts/surface-workflows`。
- 未启动应用、未执行浏览器巡检、未运行任何测试或全仓检查。下文“存在测试”仅表示读到测试定义，不表示执行通过。
- 后续补充（主代理运行证据，非作者独立复现）：Lite dev 巡检 211 条路由全部 HTTP 500；生产 build 成功，`localhost:5181` 的 preview 巡检 211 条路由全部 HTTP 200、0 pageerror。该次巡检仅报告 `/lite` 手机端 document 横向溢出，定位 Recent Sales Orders 表格。dev P1 与 preview 移动端 P2 分开保留，详见第 5 节。
- 本轮唯一写入为本报告。工作树已有修改及并行 agent 改动不属于本轮审计成果；此前 lint 工作未完成，不作为验收证据。
- 不审计主 `example` 全部自定义页面；仅追溯 Lite 引用的资源清单。主代理负责浏览器巡检。
- 不把 Lite 的无 JS 模式判为缺少 skeleton。`packages/lite/example/src/routes/lite/+layout.ts:1-2` 明确 `ssr=true, csr=false`，应验收原生 GET/POST、服务端反馈、数据保留、返回路径。

本文代码路径均相对上述工作区；行号为读取时快照，工作区并行修改后需复核。

## 2. Lite 实际入口及模板覆盖

### 2.1 页面与端点清单

| 模板/入口 | JTBD 与动作 | 状态与返回路径 |
|---|---|---|
| `/lite`，`src/routes/lite/+page.svelte` | 运营摘要、近期订单、领域导航、posts 搜索/分页/删除 | action 成功/错误提示已接入，38-42 行；近期订单没有空态分支；顶部进入 compatibility，KPI 进入 parity |
| `/lite/[resource]`，`[resource]/+page.svelte` | 搜索、筛选、排序、分页、创建、查看、编辑、删除与批量删除 | 使用 LiteListPage；原生 GET/POST；空列表有 No records found；页面未消费 action 结果 |
| `/lite/[resource]/create` | 填写并创建记录 | 字段 errors、values 已传入；成功 303 返回列表；取消/面包屑回列表；顶层 error 未显示 |
| `/lite/[resource]/edit/[id]` | 修改已有记录 | errors 已传入；成功 303 去详情；失败 values 未传入；取消/列表/详情路径存在 |
| `/lite/[resource]/show/[id]` | 阅读记录并决定编辑或删除 | LiteShowPage 展示字段；有列表/编辑；删除按钮 POST 到资源列表 action，再回列表 |
| `/lite/parity` | 开发者检查组件映射与 SSR 展示 | 只读矩阵和控件展示，不是业务 CRUD 页；清单来自 `packages/lite/parity.json` |
| `/lite/compatibility` | 开发者体验能力降级方式 | 原生 compute/move/upload POST；返回仪表盘；静态表格、下载、刷新链接 |
| `/lite/compatibility/flow.json` | 下载流程静态结构 | GET JSON；`flow.json/+server.ts:3-14` |
| `/lite/compatibility/result.json` | 下载合成计算结果 | GET JSON；`result.json/+server.ts:3-5` |
| `/lite/+layout` | 在各业务域之间导航 | LiteLayout 接收 resources、手写 menu、currentResource；不是独立路由 |

未发现本子应用的 `/` 页面、独立登录页面或自定义 `+error.svelte`；不能把 `/` 当作 Lite 仪表盘。未知资源由对应 loader 返回 404；已有资源的 provider 读取异常没有本地页面级恢复分支，最终框架错误页效果待浏览器验证。

### 2.2 动态 CRUD 覆盖资源清单

权威来源：

- `packages/lite/example/src/lib/admin.ts:10-43`：自建 posts + `createResources('en')` 中 fields 非空的资源，剔除重复 posts，并移除 contract。
- `example/src/resources.ts:19-1487`：resourceDefinitions；`1869-1883`：本地化映射。
- `packages/lite/example/src/lib/admin.ts:45-47`：动态路由按 name 查找，而不是按菜单查找。

下列每个资源均套用上述 list/create/edit/show 四种路由形状；实际记录 ID、操作是否成功和服务端数据覆盖不在静态审计中保证：

| 分类 | 资源 |
|---|---|
| SSR 验证 | `posts` |
| 库存基础 | `products`, `skus`, `categories`, `suppliers`, `warehouses` |
| 运营 | `stock_movements`, `purchase_orders`, `sales_orders`, `todos`, `stock_transfers`, `cycle_counts`, `inventory_adjustments`, `reorder_rules` |
| 人员组织 | `users`, `roles`, `permissions`, `user_accounts`, `user_logs`, `user_settings` |
| 日程与智能 | `calendar_events`, `ai_conversations`, `ai_prompt` |
| 通知与邮件 | `notifications`, `mail_inbox`, `mail_draft`, `mail_sent`, `mail_archive`, `mail_snoozed`, `mail_spam`, `mail_trash` |
| CRM | `crm_accounts`, `crm_contacts`, `crm_deals`, `crm_activities` |
| 房产 | `properties`, `property_agents`, `property_leads`, `property_showings` |
| 门店与项目 | `store_client_products`, `store_client_orders`, `project_planning`, `store_admin`, `store_services`, `invoice_generator` |
| 账单 | `billing_plans`, `billing_invoices`, `billing_subscriptions` |
| 安全与邀请 | `security_sessions`, `security_devices`, `security_allowed_ips`, `referral_invites` |

`design_principles` 与 `case_workspace` 在源清单 fields 为空，被 Lite 过滤；不属于 Lite 可达资源。主 SPA 的专门邮件、AI、看板等界面不会因复用资源而自动进入 Lite，本处是通用原生 CRUD。

手写菜单另见 `admin.ts:49-175`：`mail_snoozed/mail_spam/mail_trash` 有资源路由但未列在手写菜单中，主代理应检查是否有其他导航入口；`todos` 同时出现在 Operations 与 Planning。不是“菜单数量等于覆盖资源数量”。

已有检查脚本 `packages/lite/example/scripts/verify-ssr.ts` 遍历 resources，检查 list、允许创建的 create、有首条记录且允许的 show/edit，另查 compatibility/parity 和两个 JSON 端点。它验证 GET HTML 无脚本/特定标记，不执行失败 POST、取消返回或数据保留，本轮没有运行。

## 3. create-svadmin/template

### 3.1 可达性与资源

真实链路：`index.html` → `src/main.ts:2-6` → `src/App.svelte:1-12` → AdminApp。默认使用 Simple REST 的 JSONPlaceholder API 与 mockAuthProvider。

| 模板 | 可达性/覆盖 |
|---|---|
| `src/App.svelte` | 默认真实入口；传入资源、鉴权、标题、locale，没有传 dashboard/loginPage snippet |
| AdminApp 默认首页/登录 | 使用组件内置视图；证据 `packages/ui/src/components/AdminApp.svelte:528-531,606-612` |
| `src/resources.ts` 通用资源页 | `posts`, `users`, `comments`, `todos`；hash 路由形状 `#/资源`、`#/资源/create`、`#/资源/edit/:id`、`#/资源/show/:id`，由 AdminApp 路由层承接，需浏览器确认实际权限及动作可用性 |
| `src/pages/Dashboard.svelte` | 未被默认 App 导入或作为 snippet 传入；引用 posts/users/comments 总数及 recent posts/users；不可计为当前首页已验收 |
| `src/pages/Login.svelte` | 同样未接入默认入口；存在 email/password、loading、错误文案分支；不能把它的行为等同于默认 LoginPage |
| `src/providers/supabase.ts` | 未被默认 App 接入；缺环境变量检测不是默认入口的配置错误页 |

资源动作差异：`users` 明确 `canCreate:false, canDelete:false`（resources.ts:26-27），其他资源未显式禁用；posts/todos 的 title 必填。这是演示鉴权与演示数据源，不代表生产身份、安全授权或持久化写入已验收。

三态责任：可达 CRUD 由 AdminApp 及通用组件承担，本轮没有展开全库组件审计或运行页面，不能宣称全部三态通过。未接入 Dashboard 源码中已有加载、错误重试、空态；Login 有 pending 标记，但异常抛出恢复存在下述潜在问题。

## 4. 验证 Fixture 分类

| 目录/入口 | 覆盖数据与操作 | 验证用途与状态边界 |
|---|---|---|
| `packages/surface/fixtures/native-styles/index.html` → main.ts → App.svelte | 合成 `products` 指标/库存表；tone、density、暗色主题、按钮/input/file 控件；`?dark=1`、`?variants=0` | 样式兼容验证，不是用户 example。App.svelte:10-18,36-54 显式展示 ready/loading/empty/error；无真实查询/保存任务。main.ts 请求 `/__ui.css`，由 `scripts/check-ui-browser.mjs:29-34` 服务，不宜直接普通静态打开就认定可运行 |
| `scripts/fixtures/enterprise-ui/index.html` → main.ts → App.svelte | amount/enabled/plan JSON Schema 表单；title/amount/plan 递归筛选；Operations sheet | 合同验证，不是业务应用。故障注入、readonly、unsupported schema/restore、CSV 输出；App.svelte:30-53。browser.spec.ts 定义校验失败、重试、分组、公式错误、CSP、多尺寸截图；本轮未运行 |
| `scripts/fixtures/svar-grid/index.html` → App.svelte | `products`；20,000 行本地数据、tree、resource；theme/tenant/access/scope | 引擎集成 fixture；手动 loading/empty/error/disabled/restore。resource 模式请求 `/api/rows`，测试侧拦截提供数据，并非独立业务后端 |
| `scripts/fixtures/svar-grid/advanced.html` → Advanced.svelte | `products`；operations/tree-operations/window/infinite/lazy/pinned/resource-window/resource-infinite/resource-lazy/native-cells | 行编辑、批量操作、授权变化、scope、窗口/懒加载；`Advanced.svelte:85-105` 为模式清单；故障与延迟由 specs 的 mock backend 注入 |
| `scripts/fixtures/svar-grid/auto-table.html` → AutoTableConsumer.svelte | `inventory`（Compatible inventory），canCreate=false；宿主 header/row/batch action、controlled state | AutoTable 兼容 fixture；mismatch 边界和 Recover rendering、Host empty state；不是另一个完整业务资源管理系统 |
| `scripts/fixtures/svar-grid/surface.html` → Surface.svelte | `products`，valid/secret/mutation/deny-id 模式、标题更新 | Surface 策略验证，不是用户生成页面服务；数据拒绝/策略边界由 surface.spec.ts 验证 |
| `scripts/surface-workflows/index.html` → App.svelte | `contacts`；`contacts.create`；records/count/table/primary+secondary form | 合成工作流 E2E fixture。流式预览→完成→接受→提案→确认→执行；切换 tenant 清空；不是真实模型生成应用 |

SVAR 四个 HTML 入口由 `scripts/fixtures/svar-grid/vite.config.ts` 显式注册。清单证据还包括 `grid.spec.ts`、`advanced.spec.ts`、`resource-loading.spec.ts`、`native-cells.spec.ts`、`typed-rendering.spec.ts`、`surface.spec.ts`、`auto-table.spec.ts`、`auto-table-boundaries.spec.ts`；存在源码不代表验证通过。

Surface workflows：

- `fixture.ts:2-15` 定义 contacts.create、只读 contacts policy、两个确定性字符串片段。
- `App.svelte:15-47,60-69` 定义等待/禁用/错误提示和接受动作；`workflow.e2e.ts:7-42` 定义执行与截图检查。
- `vite.config.ts:12-14,31-53` 要求真实可选 OpenUI parser 路径；临时 SQLite、合成身份、本地 `/__workflow`，不属于生产认证。
- `generation-cases.json` 的 `contact-count/contact-form/contact-workspace` 是模型输出评估用例，不是浏览器路由。`evaluate-generations.mjs/openui-conformance.mjs/packed-consumer.mjs` 为评估/兼容/打包消费脚本，不应统计为用户页面。

### 4.1 补充 Example/Demo 命名文件分类

本轮仅检查入口与引用关系，没有运行以下组件，也没有扩大上游 vendor 功能审计。

| 文件 | 独立应用入口 | 主 example 挂载情况 | 归类与证据 |
|---|---|---|---|
| `packages/ai-elements/src/components/schema-display/SchemaDisplayExample.svelte` | 无；文件只是接收 value/children 的 `<pre>` 组件 | `example/src` 未检索到 SchemaDisplay 系列直接引用；库导出不等于页面挂载 | 库的“示例数据展示”子组件，而非示例应用。文件 1-3 行为 props、格式化和 pre；同目录 `index.ts:13` 导出 Example/SchemaDisplayExample，包 `src/index.ts:405` 再导出 |
| `packages/surface/evidence/Demo.svelte` | 有独立 evidence HTML/harness：`evidence/index.html:3` → `/main.ts` → `evidence/main.ts:2,7` 挂载 Demo | 未发现主 `example/src` 引用此 Demo 或 evidence 入口 | 独立浏览器取证 fixture，不是用户 example。`packages/surface/scripts/browser-evidence.mjs:15-18` 以 evidence 为 Vite root，固定本地端口 5187；合成 orders 资源、SurfaceEditPreview、流式/无效提案、query/apply 计数；无模型调用或业务写入 |
| `packages/ai-elements/vendor/streamdown/site/home/HomeDemo.svelte` | vendor 快照中未找到独立 index.html/main/Vite 配置/package.json 应用入口；HomeDemo 本身不是入口 | 主 `example/src` 未发现 HomeDemo/HomePage 或 streamdown/site 的引用 | 上游文档站首页嵌入组件。`site/home/HomePage.svelte:6,128` 导入并渲染 HomeDemo；这只能证明 vendor 内父组件关系，不能证明本站挂载或上游站点可运行 |

路径说明：工作区不存在根目录 `vendor/streamdown`；实际文件在 `packages/ai-elements/vendor/streamdown`。本次分类不把整个 vendor 文档站加入 PM/浏览器覆盖分母，也不因文件名包含 Example/Demo 就新增业务路由。以上“未发现引用”为当前源码检索结论，不是运行时全路径覆盖证明。

## 5. 有证据的问题

### P1：Lite 开发启动阻断，dev 巡检 211 条路由均 500

**运行证据来源：主代理于 2026-09-21 反馈。** 在 Lite example 工作目录启动 dev，绑定 `127.0.0.1:5180`，巡检 211 条路由全部返回 HTTP 500；服务日志报 `ERR_UNKNOWN_FILE_EXTENSION`，目标为 `@tanstack/svelte-query/dist/HydrationBoundary.svelte`。本轮未重新启动服务、未读取该轮原始日志文件，211 为主代理巡检样本数，不作为独立推导出的全部路由数量。进程能够监听不等于页面启动成功。

**本轮只读配置核对：**

- `packages/lite/example/vite.config.ts:16-25` 只有 server、SvelteKit 插件和 CSS bundle 后处理插件；没有显式 SSR `noExternal` 配置。默认端口为 5174，主代理启动参数覆盖为 5180。
- `packages/lite/example/svelte.config.js:1-3` 为空配置；package.json 的 dev 为 `vite dev`。
- `packages/lite/example/src/routes/lite/+layout.server.ts:1` 共享导入 `$lib/admin`；`src/lib/admin.ts:6-8` 导入主 example 的 provider/resources。这解释了为何应优先检查公共 SSR 模块加载，而不是把 211 次失败当作 211 个独立页面缺陷。
- 本地 `node_modules/@tanstack/svelte-query/dist/index.js:20` 直接再导出 `./HydrationBoundary.svelte`。仓库内 `scripts/fixtures/svar-grid/vite.config.ts:9` 和 `packages/ui/vitest.config.ts:15-16` 已对 `@tanstack/svelte-query` 显式配置 `ssr.noExternal`；它们是本地对照，不是本例修复已验证的证据。

**原因判断（高可信候选，非完整调用链定案）：** 报错与 SSR 依赖进入原生模块加载器、未获得 Svelte 编译处理相符；Lite dev 缺少显式依赖处理配置，是应首先验证的配置差异。`csr=false` 关闭客户端渲染，并不意味着服务端可以跳过 Svelte 组件处理。

**导入链限定：** 主代理将异常追溯到 admin/example resources 等 SSR 链。本轮发现当前 `example/src/resource-contracts.ts:1` 已使用 `@svadmin/core/resource-contract` 子路径，admin、resources、provider 中若干 core 引用是 `import type`。因此不能仅凭这些引用断言它们必然在运行时引入 svelte-query，也不能武断归责某个资源文件。应结合失败时完整栈、当时源码快照及解析后的依赖图确认具体进入边；并行改动可能导致快照不同。

**影响与验收状态：** 开发模式的页面级 PM/原生表单验收当前被公共加载错误阻断。以上模板状态分析仍是静态结论，不能表述为 dev 页面已通过。

**生产产物验证已补充：** 主代理报告生产 build 成功，`localhost:5181` preview 的 211 条路由全部 HTTP 200、0 pageerror。因此这次样本未复现 dev 的全路由加载失败，当前状态为“dev 阻断、生产构建及 preview 路由加载通过”。这不等于根因已修复，dev P1 仍保留；也不能由 HTTP 200/0 pageerror 推导失败 POST、表单保值、真实业务写入全部通过。本报告作者未重跑、未收到原始日志/截图路径。

### P2：preview `/lite` 手机端 Recent Sales Orders 表格撑宽 document

- **运行证据：** 主代理完成上述 211 路由 preview 巡检，仅报告 `/lite` 手机端存在 document 横向溢出，定位 Recent Sales Orders 表格。未提供具体手机 viewport 或像素差，本报告不补造数值。
- **源码支持：** `packages/lite/example/src/routes/lite/+page.svelte:107-146` 将含订单号、客户、日期、金额、状态、动作六列的 table 直接放入 lite-card，缺少独立的 `lite-table-scroll` 包裹；同页 posts 表格在 `193-204` 行已有滚动容器。这与表格将宽度传递至页面的现象相符，最终样式原因仍以浏览器 computed styles 为准。
- **影响：** 小屏阅读摘要及行操作需移动整个页面；属于实际观察到的响应式缺陷，不是 SSR skeleton 缺失。
- **验收建议：** 在主代理原巡检手机视口下 document 宽度不超过 viewport；表格必要时仅在自身容器内横向滚动，订单内容与 Show/Edit 操作均可达。此次仅更新报告，不修布局。

### P1：Lite CRUD 的操作失败反馈丢失

- 列表页 `packages/lite/example/src/routes/lite/[resource]/+page.svelte:5-8` 只读取 data，没有 form；删除/批删返回的 error/success 因而无法展示。
- 创建页 `[resource]/create/+page.svelte:9-12` 只传 errors/values；编辑页 `[resource]/edit/[id]/+page.svelte:9-13` 只传 errors，均未呈现顶层 `form.error`。
- 返回结构证据：`packages/lite/src/server-adapter.ts:324-326,349-351,370,392` 明确返回 Create/Update/Delete/Batch delete failed，且 provider 异常不一定带字段 errors。
- 用户影响：原生 POST 失败后回到外观正常的页面，无法判断失败原因及是否应重试；详情/编辑中的删除最终也走列表 action（LiteDeleteButton.svelte:52-55）。
- 建议验收：保留字段提示，同时在页面显示操作级错误及可执行返回/重试路径；不引入 JS 依赖。

### P1：Lite 编辑失败丢失输入

- 编辑路由只使用 `record={data.record}`，不使用 `form.values`，见 `[resource]/edit/[id]/+page.svelte:10-12`。
- `packages/lite/src/components/pages/LiteEditPage.svelte:54-63` 使用 `values={record}`；server-adapter.ts:349-351,744-747 实际已返回安全的提交值。
- 用户影响：验证或服务端保存失败后看到旧记录，刚输入的修改消失；字段错误可能与屏幕上回退后的值不一致。
- 只读建议：页面合并安全提交值时保留主键和敏感字段策略，不直接全量复制 request。

### P2：Lite 仪表盘把前 10 条订单金额标为总收入

- `packages/lite/example/src/routes/lite/+page.server.ts:17,22-24` 只请求第一页 10 条 sales_orders 并求和。
- `+page.svelte:50-51` 将该值显示为 Total Revenue；订单总数则来自全量 total。
- 影响：订单超过 10 条时，收入 KPI 与“总量”的语义不符。应明确样本口径或使用聚合查询。
- 同页 `+page.svelte:18-23,98-100` 的收入分布和 `<5ms` 延迟是固定值，不应当作运行时证据；近期订单 `128-145` 无空态分支。

### P2：脚手架附带模板与真实入口不一致

- `packages/create-svadmin/template/src/App.svelte:1-12` 未挂载 pages/Dashboard 与 pages/Login，默认实际展示 AdminApp 内置页面。
- 影响：开发者修改这两份模板会期待界面变化，但默认入口不消费；其中三态完善也不能证明首屏已覆盖。
- 决策建议：明确为可选示例并给出接入方式，或后续接入；本轮不自行选产品方向。

### P2：未接入 Dashboard 的空态 CTA 与资源能力冲突

- `template/src/pages/Dashboard.svelte:83-85` 空用户列表提供 `#/users/create`。
- `template/src/resources.ts:26` 禁止创建 users。
- 属于模板接入后的潜在缺陷，不是已运行首页回归；可改为允许的查看/刷新路径或按能力展示。

### P2：未接入 Login 模板对抛出式失败缺少恢复

- `template/src/pages/Login.svelte:15-24` 在 await auth.login 前设 loading=true，没有 try/catch/finally。
- 若 provider 抛错，loading 不会复位，页面 error 也不会更新；现有 mock 使用 localStorage 写入（providers/mockAuth.ts:26），也可能抛错。
- 同样为未接入文件的潜在问题，不能混为默认 LoginPage 缺陷。

### 演示边界提示：compatibility 操作是占位实现

`packages/lite/example/src/routes/lite/compatibility/+page.server.ts:3-11` 的 compute/move 仅返回 success，upload 只统计文件；页面 `+page.svelte:82-89` 的排序数据固定。可证明原生 POST 可表达动作，不能证明完成实际排序/计算/持久化。巡检时应按降级合同展示记录，不判成真实业务闭环已完成。

## 6. Gherkin 验收建议

```gherkin
Feature: Lite 原生表单与模板可达性

Scenario: 禁用 JavaScript 后资源查找与返回可用
  Given 浏览器禁用 JavaScript 并打开 /lite/posts
  When 使用原生 GET 搜索后进入创建页并取消
  Then 搜索返回服务端 HTML 且页面不需要 hydration
  And 取消返回 posts 列表且仍可继续搜索或创建

Scenario: 删除失败必须反馈真实结果
  Given /lite/posts 有记录且删除 provider 被注入确定性失败
  When 用户确认原生删除 POST
  Then 页面显示删除失败提示且记录仍存在
  And 不显示成功提示并提供重试或返回列表路径

Scenario: 编辑失败保留安全输入
  Given 用户修改 posts 标题且更新 provider 被注入确定性失败
  When 用户提交原生编辑表单
  Then 页面保留修改后的标题并显示操作级错误
  And 重试成功后跳转到该记录详情

Scenario: 收入 KPI 具有明确完整口径
  Given sales_orders 有 11 条已知金额记录
  When 用户访问 /lite
  Then 标为总收入的指标等于全部 11 条的总和
  And 若只汇总第一页则标签明确写出当前样本口径

Scenario: 脚手架真实入口与资源能力一致
  Given 新生成应用的默认入口和 users.canCreate=false
  When 用户访问首页并遇到空用户数据
  Then 只检查真实挂载的首页而不是未接入模板
  And 页面不提供创建用户入口
```

## 7. 交给主代理的浏览器巡检边界

1. Lite：从 `/lite` 开始，按资源清单遍历 list/create，以及存在记录的 show/edit；重点执行失败 POST、编辑保值、删除确认取消、无 JS 返回路径、未知资源/记录错误。不可用现有 GET-only SSR 脚本替代操作验收。
2. 脚手架：确认默认内置首页/登录实际可达；四个资源验证等待、空、错误、返回；不要把未挂载的 Dashboard/Login 截图算作默认模板。
3. Fixtures：分别使用各自 harness。SVAR 的 resource 模式需要 mock backend；native-styles 需要 `/__ui.css` 服务；Surface workflow 需要 parser 与临时服务。不能把未配置 harness 导致的失败直接归因于业务组件。
4. 主代理已报告 Lite 生产 build 与 preview 211 路由加载通过（200、0 pageerror），以及 `/lite` 手机横溢出；dev 全路由 500 仍未关闭。本报告未附原始截图/日志，其他静态问题与失败动作验收不因路由加载通过而自动关闭。新增三份 Example/Demo 只完成入口分类，未运行。
