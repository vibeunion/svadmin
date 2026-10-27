# AutoForm/FileUploadField → GoTrue → Storage 浏览器验收证据

- 契约：`docs/evaluations/enterprise-autoform-upload-browser-contract-20261026.md`
- 工作区：隔离 worktree `enterprise-storage-acceptance`，保留全部未提交改动。
  原工作区 `/Users/zhd/workspace/svadmin` 未修改；共享 `node_modules` 只作只读解析。
- 状态：pi 实施并通过同一 runner；修复后主线程最终独立复核通过。总体企业级目标仍为
  PARTIAL，不代表合并、发布或生产验收。历史证据未被覆盖。

## pi 结果

- 同一 runner：`scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`。
- 唯一测试文件：`scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`。
  原 10 项全部保留，仅在其后新增 1 项 AutoForm 浏览器场景；未删除旧测试或削弱
  原断言。
- 命令：`bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
- 结果：`pass=11 fail=0 skip=0 todo=0`、`exit=0`，出现完成标记
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE`，随机 Compose project
  `svadmin-auth-storage-smoke-08800657-c077-4faa-89ac-83b6135bbc98` 已 `down -v`。
- 引擎：Chromium、Firefox、WebKit 三者均在新增测试内依次运行；缺失任一引擎即
  失败，不动态缩减；3 个引擎流程仍计为 1 项测试。
- 清理核验：按上述精确 project label 查询 OrbStack 容器（含已停止）、network、
  volume，三项均 exit 0 且输出为空。
- 截图：`output/playwright/enterprise-autoform-upload-service/autoform-{success,logged-out-failure}-{chromium,firefox,webkit}.png`，
  仅组件与认证状态，不含邮箱、密码、token 或 service role；未录制
  trace/HAR/video，未写 storageState。

## 新增代码与流程

- `scripts/fixtures/enterprise-runtime/browser/AutoFormUploadBrowserFixture.svelte`
  与 `autoform.html`、`main-autoform.ts`：最小 AutoForm 宿主，挂载当前 worktree 的
  `AdminApp`/`AutoForm`/`FileUploadField`，用真实 `createSupabaseAuthProvider` 与
  `StorageClient` 上传。凭据只经内存 `addInitScript` 注入。
- 提交回调只把 AutoForm 实际提交的 JSON 捕获到页面输出，明确不是业务持久化服务；
  测试读取该 JSON，断言提交值恰为 `{ attachment: { uploadId } }`，无 URL 或 token。
- `scripts/fixtures/enterprise-runtime/browser/upload-browser-acceptance.ts` 抽出共享
  Vite/同源代理启动与关闭路径，并新增 `runBrowserAutoFormUploadAcceptance`；
  `@svadmin/core` 的 AutoForm/AdminApp 相关子路径全部显式指向当前 worktree。
- 代理 allowlist 仍只含 Auth `token` POST、`user` GET、`logout` POST 与三引擎本轮
  `primary.txt`/`retry.txt` 的精确 Object POST；其它 Auth/Object 路径 403，代理与
  浏览器 fetch 均固定 `redirect: 'error'`、超时与有界请求体。

## 三引擎窄流程断言

1. 真实 DOM 点击登录，从 GoTrue 取得会话；通过原生 `input[type=file]` 选择 txt。
2. 当前 worktree 的 AutoForm/FileUploadField 调用真实 Storage 上传；成功后默认
   Save 可用，Storage Object POST 计数为 1。本轮未用延迟上传断言 pending 状态。
3. 点击真实 Save；提交 JSON 精确只有 `attachment.uploadId`，且提交计数为 1。
4. 登出后再次选择 retry 文件：组件显示失败与可用 retry；Save 保持禁用，提交计数
   与提交 JSON 不变，Storage POST 计数不变，upload 调用计数为 2。
5. Node 侧在重新登录前用 service role 独立确认 retry 对象 list 为空且 download
   404/NoSuchKey；service role 从未进入浏览器。
6. 重新登录后点击真实 retry：上传成功，Storage POST 增加 1；再次 Save 提交新的
   精确 JSON，`uploadId` 与第一次不同，upload 调用计数为 3。
7. 流程结束后 owner 重新登录取得独立会话，与 service role 分别读回 primary/retry
   字节；每引擎最终目录恰为 `primary.txt`、`retry.txt`，实际对象 id 分别等于两次
   提交 JSON 中的 `uploadId`。
8. 页面错误计数与外部请求计数均为 0；凭据泄露断言只检查布尔值。

## 定向校验（pi）

| 命令 | 结果 |
| --- | --- |
| 同一 runner | `pass=11 fail=0 skip=0 todo=0`，exit 0 |
| `bunx tsc --ignoreConfig --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --noPropertyAccessFromIndexSignature ...`（helper/test/runner） | exit 0 |
| `bunx eslint scripts/fixtures/enterprise-runtime/browser scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts --max-warnings 0` | exit 0 |
| `bunx svelte-check --no-tsconfig --workspace scripts/fixtures/enterprise-runtime/browser` | 0 errors / 0 warnings，exit 0 |
| `git diff --check` | exit 0 |

调试期间曾临时在 runner 失败路径打印截断测试输出以定位按钮被 AdminApp 拦截，
定位后已删除该临时代码；最终 runner 正常通过且不再打印原始测试/服务日志。

## 本轮审查修复（覆盖布局与启动失败清理）

- 原因一：`AutoFormUploadBrowserFixture.svelte` 的认证区使用
  `position: fixed; z-index: 2147483647`，截图里遮住 `AdminApp` 标题与成功 toast。
  已删除外层 `main`/`header` 二重页面壳、魔法顶部 padding 和 fixed 认证条，把认证
  控件、同一个真实 `AutoForm` 与 test outputs 一起放进 `AdminApp` 的 dashboard
  snippet，按正常文档流排列；`AdminApp` 是唯一页面壳。未改产品 CSS/公共组件，未用
  force click 绕过。
- 原因二：`startFixtureServer` 在 `createServer` 成功后若 `listen`/`address` 校验
  失败，原 catch 只删 cache、不关闭已创建的 Vite server。现由外层持有 `server`，
  失败路径先 `await server.close()`，并用 `finally` 保证 cache 仍清理；
  `closeFixtureServer` 的 cache 清理同样改为 `finally`。代理契约、测试断言、11 项
  场景和三引擎均未改动。
- 复跑同一 runner：`bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`，
  `pass=11 fail=0 skip=0 todo=0`、exit 0，完成标记
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE`，随机项目
  `svadmin-auth-storage-smoke-a6930adc-e19d-42b9-8744-74b840b85f09` 已 `down -v`；
  按该精确 project label 查询容器（含已停止）、network、volume 均为空。
- 窄校验：上述三文件 `tsc --ignoreConfig --noEmit --strict
  --exactOptionalPropertyTypes --noUncheckedIndexedAccess
  --noPropertyAccessFromIndexSignature ...` exit 0；限定 ESLint exit 0；
  `svelte-check --no-tsconfig --workspace scripts/fixtures/enterprise-runtime/browser`
  为 0 errors / 0 warnings；`git diff --check` exit 0。
- 上一轮主线程单独运行的 11/11 结果继续保留为历史记录，不作为本轮修复后的最终
  复核；主线程仍需对当前代码独立复跑并复核。

## 未覆盖边界与限制

- 提交回调只证明 AutoForm 产出的 JSON 引用，不证明业务数据库持久化、审批或租户
  授权。
- 本轮仍走 runner 同源回环测试代理并缓冲小 fixture 文件，不外推真实跨源 CORS、
  浏览器在途取消或大文件流式行为。
- 生产 bucket/RLS、对象生命周期、生产身份映射、部署发布、真实外部账号未覆盖。
- MFA/OAuth、邮件投递、实机读屏未覆盖。
- 未修改公共 API 或生产逻辑；未运行全量测试、`test:standalone`、全仓 typecheck
  或全仓 svelte-check。

## 主线程待验（历史检查单，已由下节完成）

- 待主线程在同一 worktree 独立复跑同一 runner，确认 `pass=11 fail=0 skip=0
  todo=0`、exit 0、完成标记出现，并按精确 project label 复核容器/network/volume
  清理为空。
- 待主线程独立复核新增 AutoForm 宿主、代理 allowlist、JSON 引用断言与截图，并
  重跑上述窄 TS/ESLint/Svelte 检查。
- 本文件暂不记录主线程结果；复核后另补，不覆盖本节。

## 主线程最终独立复核

- 对审查修复后的最终代码运行同一 runner：`pass=11 fail=0 skip=0 todo=0`、
  exit 0，完成标记 `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 出现。
  本次项目为 `svadmin-auth-storage-smoke-2e29fd41-029d-4a84-a9f7-a46dc3563e60`；
  原 10 项保留，新增第 11 项包含 Chromium、Firefox、WebKit 三引擎流程，
  不把引擎数乘入测试总数。
- runner 退出后，主线程按上述精确 Compose project label 分别查询 OrbStack
  容器（含已停止）、network、volume：均 exit 0，输出为空。浏览器与 Vite 的
  await close 路径执行并正常退出；未执行操作系统全局进程审计。
- 严格 TS：使用 `node node_modules/@typescript/native/bin/tsc --ignoreConfig
  --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess
  --noPropertyAccessFromIndexSignature --moduleResolution bundler --module esnext
  --target esnext --skipLibCheck --types bun,node`，指定 helper/test/runner 三文件，
  exit 0。browser 目录与 test/runner 的 ESLint `--max-warnings 0` exit 0；
  限定 browser 目录的 `svelte-check --no-tsconfig` 为 0 errors / 0 warnings、exit 0。
- 审查修复前主线程也曾独立通过 11/11，项目为
  `svadmin-auth-storage-smoke-8bc84203-3fa7-465f-9ac5-98436bf2dcdc`，其精确 label
  三项清理查询同样为空；该结果只作历史记录，不替代最终版本复验。
- 截图目录为 `output/playwright/enterprise-autoform-upload-service/`，共 6 张 PNG，
  无 trace/HAR/video/storageState。主线程抽查修复版 WebKit 失败态及最终独立运行
  Firefox 成功态：认证控件已在正常文档流，附件、重试、Save 与 JSON 输出可见，
  旧认证覆盖层已移除；未见邮箱、密码或 token。既有 Toast 的临时浮层不是本轮
  视觉验收目标，不据此声称全局通知布局或移动端视觉验收通过。
- 仅修改本地验收夹具、单一测试入口与文档，未修改产品组件、生产策略或原工作区；
  未提交、推送、发布或部署。失败时 Save 禁用的证据不替代绕过按钮的直接提交攻击
  回归；真实业务数据持久化、RBAC、读屏、跨源 CORS、大文件与发布仍不在本轮范围。
