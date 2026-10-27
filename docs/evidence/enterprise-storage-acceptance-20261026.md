# 本地 Storage 验收证据（2026-10-26）

- 契约：`docs/evaluations/enterprise-storage-contract-20261026.md`
- 工作树：`enterprise-storage-acceptance`（隔离 worktree）
- 编排：managed / medium；pi 实施，主线程独立复跑并完成审查后的定向收口
- 环境：显式 `docker --context orbstack`，缓存镜像 `public.ecr.aws/supabase/storage-api:v1.80.0` + `postgres:18`

## 运行方式

```bash
bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts
```

runner 只操作随机 Compose 项目 `svadmin-storage-smoke-<uuid>`，回环随机端口
`127.0.0.1::5000`，进程内生成临时密钥，正常与失败路径都执行本次项目
`down -v`，清理失败即退出 1。runner 不透传原始测试/服务日志：失败只报告固定
stage 与 pass/fail 计数，成功只输出完成标记、`exit=0` 与计数。

## 实测结果

- 单一测试：`scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`
- 结果：7 pass / 0 fail，runner 退出码 0
- 完成标记：`SVADMIN_STORAGE_ACCEPTANCE_COMPLETE`（runner 要求同时出现标记与 exit 0）

| 场景 | 断言要点 | 结果 |
| --- | --- | --- |
| 上传回调返回可持久化引用 | 上传成功必须拿到非空 `id`，失败即 throw（不 `return undefined`）；`UploadSession.signal` 接到 fetch 层；`uploadReferenceFor` 只保留 `uploadId`，无 `url`；A 读回字节与上传一致 | pass |
| 预先中止 | 调用前已 abort 时，同一个 UploadHandler 拒绝，不调用 setUploadId、不产生对象、不发布成功引用；**不等同于在途取消** | pass |
| 对象授权边界 | B / anon 读取返回 `404 / NoSuchKey`（未泄露内容）；B / anon `upsert` 覆盖返回 `403 / AccessDenied`；B / anon 删除返回空集；A 仍读回原始字节 | pass |
| 匿名写边界 | anon 对 A 对象 `createSignedUrl` 拒绝；anon 新建对象返回 `403 / AccessDenied`，service_role 列举确认未落库 | pass |
| B 的签名 URL 边界 | B 对 A 对象 `createSignedUrl` 拒绝；B 对自己对象可签发（反向对照） | pass |
| 签名 URL 实际可读 | 用 guardFetch **不带 Authorization** 读取签名 URL，字节与 A 上传内容一致；布尔断言，不打印 URL；引用序列化后不含签名 URL 或 `token=` | pass |
| 清理与重试 | 取消回调先校验列出的当前对象 `id` 与 `uploadId` 匹配再删除；未知 `uploadId` 被拒且原对象可读；匹配时删除 1 条；重复清理返回真实 `[]` 空操作 | pass |

## 关键实现事实（依据镜像实测，非猜测）

- storage-api 镜像自带迁移（`/app/migrations/tenant`），由 `node dist/scripts/migrate-call.js`
  执行，负责创建 `storage` schema、`buckets`/`objects` 表、`anon`/`authenticated`/
  `service_role`/`authenticator` 角色与表权限；本栈不手写 schema，避免与迁移冲突。
- 迁移只对 `storage.objects`/`buckets` 执行 `ENABLE ROW LEVEL SECURITY`，不创建所有者策略；
  策略由 runner 通过 `psql`（以 `postgres` 角色连接）创建，而非 `service_role`：
  私有 bucket 与 owner-only 策略（`owner = auth.uid()`），并 `GRANT ALL ON storage.objects
  TO authenticated, anon, service_role`。测试内的 `service_role` 只用于 bucket 预检与收尾清理。
- 本地无 GoTrue，故 `docker/enterprise-storage/init/01-auth-helpers.sql` 补齐
  `auth.uid()/auth.role()/auth.jwt()`；Storage 通过 `set_config('request.jwt.claims', ...)`
  注入请求声明，策略据此判定身份。
- Storage 要求 `ANON_KEY`/`SERVICE_KEY` 为用共享 secret 签发的合法 JWT（曾观测到
  `Invalid Compact JWS`），因此 runner 用 `jose` 现签，而不是任意字符串。
- Storage 从 JWT 的 `sub` 取对象所有权（`request.owner = payload.sub`）。策略只授予
  `authenticated`；fixture 的 anon 没有匹配策略，也没有用户 `sub`，因此**匿名在本栈不能
  新建任何对象**（实测 `403 / AccessDenied`）；所以匿名只按“全拒”断言，不用
  “匿名能写自己的对象”做反向对照。
- `storage-js` 的 `upload(path, body, options)` 的 `FileOptions` **不含 `signal`**；
  把 `UploadSession.signal` 传给 `FileOptions` 不会生效（实测已中止的会话仍创建了对象）。
  因此 fixture 把会话 `signal` 注入该会话的 fetch 封装，`guardFetch` 组合会话信号、
  调用方信号与固定 20s 超时，并强制 `redirect: 'error'`（`init` 无法覆盖）。
- 收尾清理只按已知精确 fixture 路径删除（`list()` 只列根目录，会漏掉 `owner/`
  子目录；子目录需 `list('owner/')`）。cleanup 失败不注入、不伪造；兜底是 runner 的
  `down -v`。

## 入口守卫实测

- 错误/缺失运行标记：`fail`、退出码 1（不会被计为通过）。
- 非严格 loopback URL：`fail`、退出码 1，不发外部请求。实测拒绝
  `http://localhost:54321`、带路径、带 userinfo、带 query、带 fragment 以及
  `http://10.0.0.5:54321` 及非法端口七类输入；只接受精确的 `http://127.0.0.1:<port>`。
- 完全未设置相关环境变量：`skip`、退出码 0（像普通单元测试一样不参与真实验收）。

## 主线程最终复核

- 最终随机项目：`svadmin-storage-smoke-4bfdf39b-5ebd-44f3-86fa-f8f392746f11`。
- 在预取消用例改为直接调用同一个 `UploadHandler` 后，独立运行 runner：
  `exit=0`、`pass=7`、`fail=0`，完成标记已出现。
- 重复取消直接调用同一个 `UploadCancelHandler`；收尾对象或 bucket 清理失败时抛错，
  不再只打印错误而继续发布完成标记。
- 最终两文件定向 ESLint 与严格 TypeScript 检查退出码均为 0；严格选项包含
  `strict`、`exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`。
- 入口守卫单独验证七类非法地址、两类缺失或错误标记均失败；未配置环境时跳过，
  不将跳过算作真实服务通过。
- runner 执行 `down -v` 后，按上述精确 Compose project label 查询 containers、
  networks、volumes，结果均为空。未清理其他项目资源。
- 最终实现文件与文档均留在隔离工作树，未提交、未合并、未发布；原工作区改动未触碰。

本次解除的是“没有可执行的本地真实 Storage 验收环境及证据”这一缺口；以下限制
仍然成立，不据此宣告整体企业级目标完成。

## 限制

- 不运行真实 GoTrue：`anon`/`service_role`/普通用户 JWT 都由**测试 runner 进程**用临时
  共享 secret 本地签发（`jose`），user UUID 为固定非秘密常量。这里只证明 Storage 侧
  RLS 与对象边界，不等同于真实 GoTrue/Storage 联合验收。
- 测试中使用的 **storage 读取签名 URL 由 Storage 服务自身签发**（`createSignedUrl`，
  服务端用它自己的密钥签发）；测试进程只负责发起请求并校验字节，不签发 URL。
  本栈未验证真实 GoTrue 会话 JWT 驱动的 Storage 上传与签名读取联合流程。
- 预先中止只证明“请求前已 abort 不会创建对象”，**没有**证明传输途中的在途取消
  与部分写入的回滚语义。
- 未对 cleanup 失败路径做故障注入验证。
- 未覆盖 MFA/OAuth、跨服务生产身份映射、生产 bucket/RLS 策略、实机读屏。
- 令牌与签名 URL 仅在进程内使用，不写入表单引用、日志或文档。
