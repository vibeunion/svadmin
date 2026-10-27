# 真实浏览器 FileUpload → GoTrue → Storage 验收证据

- 契约：`docs/evaluations/enterprise-upload-browser-contract-20261026.md`
- 工作区：隔离 worktree `enterprise-storage-acceptance`，基线 `72ce9847`。
  原工作区 `/Users/zhd/workspace/svadmin` 未修改；通过 `node_modules` 符号链接共享依赖，
  被测 UI/Core/CSS 显式解析到当前隔离工作区源码。
- 状态：pi 实施完成，主线程独立复核通过。总体企业级目标仍为
  PARTIAL，不代表合并、发布或生产验收。

## pi 结果

- 同一 runner：`scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`。
- 唯一测试文件：`scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`，
  在原 9 个场景之后新增 1 个浏览器场景，由该文件调用一个 browser helper。
- 结果：`pass=10 fail=0 skip=0 todo=0`，`exit=0`，出现完成标记
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE`；随机 Compose project 已 `down -v`。
- 引擎：本轮 contract/helper 明确要求 Chromium、Firefox、WebKit 三者全部运行；
  缺失任一引擎直接失败，不动态缩减。三者均在同一个测试文件按引擎复用场景并通过，
  未下载浏览器、未改系统。
- 截图：`output/playwright/enterprise-upload-service/upload-{success,logged-out-failure,rejected-type}-<engine>.png`，
  仅文件/认证状态，不含邮箱、密码、token 或 service role。
- 代码：`scripts/fixtures/enterprise-runtime/browser/` 下的独立 Vite 宿主、
  `UploadBrowserFixture.svelte` 与 `upload-browser-acceptance.ts`；`main.ts`
  从当前 worktree 的 `packages/ui/src/app.css` 引入真实 UI 样式，fixture 自身
  样式只用现有语义 token。`app.css` 依赖仓库已忽略的
  `packages/ui/src/styles/tailwind.generated.css`；同一 runner 现会在启动栈前
  自动执行 `bun run --cwd packages/ui build:tailwind`，捕获输出且失败固定
  `stage=css`，因此既有验收命令不再依赖先前手工生成。该步骤只生成最小 CSS，
  不构建全量 packages，也不运行全量 verify；共享 `node_modules` 不写入，CSS
  产物只留在当前 worktree 且被忽略、不提交。未修改
  `scripts/fixtures/enterprise-ui` 大应用入口，未重建全量 `dist`。
- 校验：窄 eslint（新增 browser 目录、测试与 runner）通过；helper、测试与 runner
  三个 TS 文件用 `--strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess
  --noPropertyAccessFromIndexSignature` 定向通过；fixture Svelte 用
  `svelte-check --no-tsconfig --workspace scripts/fixtures/enterprise-runtime/browser`
  限定目录通过；`git diff --check` 通过。

## 浏览器场景断言

- 通过 DOM 点击真实登录按钮，使用真实 `createSupabaseAuthProvider` 从 GoTrue 取得
  会话；通过真实原生 `input[type=file]` 选择非敏感 txt，由当前 worktree 的
  `FileUpload.svelte` 调用 `StorageClient` 上传。
- 成功状态在组件内可见；持久化引用 JSON 只有 `uploadId`，无 URL/token；service role
  与 owner 独立会话分别读回相同字节。
- 登出后再次选择同一 retry 文件：组件显示安全失败和可用 retry 按钮；失败尝试没有
  发出 Storage `POST`，因此不会产生最终对象。Node 侧在该失败之后、重新登录之前用
  service role 独立确认 retry 对象不存在（list 为空且 download 为 404/NoSuchKey）；
  service role 从不进入浏览器。
- 重新登录后点击真实 retry 按钮：上传成功，service role 与 owner 读回相同 retry
  字节；每引擎最终目录名单恰为 `primary.txt`、`retry.txt`，且两个实际 Storage
  对象 id 分别等于 UI JSON 引用中的 `uploadId`，不只检查数量。
- 非法类型 `.csv` 被 accept 拒绝；上传调用计数与 Storage `POST` 计数均不变。
- 浏览器网络只访问本轮 fixture 回环 origin；runner 同源代理只按固定 allowlist
  转发 Auth `token` POST、`user` GET、`logout` POST 与三种引擎 primary/retry 的
  精确 Object POST，目标 origin 固定为两个严格 `127.0.0.1` origin，其它
  Auth/Object 请求直接 403，代理 `redirect: 'error'`。同一浏览器场景内增加
  scheme-relative 路径与不允许方法的负面 probe，均返回 403 且外部请求计数为 0。
  请求体按 fixture 1 MiB + multipart 裕量有界，读取有超时，断连/teardown 取消
  上游，不遗留未决请求。凭据只经内存 `addInitScript` 注入，service role/JWT secret
  从未进入浏览器；未录制 trace/HAR/video，未写 storageState。
- 凭据泄露断言只检查布尔值（如 `body.includes(password) === false`），失败时不会
  打印密码；`pageerror` 只保留安全计数。未保留 debug 开关、调用或临时取 token
  调试请求。
- 根 `node_modules` 指向原工作区，Vite 显式把 `@svadmin/core` 及子路径别名到当前
  worktree；CSS 与 `FileUpload` 组件也以当前 worktree 相对路径导入，被测源码未
  落回原工作区。

## 主线程独立复核

- 在隔离 worktree 独立复跑同一 runner，最终 `pass=10 fail=0 skip=0 todo=0`、
  `exit=0`，完成标记 `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 出现。
  共 10 项测试，其中 1 项内部依次运行 Chromium、Firefox、WebKit 三引擎流程，
  不记为 30 项测试；原 9 项与取消信号修复保留。
- 本轮 Compose project 为
  `svadmin-auth-storage-smoke-fde1c50a-f9a1-4e8c-aec1-fe29785bf03c`。
  runner 结束后，主线程分别按该精确 project label 查询 OrbStack 容器（含已停止）、
  network、volume，三项查询均 exit 0 且为空。helper 的 browser/Vite 关闭路径已等待，
  runner 正常退出；未声称执行过操作系统全局浏览器进程审计。
- helper、runner、单一测试文件的严格 TS 定向检查 exit 0；browser 目录与这两个
  TS 入口的 ESLint（`--max-warnings 0`）exit 0。限定 browser 目录的
  `svelte-check --no-tsconfig` 为 0 errors / 0 warnings、exit 0；其后仅修改
  runner/helper/docs，未再修改 Svelte fixture。
- 已审查新增宿主、代理 allowlist、当前工作区源码解析与 runner 计数。共享依赖
  保持原路径，自动 CSS 生成仅写入当前 worktree 中被 Git 忽略的产物；未提交、
  推送、发布或部署。
- 截图目录共 9 张 PNG，无 trace/HAR/video/storageState。抽查 CSS 修复后的
  Chromium 登出失败、最终独立复跑的 Firefox 成功和 WebKit 类型拒绝截图：
  真实组件样式与图标正常，反馈可读，无明显重叠，未见邮箱、密码或 token。
  截图含测试文件状态和测试专用 upload UUID，不作为移动端或读屏验收。

## 未覆盖边界

- 本轮 browser 场景走 runner 同源测试代理并缓冲小 fixture 文件：它只证明该代理
  allowlist 下的回环链路，不外推真实跨源 CORS、浏览器在途取消或大文件流式行为。
- AutoForm / FileUploadField 的上传链路未在本轮浏览器场景内验证。
- 生产 bucket/RLS、对象生命周期、生产身份映射、部署发布和真实外部账号未覆盖。
- MFA/OAuth、邮件投递、实机读屏未覆盖。
- 成功附件的 Remove 按钮仍按组件既有约定只移除本地队列；本轮不把它解释为服务端
  删除，也未新增公共 API 或生产策略。
