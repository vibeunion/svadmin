# ResourceOperationsPage/AutoTable 真实服务消费者验收证据

- 契约：`docs/evaluations/enterprise-resource-workspace-service-contract-20261026.md`
- 工作树：隔离 `enterprise-storage-acceptance/svadmin`，保留全部 dirty；原工作区与
  共享 `node_modules` 未修改。
- 状态：pi 初版、主线程初版、审查修正版与稳定帧补充均分别记录；主线程已对稳定帧
  补充后的最终代码独立复验 **14/14，exit 0，零 skip/todo**，并完成窄检查与精确
  临时资源清理复核。本契约本地服务流程完成；整体企业级目标仍为 PARTIAL，不代表
  合并、发布或生产验收。

## pi 结果

- 同一 runner：`bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
- 结果：`pass=14 fail=0 skip=0 todo=0`、exit 0，完成标记
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 出现。
- 随机 Compose project：`svadmin-auth-storage-smoke-5baf468e-a941-4d10-a159-a9672c10d4f3`。
- runner 退出后按该精确 project label 查询 OrbStack 容器（含已停止）、network、volume：
  三项命令均 exit 0 且输出为空。
- 旧 13 项测试与断言保留；只在同一测试文件新增第 14 项。新增项内部依次运行
  Chromium、Firefox、WebKit，缺少任一引擎直接失败，3 个引擎仍计为 1 项测试。

## 新增实现

1. `scripts/fixtures/enterprise-runtime/browser/ResourceWorkspaceBrowserFixture.svelte`
   + `resource-workspace.html` + `main-resource-workspace.ts`
   - 唯一页面壳为当前 worktree 的 `AdminApp`；认证控件与真实
     `ResourceOperationsPage` 位于 dashboard 正常文档流，无 fixed 遮挡、无 force click。
   - 使用当前 worktree 的 `ResourceOperationsPage`、`AutoTable`、
     `QuickEditDrawer`、`AutoForm`、`createSupabaseAuthProvider`、
     `createSupabaseDataProvider` 与真实 GoTrue/REST。
   - 列表资源沿用 `enterprise_acceptance.browser_records`，默认 10 行分页；详情为
     内置 Drawer，快速编辑为内置菜单/Drawer/默认 Save，没有 mock provider 或 UI 成功输出。
2. `scripts/fixtures/enterprise-runtime/browser/upload-browser-acceptance.ts`
   - 复用既有 Vite、同源代理、浏览器启停、安全断言与 `browser_records` REST allowlist，
     未放宽到其它资源、host 或方法。
   - 新增 workspace 场景编排：真实搜索、翻到第 2 页、真实 checkbox 选择、详情 GET、
     快速编辑 PATCH 失败/成功、列表刷新与选择保持，以及 B 独立 context 空列表。
   - 捕获真实 REST list/PATCH 响应，仅用于断言，不录制 HAR/trace/video/storageState。
3. `scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
   - 期望测试数改为 14。
   - 仅对本地验收表 `browser_records` 增加 test-only CHECK：
     `title <> 'svadmin-acceptance-invalid-title-sentinel'`，使真实用户 PATCH 触发
     PostgreSQL `23514`。sentinel 不进入旧 13 项数据，不是生产业务规则。
4. `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`
   - 新增第 14 项；service role 只分配可信 `app_metadata.tenant_id`，不替代用户写流程。
   - A 的真实用户会话播种每个引擎 12 行；B 为另一可信租户且无播种。
   - 独立 A/B GoTrue 会话用于失败后读回、成功后读回、B 空列表确认与正常清理。

## 三引擎新增场景断言摘要

- A 真实登录后，`ResourceOperationsPage` 初始列表来自真实 PostgREST；搜索 token 产生
  真实 GET filter（`title=ilike.%<prefix>%`），默认 `limit=10`、`offset=0`。
- 翻到第 2 页后，真实 GET 为 `offset=10&limit=10`，返回 JSON 恰好 2 行且包含目标
  `item 11` 与 `item 12`；同时确认 `content-range` 总数为 12。
- A 使用真实 checkbox 选择 `item 11`；详情按钮触发真实
  `GET /rest/v1/browser_records?...&id=eq.<rowId>`，Drawer 显示真实 title。
- 关闭详情后打开内置 QuickEditDrawer；首次把 title 改为 test-only sentinel 并点击默认
  Save。真实 PATCH 非 2xx，响应体稳定数据库错误码为 `23514`；独立 A 会话读回原 row
  title 未变；Drawer 保持打开、草稿仍为 sentinel、Save 仍可用；页面正文不含约束名、
  `23514` 或 `violates check constraint`。
- 修正 title 后再次 Save，真实 PATCH 为 2xx；独立 A 会话读回更新值；列表刷新后重新
  出现更新 title；搜索输入、第 2 页页码和按 row id 重新定位的真实 checkbox 均保持。
- PATCH 失败/成功次数每个引擎精确为 1/1；A 的页面错误与外部请求计数均为 0。
- B 使用独立浏览器 context 与 B 凭据登录；真实 workspace GET 成功返回空数组且
  `total=0`，页面不显示 A 的 title，B 的 browser_records 写请求计数为 0。
- 页面凭据泄露断言只使用布尔值：邮箱、密码、`access_token`、`bearer `、
  `service_role` 均不出现在页面正文；未写 HAR/trace/video/storageState。
- 新场景额外执行 REST allowlist 负面 probe：未列出的 DELETE、其它 resource
  （`tenant_records`，同一 PostgREST schema）、scheme-relative REST 路径均为 403。
  代理只按 method+path 匹配，不验证 PostgREST schema 请求头；schema 暴露范围由
  PostgREST 自身限制。旧 13 项断言未改。

## pi 本轮窄检查

| 命令 | 结果 |
| --- | --- |
| 同一 runner | `pass=14 fail=0 skip=0 todo=0`，exit 0 |
| `node node_modules/typescript/bin/tsc -p scripts/fixtures/enterprise-runtime/tsconfig.json --pretty false` | exit 0，无诊断 |
| 严格单文件 `tsc --ignoreConfig --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --noPropertyAccessFromIndexSignature --moduleResolution bundler --module esnext --target esnext --skipLibCheck --types bun,node`（helper/test/runner） | exit 0，无诊断 |
| `bunx eslint ...browser/upload-browser-acceptance.ts ...storage-acceptance.test.ts ...storage-acceptance.run.ts --max-warnings 0` | exit 0 |
| `bunx svelte-check --no-tsconfig --workspace scripts/fixtures/enterprise-runtime/browser` | 0 errors / 0 warnings，exit 0 |
| `git diff --check` | exit 0 |

未运行全量测试、`test:standalone`、全仓 typecheck 或全仓 svelte-check；未提交、推送、
发布或部署。未把引擎数乘进测试总数，也未跳过缺失浏览器。

## 截图（仅路径）

- `output/playwright/enterprise-resource-workspace-service/workspace-detail-{chromium,firefox,webkit}.png`
- `output/playwright/enterprise-resource-workspace-service/workspace-quick-edit-failed-{chromium,firefox,webkit}.png`
- `output/playwright/enterprise-resource-workspace-service/workspace-quick-edit-saved-{chromium,firefox,webkit}.png`
- `output/playwright/enterprise-resource-workspace-service/workspace-other-tenant-empty-{chromium,firefox,webkit}.png`

截图为本地 fixture 页面状态，不含邮箱、密码、token、service key 或 signing secret；未录制
HAR/trace/video，未写 storageState。

## 主线程初版独立验收（历史，不替代最终结论）

- 主线程曾对上述 pi 初版独立运行同一 runner：`pass=14 fail=0 skip=0 todo=0`、exit 0；
  项目为 `svadmin-auth-storage-smoke-ed09c528-4f5a-4d68-a449-5c222346fdd0`，退出后按
  精确 label 查询容器（含已停止）、network、volume 均为空；fixture `tsc` 通过。
- 该结果只记录初版历史。随后审查发现列表解析 fail-open、PATCH 采集裁剪、分页顺序依赖
  自然插入顺序、详情仅请求 URL/缓存、负面 probe 文档口径等问题；修正后必须重新验收，
  因此不把初版通过标为本契约完成。

## 审查修正（本轮）

- GET 列表 capture 增加明确 `parseError`；非数组/非法 JSON 不再默认为有效 `[]`，
  `settleListCaptures` 用 `allSettled` 保留错误而不吞掉。所有 A list 断言要求
  `parseError === null`，并最终断言 list capture errors 为空；B 必须收到签入后的
  真实 JSON 数组，精确 `[]`、`total=0`、`parseError=null`。
- PATCH 改为按请求对象关联响应的完整采集：记录 URL、请求 JSON、请求解析错误、
  响应状态/JSON/解析错误、`settled`，并监听 `requestfailed` 收集无响应请求。失败
  checkpoint 断言总数 1，成功 checkpoint 与最终断言总数 2；每次请求断言目标 row id
  与 title 载荷，失败/成功响应关联正确请求，成功响应 JSON 精确一行且 id/title/tenant
  正确。A 的 POST/PUT/DELETE 非预期业务写入计数为 0。
- 资源增加 `defaultSort: { field: 'title', order: 'asc' }`，种子 title 改为补零
  `item 01..12`，更新值保持 `item 11 updated` 以留在第 2 页。测试使用
  `URLSearchParams` 精确断言 `title=ilike.%<search>%`、`limit=10`、`offset=10`、
  `order=title.asc`，不再仅检查整 URL 包含字符串。
- 详情在点击前注册严格 GET response，断言 2xx、真实单行 id/title/tenant；初次关闭详情
  后与保存失败时都重新断言 search、页码 2、按行 id 定位的 checkbox 仍选中。
- fixture description 改为中性业务副文 `Browser records for the current tenant.`，
  不描述组件功能或实现技术。
- 负面 probe 文档口径改为“其它 resource（同 schema）”；代理只校验 method+path，
  不验证 PostgREST schema 请求头，schema 暴露范围由 PostgREST 自身负责。
- 调试原始日志开关 `SVADMIN_ACCEPTANCE_DEBUG` 与临时 body/list 调试输出未保留；
  runner 失败路径仍不打印原始测试日志。后续手工修改均使用 `apply_patch`。

## 修正后 pi 重新验收

- 同一 runner：`pass=14 fail=0 skip=0 todo=0`、exit 0，完成标记出现；项目为
  `svadmin-auth-storage-smoke-92567555-c1c1-44b3-80d8-bb7552af761b`。退出后按精确
  label 查询容器（含已停止）、network、volume，输出均为空。
- fixture `tsc`、helper/test/runner 严格单文件 TS、定向 ESLint、限定 browser 目录
  `svelte-check` 与 `git diff --check` 均 exit 0；旧 13 项断言未改，总数仍 14。
- 该结果是修正后的 pi 证据；主线程最终独立复验仍待执行。

## 主线程修正版独立验收（历史）

- 主线程对上述修正版独立运行同一 runner：`pass=14 fail=0 skip=0 todo=0`、exit 0；
  项目为 `svadmin-auth-storage-smoke-d442df7a-fd34-4c5e-9786-3c7623288939`，退出后按
  精确 label 查询容器（含已停止）、network、volume 均为空。
- 主线程两项 TypeScript、browser 全目录 ESLint、限定 `svelte-check` 0 errors/0
  warnings 与 `git diff --check` 均通过。该结果作为修正后运行时历史保留，但仍需完成
  下面的稳定帧补充复验，不能据此把契约标为最终完成。

## 稳定帧与解析错误补充（本轮 pi）

- 视觉审查指出失败截图可能拍摄于 Svelte 入场动画未完成：错误摘要只显示顶部，部分
  引擎几乎看不到表单内 alert；B 空态截图也带极低 opacity。本轮先不归因产品缺陷，
  只补稳定可见帧断言，不改生产组件/CSS。
- 失败保存后先等待 drawer 与 error alert 实际可见，并复用既有
  `element.getAnimations({ subtree: true })` 模式等待有限动画结束；随后断言 alert
  文本非空且实际包含 `Operation failed`，alert/标题输入/Save 均有可测盒、位于视口内、
  中心 hit-test 命中自身或子元素，标题输入可编辑、Save 可用，再以
  `animations: 'disabled'` 截图。未使用固定大 sleep、隐藏 toast、CSS 覆盖或 force。
- B 空列表不只等待 response，还等待真实 `[data-svadmin-data-state="empty"]` 空态可见、
  文本包含 `No data`、盒与 hit-test 稳定，再以 `animations: 'disabled'` 截图。
- 截图路径保持不变。稳定帧断言只证明本地 Chromium/Firefox/WebKit 的当前可见控件和
  空态，不证明读屏、移动端视觉或产品全局布局。
- `finalListSettlement` / `finalOtherSettlement` 现在除 Promise rejected 外，还汇总
  全部 fulfilled capture 的 `parseError`；最终 A/B 所有精确 `browser_records` GET
  capture 均要求 `parseError === null`，测试通过 `listCaptureErrors` /
  `otherListCaptureErrors` 断言为空，不静默丢弃解析错误。负面 probe 使用 DELETE/
  POST 或非精确 GET，不会混入这个精确列表 capture 口径。
- 同一 runner 重新结果：`pass=14 fail=0 skip=0 todo=0`、exit 0；项目为
  `svadmin-auth-storage-smoke-23248484-af1c-45a2-a57f-12c1fc240910`。精确 label 的
  容器（含已停止）、network、volume 查询输出为空。fixture `tsc`、严格单文件 TS、
  定向 ESLint、限定 browser 目录 `svelte-check` 与 `git diff --check` 均 exit 0。
- 稳定帧补充未发现断言层真实裁剪或不可操作控件；若后续主线程仍观察到实际裁剪，应
  按该次截图与控件证据单独报告，而不是调整测试掩盖。

## 主线程待验（复验前历史清单，现已完成）

- 需对稳定帧补充后的当前代码再次独立运行同一 runner，确认
  `pass=14 fail=0 skip=0 todo=0`、exit 0、完成标记出现，并按该次精确 project label
  复核容器/network/volume 清理为空。
- 独立复核稳定帧截图、失败 alert/input/Save 可见与可操作断言、B 真实空态稳定呈现、
  解析错误汇总断言；重跑窄检查。
- 主线程最终结果应另补，不覆盖 pi 历史与初版历史。

## 主线程最终独立复验（2026-10-26）

- 主线程独立执行稳定帧补充后的同一 runner：**pass=14 fail=0 skip=0 todo=0**、
  exit 0，完成标记出现；第 14 项依次运行 Chromium、Firefox、WebKit。
- 最终 project：`svadmin-auth-storage-smoke-672c33ea-a7f3-4995-a8c2-0adeb3535c36`。
  退出后按精确 `com.docker.compose.project` label 查询容器、network、volume，三项
  exit 0 且输出为空。
- 主线程独立窄检查全部通过：fixture TS、helper/test/runner 严格 TS、browser 与
  runner/test ESLint、browser `svelte-check`（0 errors / 0 warnings）及 `git diff --check`。
- 最终代码核对了 fail-closed 列表解析、完整 PATCH 请求/响应计数与载荷、稳定排序与
  精确过滤参数、真实详情响应、失败/成功后的查询和选择保持，以及 B 的真实空数组和
  `total=0`。失败提示与空态稳定截图可读且控件可操作。
- 本轮仅完成本地真实服务流程，不证明生产字段权限、即时撤权、读屏、移动端视觉、
  跨服务事务或部署发布。

## 后续界面观察

- 稳定失败截图中顶部 Toast 仍覆盖 QuickEditDrawer 标题区；本轮不据此宣称全局
  无遮挡，后续应单独复核 Toast 与 Drawer 的布局契约。
- fixture 配置 `canCreate=false` 时，空态副文仍建议创建首条记录；后续应核对
  AutoTable 的权限感知空态文案，不能把真实空结果验收通过当成文案已完成。

## UI follow-up contract 与结果（本轮）

- parent：`docs/evaluations/enterprise-resource-workspace-service-contract-20261026.md`
- source：用户继续要求处理上述服务截图发现的两个界面观察，不扩展验收范围。
- reason：真实服务截图显示 Toast 可能遮挡 QuickEditDrawer 标题/操作区；无创建权限时
  AutoTable 空态仍提示创建第一条记录，属于用户可见的文案误导。
- orchestration/risk：managed / medium；pi 是唯一代码 writer，主线程独立 verifier。
  仅允许 `AutoTable.svelte`、`Toast.svelte` 及各自直接测试/必要 i18n 范围；不改
  enterprise fixture 掩盖问题，不提交、推送或发布。
- Toast：核对确认 `sheet.svelte` 只在 `open` 时挂载 `.svadmin-sheet-panel`，不会把
  关闭但仍隐藏的面板当成打开。Toast host 监听真实面板挂载，存在任意 sheet 时把
  active Toaster 从右上移到左下，保留 Toast 可见并避开右侧 Drawer 标题/操作区；
  最后一个 sheet 移除后恢复右上。未修改生产 Sheet/Drawer 或共享依赖。
- AutoTable：空态按 `canCreate` 分支；无创建权限使用既有中性 `common.noData`
  （中文“暂无数据”/英文“No data”），有创建权限继续使用引导文案；筛选空态继续使用
  `empty.description`，不改变其含义。没有新增 i18n 键，避免绕开共享依赖解析边界。
- 直接回归：
  - `auto-table-interactions.test.svelte.ts`：**63 passed**，覆盖中文/英文无创建权限
    中性文案、中文/英文有创建权限引导文案。
  - `auto-table-enterprise.test.svelte.ts`：**11 passed**，补充筛选空态仍使用
    “No records found matching your criteria.”，不等于中性空态。
  - `toast-host.test.svelte.ts`：**8 passed**，覆盖打开/关闭、先有 sheet 再挂载
    Toast、多个 sheet 中仅移除一个仍保持左下，最后移除才恢复右上。
  - 目标 ESLint `--max-warnings 0`、`AutoTable.svelte` 与 `Toast.svelte` 单文件
    `svelte-check --no-tsconfig`（0 errors / 0 warnings）、`git diff --check` 均通过。
- 边界：Toast 单测只证明 active Toaster 的 position 契约，不等于 Chromium/Firefox/
  WebKit 的真实几何、遮挡或无读屏问题；仍需主线程独立复核。本轮不运行全量测试或
  standalone，整体企业级目标保持 PARTIAL。

## UI follow-up 主线程独立复验（2026-10-27）

- 最终实现分别独立运行三个直接测试文件：AutoTable interactions **63/63**、
  AutoTable enterprise **11/11**、Toast host **8/8**，全部 exit 0。
- 核对无创建权限中英文中性文案、有权限创建引导、筛选空态，以及 Toast 在首个
  Sheet 打开和最后一个关闭时的位置切换。生产变更仅 AutoTable 与 Toast；i18n
  新增键已撤回，复用现有 `common.noData`，共享依赖 symlink 保持不变。
- 修改的三个 Svelte 文件独立编译均为 0 warnings；定向 ESLint 与
  `git diff --check` 通过。测试中的既有 svelte2tsx sourcemap 缺失警告不影响退出状态。
- 中间失败记录不计入通过结果：初版新增翻译键因共享 core 解析不可见，筛选测试
  初版 harness 不实现过滤；最终通过复用既有翻译、使用支持过滤的直接 fixture 修正。
- 本轮未重跑真实服务三浏览器矩阵；此前 14/14 服务证据保持其原始版本边界。
  Toast 单元测试证明位置参数与生命周期，尚不证明真实浏览器几何无遮挡。
  整体企业级目标继续为 PARTIAL，未提交、推送、发布或部署。

## 边界与限制

- CHECK 约束、tenant app_metadata 与 RLS 是本地可丢弃 fixture 契约，不是生产业务模型
  或生产 RBAC；不证明生产字段权限、审批、版本服务、跨服务事务或即时撤权。
- 浏览器仍经同源回环测试代理并缓冲小 fixture 响应；不外推真实跨源 CORS、大文件流式、
  读屏、MFA/OAuth、真实外部账号或生产 bucket/RLS。
- 服务验收阶段未修改生产组件/API；本轮 UI follow-up 仅修改 AutoTable/Toast 及直接
  测试/既有文案分支，未扩大生产文件写范围。
- 本轮 B 侧覆盖的是 workspace 列表真实空结果与无写请求；B 详情拒绝沿用先前证据，
  不冒充本轮重复覆盖。
