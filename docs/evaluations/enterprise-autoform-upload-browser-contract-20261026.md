# AutoForm/FileUploadField → GoTrue → Storage 浏览器验收契约

- parent: `docs/evaluations/enterprise-upload-browser-contract-20261026.md`
- source: 用户要求在隔离 worktree 继续 SVAdmin 企业验收，补齐真实
  AutoForm/FileUploadField 到 GoTrue 会话与 Storage 对象的端到端浏览器证据。
- reason: 上一轮只验证了独立 `FileUpload.svelte` 的浏览器链路，没有证明
  AutoForm 的托管 file 字段、原生文件选择、提交 JSON 引用、失败阻止保存以及
  登出后重试保存会沿同一条真实 Auth/Storage 链路工作。历史证据
  `docs/evidence/autoform-upload-integration-20261024.md` 使用的是受控 uploader，
  不包含真实 GoTrue/Storage。
- orchestration/risk: managed / medium；pi 为唯一实施 writer，主线程独立审查与
  定向验证。无 coordination.json / agmesh CLI；以本契约记录范围和执行状态。
- workspace: 隔离 worktree `enterprise-storage-acceptance`，保留全部未提交改动。
  原工作区 `/Users/zhd/workspace/svadmin` 不修改；共享 `node_modules` 只读解析，
  被测 UI/Core/CSS 显式指向当前隔离工作区源码。
- scope: 只在 `scripts/fixtures/enterprise-runtime/` 与 `browser/` 下新增最小
  AutoForm 浏览器宿主与 helper 分支，继续由单一
  `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts` 调用；沿用同一
  临时 OrbStack runner 和同源严格代理。优先不改公共 API 或生产逻辑；若发现
  真正生产缺陷先报告，不在本轮顺手重构。
- environment: 同一 runner 的临时 OrbStack GoTrue + Storage 栈；Vite 与浏览器只
  监听回环随机端口，`finally` 关闭，不保留后台服务。不重建全量 `dist`，不修改
  `scripts/fixtures/enterprise-ui` 的大应用入口。
- credentials: 登录凭据只经内存注入浏览器；service role 与 JWT secret 永不进入
  浏览器。anon key、普通用户随机密码与 token 不写入日志、截图、trace 或
  storageState。
- network: 浏览器只允许本轮 fixture 的严格 `127.0.0.1` 回环 origin；runner 在同一
  进程内按固定 allowlist 把 Auth `token` POST、`user` GET、`logout` POST 以及本轮
  三引擎 AutoForm primary/retry 的精确 Object POST 代理到两个固定 `127.0.0.1`
  origin，其它 Auth/Object 请求 403。代理请求体有 1 MiB + multipart 裕量上限与
  读取超时，断开时取消上游；浏览器侧 fetch 固定 timeout 与 `redirect: 'error'`。
  不录制 network trace/HAR/video。
- verification: 通过真实 DOM 操作登录、登出、选择原生 `input[type=file]`、点击
  默认 Save 与 retry 按钮；不直接调用 upload handler 冒充用户流程。三引擎窄流程：
  原生选中 txt → 真实 Storage 上传成功 → 提交 JSON 只含 `{ attachment: {
  uploadId } }` → 登出后选择重试文件失败且 Save 禁用、提交计数与 Storage POST
  计数不变 → 重新登录后真实 retry 成功 → 再次 Save 提交新的精确引用。提交回调
  只捕获并展示 JSON 快照，明确注明不是业务持久化服务。owner 会话与 service role
  在 Node 侧独立验证最终字节；每引擎最终目录恰为 primary/retry 两个对象，实际
  对象 id 分别等于两次提交 JSON 中的 `uploadId`。
- lifecycle: Chromium、Firefox、WebKit 三者均必须通过；缺少任一引擎直接失败，
  不动态缩减。runner 只接受完整 `pass=11 fail=0 skip=0 todo=0`，不允许 skip/todo
  冒充通过；保留原 10 项场景与断言，不删除旧测试。
- non-goals: 不扩展公共 API 或生产策略，不覆盖生产 bucket/RLS、部署发布、真实外部
  账号、MFA/OAuth、实机读屏；不把提交回调捕获的 JSON 解释为业务数据库持久化，也
  不把成功附件 Remove 按钮解释为服务端删除。
- status: pi 已按本契约实施并在隔离 worktree 通过同一 runner（`pass=11 fail=0
  skip=0 todo=0`、`exit=0`、完成标记出现，Chromium/Firefox/WebKit 均运行）。
  主线程对布局与清理修复后的最终实现独立复跑 11/11、exit 0；严格 TS、定向
  ESLint 与限定目录 Svelte 检查通过，精确 project label 的容器/network/volume
  清理为空。结果分列于
  `docs/evidence/enterprise-autoform-upload-browser-20261026.md`，历史证据不覆盖。
  本契约的本地验收完成；整体企业级目标仍为 PARTIAL，不等于合并、发布或生产验收。
