# 真实浏览器 AutoForm → PostgREST/PostgreSQL 持久化验收证据

- 契约：`docs/evaluations/enterprise-autoform-postgrest-record-contract-20261026.md`
- parent：`docs/evaluations/enterprise-postgrest-tenant-acceptance-contract-20261026.md`
- 工作树：隔离 `enterprise-storage-acceptance/svadmin`，保留全部 dirty；原工作区与共享
  `node_modules` 未修改。
- 状态：pi 初版与审查修正后结果分开保留；主线程随后独立复验同一 runner
  **13/13，exit 0，零 skip/todo**，并完成窄检查及精确项目清理复核。本契约本地
  验收完成；整体企业级目标仍为 PARTIAL，不代表合并、发布或生产验收。

## pi 实施结果

- 同一 runner：`bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
- 结果：`pass=13 fail=0 skip=0 todo=0`、`exit=0`，完成标记
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 出现。
- 随机 Compose project：`svadmin-auth-storage-smoke-de1a723a-c79b-4170-b7b4-31c440782365`。
- runner 退出后按该精确 project label 查询 OrbStack 容器（含已停止）、network、volume：
  三项命令均 exit 0 且输出为空。
- 原 12 项测试与既有断言保留；本轮只在同一测试文件新增 1 项，新增项内部依次运行
  Chromium、Firefox、WebKit，缺少任一引擎直接失败，3 个引擎仍计为 1 项测试。

## 审查后修正（初版结果保留为历史）

- 初版 pi `13/13`、project `svadmin-auth-storage-smoke-de1a723a-c79b-4170-b7b4-31c440782365`
  保留为历史，不回写为主线程结果。
- 修正后同一 runner：`pass=13 fail=0 skip=0 todo=0`、exit 0，完成标记出现；project
  `svadmin-auth-storage-smoke-31991212-3b6d-4766-b45f-017b99d35165`。按该精确 label 查询
  OrbStack 容器（含已停止）、network、volume 均 exit 0 且输出为空。
- B 读取失败不再只看 `Operation failed`：fixture 仅在 `authState === 'signed-in'` 时挂载
  `AutoForm`，避免登录前无会话读取；helper 在点击 B 登录前注册 `waitForResponse`，严格匹配
  `GET /rest/v1/browser_records?id=eq.<rowId>`，登录后 await 该响应。当前 SDK 的 refine
  `getOne` 使用集合读取而非 `.single()`，三引擎真实响应均为 `200` + `[]`，随后 data
  provider 因缺少记录报 `INVALID_PROVIDER_RESPONSE`；断言不使用任意网络错误冒充 RLS 拒绝。
  同时断言 B 的 browser_records GET 计数为 1，且不读取/打印 Authorization 或 token。
- 附件关联证明加强：`afterCreated` 与 `afterUpdated` 都断言持久化 attachment 精确为
  `{ uploadId }`；service role 列举该引擎目录只能看到 `primary.txt`，其对象 `id` 必须等于
  持久化 `uploadId`；owner 与 service role 分别读回同一文件字节且与上传文本一致；最终目录
  仍不得出现额外对象。
- edit 场景真正执行 `page.reload()`，重新登录后再次断言 title 与 attachment 引用回显，再
  修改 title 保存；不是仅 `goto`。原 12 项未改。
- runner 注释改为准确语义：AutoForm 不提交 `tenant_id`，列 DEFAULT 从 JWT
  `app_metadata` 填充，RLS 再校验显式值必须与可信声明一致；`DEFAULT + RLS` 允许同租户显式
  值，因此不再声称“不接受浏览器显式传入”。
- REST 负面 probe 的 `POST /rest/v1/tenant_records` 是未列出的其它 resource，不是“其它
  schema”；代理仅按 method+path 匹配，不检查 PostgREST schema 选择头，schema 暴露限制由
  PostgREST 自身负责，不宣称代理拒绝任意 schema header。
- 双浏览器 teardown 改为嵌套 `try/finally`：即使 B 关闭抛错，A 仍会关闭。
- 本轮不改生产 API、不新增测试套件；只改 fixture/helper、第 13 项与证据。

## 新增实现

1. `docker/enterprise-storage/` 栈
   - runner 在既有 `enterprise_acceptance` schema 新增仅本地验收表
     `browser_records(id, tenant_id, title, attachment jsonb)`。
   - `tenant_id` 列默认取 `request.jwt.claims -> app_metadata ->> tenant_id`；RLS 与既有
     tenant 策略同形，只信任 `app_metadata`，不信任可编辑的 `user_metadata`。
   - 明确只是可丢弃的本地验收资源，不是生产业务模型；PostgREST 仍只暴露该 schema。
2. `scripts/fixtures/enterprise-runtime/browser/AutoFormRecordBrowserFixture.svelte`
   - 唯一页面壳仍是当前 worktree 的 `AdminApp`；认证控件与真实 `AutoForm` 位于 dashboard
     正常文档流，无 fixed 遮挡、无 force click。
   - 使用当前 worktree 的 `AutoForm`、`FileUploadField`、`createSupabaseAuthProvider`、
     `createSupabaseDataProvider`、SDK/Core/refine 源码；创建与编辑都经真实 REST 请求。
   - 上传只把文件交给真实 Storage；AutoForm Save 由当前 data provider 写
     `enterprise_acceptance.browser_records`。没有捕获 JSON、mock provider、service-role
     写入或用页面输出冒充持久化。
   - 专用入口为 `autoform-records.html` / `main-autoform-record.ts`；旧捕获 JSON 场景保留。
3. `scripts/fixtures/enterprise-runtime/browser/upload-browser-acceptance.ts`
   - 复用既有 Vite、同源代理、浏览器启动/关闭与共享 helper。
   - 新增 REST allowlist 仅精确映射 `GET/POST/PATCH /rest/v1/browser_records` 到固定的
     `127.0.0.1` PostgREST origin；其它 resource、路径、方法、scheme-relative 逃逸与重定向
     仍返回 403。代理不检查 schema 选择头；PostgREST 只暴露 `enterprise_acceptance` 由
     PostgREST 自身负责。该额外负面 probe 只在新场景执行，原 12 项断言未改。
   - 既有有界请求体读取、读取/转发超时、断开取消与 `finally` teardown 继续复用，未缩小
     上限或新增外部依赖。
4. `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`
   - 新增第 13 项；service_role 只在 Node 侧写入 A/B 的 `app_metadata.tenant_id` 与最终
     清理，不进入任何浏览器 context。
   - Node 独立 GoTrue 会话读回真实行，核对 `tenant_id`、title 与 attachment 精确
     `{ uploadId }`；service role 列出对应目录确认 `primary.txt` 的真实对象 id 等于该
     `uploadId`，owner 与 service role 分别读回对象真实字节，最终目录无额外对象。
   - A 重新打开 edit URL 并真正 reload；重新登录后再次断言 title 与 attachment 引用回显，
     再修改 title 保存；独立会话再次读回更新值且 attachment 未变。
   - B 使用独立浏览器 context 与独立凭据打开同一行；AutoForm 只在登录后挂载，helper 严格
     等待并断言真实 `GET /rest/v1/browser_records?id=eq.<rowId>` 返回 `200` + `[]`；页面
     显示安全加载失败，DOM 不含 A 的 title/attachment/uploadId，也没有 Save 按钮、
     browser_records POST/PATCH 或对象 POST。
   - B 的独立 Node 会话同样不能读取 A 的行；随后 A 经 data provider 删除自己创建的验收行。

## 三引擎新增场景断言摘要

- A 真实登录后填 title、通过原生 `input[type=file]` 选择 txt、点击默认 Save；POST
  `browser_records` 计数为 1，Storage primary POST 计数为 1。
- Node 独立会话按 title 查到真实行，`tenant_id` 为可信 A 租户，attachment 精确为真实
  `{ uploadId }`；service 目录列举确认对象 id 等于该 uploadId，owner 与 service 读回字节
  与上传文本一致，目录无额外对象。
- A 用 `?id=<rowId>` 重新打开 edit 页并登录，回显后真正 `page.reload()`；重新登录再次
  回显同一 title 与引用，随后修改 title 并 Save；PATCH `browser_records` 计数增加 1。
- Node 独立会话读回更新 title 与原 uploadId，重新执行对象 id 与 owner/service 字节检查。
- B 独立 context 登录后打开同一 edit 地址；AutoForm 登录后才挂载，严格匹配的 GET
  `browser_records?id=eq.<rowId>` 真实响应为 `200` + `[]`，GET 计数为 1，页面加载失败，
  未见 A title/attachment，且 REST 写、Storage 写、页面错误、外部请求计数均为 0。
- 页面凭据泄露断言只使用布尔值：邮箱、密码、`access_token`、`bearer `、`service_role`
  均不出现在页面正文；未写 HAR/trace/video/storageState。
- 新场景的 REST 负面 probe 断言：DELETE 已列出的 resource、POST 未列出的其它 resource
  `/rest/v1/tenant_records`、scheme-relative REST 路径均为 403。该 probe 不证明代理检查
  schema 选择头。

## pi 审查修正后窄检查

| 命令 | 结果 |
| --- | --- |
| 同一 runner | `pass=13 fail=0 skip=0 todo=0`，exit 0 |
| `node node_modules/typescript/bin/tsc -p scripts/fixtures/enterprise-runtime/tsconfig.json --pretty false` | exit 0，无诊断 |
| 严格单文件 `tsc --ignoreConfig --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --noPropertyAccessFromIndexSignature --moduleResolution bundler --module esnext --target esnext --skipLibCheck --types bun,node`（helper/test/runner） | exit 0，无诊断 |
| `bunx eslint ...browser/upload-browser-acceptance.ts ...storage-acceptance.test.ts ...storage-acceptance.run.ts --max-warnings 0` | exit 0 |
| `bunx svelte-check --no-tsconfig --workspace scripts/fixtures/enterprise-runtime/browser` | 0 errors / 0 warnings，exit 0 |
| `git diff --check` | exit 0 |

未运行全量测试、`test:standalone`、全仓 typecheck 或全仓 svelte-check；未提交、推送、
发布或部署。未把引擎数乘进测试总数，也未跳过缺失浏览器。

## 截图（仅路径）

- `output/playwright/enterprise-autoform-record-service/autoform-record-created-{chromium,firefox,webkit}.png`
- `output/playwright/enterprise-autoform-record-service/autoform-record-updated-{chromium,firefox,webkit}.png`
- `output/playwright/enterprise-autoform-record-service/autoform-record-other-tenant-failure-{chromium,firefox,webkit}.png`

截图为本地 fixture 页面状态，不含邮箱、密码、token、service key 或 signing secret；未录制
HAR/trace/video，未写 storageState。

## 主线程待验（复验前历史清单，现已完成）

- 在同一 worktree 独立运行同一 runner，确认 `pass=13 fail=0 skip=0 todo=0`、exit 0、
  完成标记出现，并按该次精确 project label 复核容器/network/volume 清理为空。
- 独立复核登录后 B 的真实 GET `browser_records?id=eq.<rowId>` 响应与读取计数、attachment
  对象 id/字节关联、真正的 `page.reload()` 回显、REST allowlist 与 resource 语义，以及
  截图与凭据布尔断言。
- 独立重跑上述窄 TS/ESLint/Svelte/diff 检查。主线程结果应另补，不覆盖本节。

## 主线程独立复验（2026-10-26）

- pi 审查修正进程已正常退出后，主线程在同一隔离工作树独立执行
  `bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`：
  **pass=13 fail=0 skip=0 todo=0，exit 0**，完成标记
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 出现。新增第 13 项实际执行三引擎，
  不计为 39 项；此前 pi 两次结果与旧 12 项证据各自保留。
- 本次随机 project：`svadmin-auth-storage-smoke-4f339f3a-a03d-43e9-ac5e-52d1c258b458`。
  runner 退出后，主线程分别执行 `docker --context orbstack ps -a`、`network ls`、
  `volume ls`，均以该精确 `com.docker.compose.project` label 过滤；三项 exit 0，
  输出均为空。
- 逐项审查确认：AutoForm 仅登录后挂载；B 的读取等待先于登录注册，断言真实
  GET 的 `200 + []` 与读取次数 1；创建、更新及最终读回均核对精确附件引用、真实
  对象 id 和 owner/service 文件字节；edit 执行真正 reload 后重新登录并回显。
  REST 负面 probe 只证明 method/path/resource allowlist；双浏览器关闭有嵌套 finally。
- 独立窄检查全部 exit 0：fixture `tsconfig.json` 的 TypeScript 检查；helper/test/runner
  严格单文件编译；browser 目录及 runner/test 的 ESLint `--max-warnings 0`；browser
  workspace 的 `svelte-check --no-tsconfig`（0 errors / 0 warnings）；`git diff --check`。
- 主线程逐张检查本轮三引擎的 created、updated、other-tenant-failure 共 9 张截图：
  表单、认证和保存控件可辨识且未互相遮挡；B 只呈现通用失败及 Retry，不呈现 A 的
  数据或保存入口；未见测试凭据。成功 toast 会暂时覆盖顶部搜索区，未据此宣称全页
  无遮挡或全局视觉验收完成。截图只证明桌面 fixture 状态，不证明移动端或读屏。
- 本轮只补齐本地测试资源的浏览器持久化闭环，不把 Storage 上传与数据库 Save
  视作同一事务；跨服务回滚、孤立对象清理和生产业务策略未由本项验收。

## 边界与限制

- 本表、租户 app_metadata 与 RLS 是本地可丢弃 fixture 契约，不是生产业务模型或生产
  RBAC；不证明生产字段权限、审批、版本服务、即时撤权或 JWT 生命周期一致性。
- 浏览器仍经同源回环测试代理并缓冲小 fixture 文件；不外推真实跨源 CORS、大文件流式或
  浏览器在途传输取消。
- 未覆盖 MFA/OAuth、邮件投递、实机读屏、真实外部账号、生产 bucket/RLS、部署与发布。
- 未修改生产 API 或公共组件；若后续发现真实产品缺陷，应另立契约并以失败证据报告。
