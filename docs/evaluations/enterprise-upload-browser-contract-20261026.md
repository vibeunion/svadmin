# 真实浏览器 FileUpload → GoTrue → Storage 验收契约

- parent: `docs/evaluations/enterprise-auth-storage-contract-20261026.md`
- source: 用户要求在隔离 worktree 续接原 B2-08 目标，补齐真实浏览器 FileUpload
  组件到 GoTrue 会话与 Storage 对象存储的端到端证据。
- reason: 上一轮联合验收只在 Bun 进程内直接调用上传回调，没有证明真实浏览器
  `FileUpload` 的原生文件选择、UI 状态、登出失败、重试和非法类型拒绝会沿同一条
  真实 Auth/Storage 链路工作。
- orchestration/risk: managed / medium；pi 为唯一实施 writer，主线程独立审查与
  定向验证。无 coordination.json / agmesh CLI；以本契约记录范围和执行状态。
- workspace: 隔离 worktree `enterprise-storage-acceptance`，基线 `72ce9847`。
  原工作区 `/Users/zhd/workspace/svadmin` 不修改；仅通过 `node_modules` 共享依赖，
  被测 UI/Core/CSS 使用当前隔离工作区源码。
- scope: 只在 `scripts/fixtures/enterprise-runtime/browser/` 新增最小真实浏览器宿主，
  挂载当前 worktree 的 `packages/ui/src/components/FileUpload.svelte`，经真实
  `createSupabaseAuthProvider` 与 `StorageClient` 上传。沿用现有 Vite、Svelte 与
  Playwright 依赖；继续由单一 `storage-acceptance.test.ts` 调用一个 browser helper。
- environment: 同一 runner 的临时 OrbStack GoTrue + Storage 栈；Vite 与浏览器只监听
  回环随机端口，`finally` 关闭，不保留后台服务。不重建全量 `dist`，不修改
  `scripts/fixtures/enterprise-ui` 的大应用入口。
- resolution: 根 `node_modules` 是原工作区符号链接，因此 Vite 必须显式把
  `@svadmin/core`、`@svadmin/core/*` 和被测 `FileUpload` 路径解析到当前 worktree，
  禁止被测源码落回原工作区。
- credentials: 登录凭据只能经内存注入浏览器；不进入 URL query、Vite env build
  常量或仓库 env 文件。service role 与 JWT secret 永不进入浏览器；anon key、普通
  用户随机密码和 token 不写入日志、截图、trace 或 storageState。
- network: 浏览器仅允许本轮 fixture 的严格 `127.0.0.1` 回环 origin；runner 在同一
  进程内按固定 allowlist（Auth `token` POST、`user` GET、`logout` POST，以及三种
  引擎 primary/retry 的精确 Object POST）把请求代理到两个固定 `127.0.0.1` origin，
  拒绝其它 Auth/Object 请求，避免 `//host` scheme-relative 逃逸与跨源 CORS 改变
  服务端边界。代理请求体有 1 MiB + multipart 裕量上限与读取超时，断开时取消上游；
  浏览器侧 fetch 固定 timeout 与 `redirect: 'error'`，禁止外部请求。不录制
  network trace/HAR/video。
- verification: 通过真实 DOM 操作登录、登出和选择原生 `input[type=file]`；不直接
  调用 upload handler 冒充用户流程。成功引用只保留 `uploadId`，由 service role 与
  owner 会话独立读回相同字节；登出后失败不产生对象，重新登录点击 retry 成功后
  没有重复对象；非法类型不发上传请求。
- lifecycle: 本机 Chromium、Firefox、WebKit 三者均必须通过；缺少任一引擎直接失败，
  不动态缩减。三者由同一测试文件按引擎复用场景，不下载大浏览器、不改系统。runner 只接受完整
  `pass=10 fail=0 skip=0 todo=0`，不允许 skip/todo 冒充通过，并保留原 9 场景与
  信号 mutation 修复。
- non-goals: 不扩展公共 API 或生产策略，不覆盖 AutoForm 上传、生产 bucket/RLS、
  部署发布、真实外部账号、MFA/OAuth、实机读屏；不把成功附件 Remove 按钮解释为
  服务端删除。
- status: pi 已按本契约实施并在隔离 worktree 通过同一 runner（`pass=10 fail=0
  skip=0 todo=0`、`exit=0`、完成标记出现，Chromium/Firefox/WebKit 均运行）。
  主线程独立复跑同一 runner 亦为 10/10、exit 0，严格 TS、定向 lint 与限定目录
  Svelte 检查通过，并按精确 project label 确认容器/network/volume 清理为空。
  本契约的本地验收完成，总体企业级目标仍为 PARTIAL，不等同合并、发布或生产验收。
  `docs/evidence/enterprise-upload-browser-20261026.md` 分列 pi 结果、主线程独立复核
  与未覆盖边界。
