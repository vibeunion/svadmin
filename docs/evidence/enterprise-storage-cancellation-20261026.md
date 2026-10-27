# 在途传输取消专项证据（pi 实施、主线程独立复核）

- contract: `docs/evaluations/enterprise-storage-cancellation-contract-20261026.md`
- parent: `docs/evaluations/enterprise-auth-storage-contract-20261026.md`
- workspace: 隔离工作树 `enterprise-storage-acceptance`；原工作区
  `/Users/zhd/workspace/svadmin` 未读取、未修改。
- orchestration/risk: managed / medium；pi 唯一代码 writer，主线程独立 review 与定向复跑。
- review-status: 主线程独立审查和本地复跑通过；本文件不宣称已合并、已发布或生产验收。

## 实施内容

- 在既有单一测试文件中新增 1 个场景：真实 GoTrue token 驱动真实 Storage 上传，客户端
  请求体首段已转发到真实 Storage 上游连接但请求体尚未结束时，通过现有
  `UploadSession.signal` 取消。
- 既有 8 个场景原样保留；runner 期望计数从 `8` 更新为 `9`，原 guard 入口未放宽。
- 测试进程内临时代理仅绑定 `127.0.0.1` 随机端口，只接受单一 `POST` 精确路径，并固定
  转发到当前真实 Storage origin；请求仍受固定超时、`redirect: 'error'` 与回环 origin
  校验约束。代理不伪装 Storage 成功响应，不成为开放代理。
- 代理只接受首个完全合规请求：方法、精确路径与预期 `Authorization` 全部匹配后才转发；
  额外请求一律拒绝且不覆盖当前在途句柄，避免 `close` 时漏清理。上游首段写入仅在
  `forwarded.write` 回调无错误时成立，写入失败不会冒充屏障。
- 取消后断言客户端上传回调拒绝、`setUploadId` 未调用、`uploadReferenceFor` 不产生成功
  引用；随后由 service_role 独立查询精确 fixture 路径。
- 取消断言使用严格短于固定 20s 传输超时的 5s 有界完成期限（timer 在 `finally` 清理）：
  若取消信号未真正进入 fetch，测试必须在期限处失败，不能靠固定超时冒充取消。`finally`
  同时等待未决上传结算后再关闭代理，避免未决请求逃逸。未引入故障开关或新验证框架。
- 修正 `docker/enterprise-storage/init/01-auth-helpers.sql` 过时注释：Storage 使用独立
  数据库，辅助函数是 Storage 数据库所需；SQL 行为未改。

## pi 执行结果

- 命令：`bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
- 本轮正常结果（恢复 mutation 后）：
  - `Storage 验收通过：marker=SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE exit=0 pass=9 fail=0 skip=0 todo=0`
  - 每个随机 Compose project 均由 runner 执行 `down -v` 并报告已清理。
- 取消因果 mutation 验证（同一真实 runner，临时仅移除 `guardFetch` 信号中的
  `scopeSignal`，验证后已恢复）：
  - 失败项目：`svadmin-auth-storage-smoke-924670a8-f06a-4150-b37d-3e20b955b987`；
    恢复后项目：`svadmin-auth-storage-smoke-ef8dc522-42cc-4b08-b068-41a3c4b5c9bc`。
  - 结果：`Storage 验收失败：stage=test exit=1 pass=8 fail=1 skip=0 todo=0`
  - 即 9 个用例中唯一在途取消用例失败，证明 5s 期限捕获了“取消未传播”的回归；
    恢复后同一 runner 再回到 `pass=9 fail=0 skip=0 todo=0`。
- 初版在途取消场景观测耗时约 0.1–0.4 秒；这不是最终主线程运行的独立计时证据。
- 本轮未观察到服务端残留对象；测试仍保留“若观察到残留则如实报告并按精确 fixture 路径
  清理并失败”的分支。该结果不宣称 Storage 原子回滚或所有失败均无残留。
- 实现过程中曾出现测试侧等待客户端连接 `close` 的非确定挂起，已移除该等待并改由
  `finally` 关闭代理/上游/客户端 socket；最终连续运行未再复现。该中间失败不计为证据。
- 未保留任何 `DEBUG_STORAGE_ACCEPTANCE`、`inflight-debug` 或其它临时原始日志开关。

## 窄验证

- `bunx eslint scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts --max-warnings 0`
- `bunx tsc --ignoreConfig --noEmit --target ESNext --module ESNext --moduleResolution bundler --lib ESNext,DOM --types bun --skipLibCheck scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
- `git diff --check`

## 观察边界

- 屏障只证明代理已把首个请求体数据块写入真实 Storage 上游连接，且客户端请求体尚未结束；
  不证明 Storage 已解析、提交或持久化该部分数据。
- service_role 回读证明本次 fixture 路径没有最终对象；不构成通用原子性保证。
- 历史联合验收证据 `docs/evidence/enterprise-auth-storage-acceptance-20261026.md` 保持原样，
  仍为其自身 `pass=8` 范围的记录，不被本文件改写。

## 主线程独立复核

- 独立项目：`svadmin-auth-storage-smoke-e45b6dbc-c67d-4361-9fc5-c30b9cfadbde`。
- 同一 runner 的最终结果：`exit=0 pass=9 fail=0 skip=0 todo=0`，完成标记出现。
  此结果独立于 pi 的正常运行和 mutation 运行，不合并计数。
- 已审查代理的固定上游、精确 POST 路径、预期身份和单次请求限制；写入回调先检查
  error 再放行屏障。确认最终源码已恢复 `scopeSignal`，不含临时调试日志开关。
- 已审查 5s 取消期限小于 20s 传输超时，timer 在 finally 清除，未决 outcome 在关闭
  代理前被等待收口。pi 的信号移除失败与恢复成功结果已核对，但主线程未另做一次 mutation。
- 两个 TypeScript 文件定向 ESLint（零 warning）及严格类型检查独立通过，exit 0；
  类型选项包含 `strict`、`exactOptionalPropertyTypes`、`noUncheckedIndexedAccess`、
  `noPropertyAccessFromIndexSignature`。未执行全量测试或全仓类型门禁。
- 对上述精确 project label 查询 containers、networks、volumes，三项均为空。
- 本轮不证明磁盘临时残片清理，也不证明真实浏览器 FileUpload 组件到服务端的整条链路；
  当前真实服务消费者为测试专用 UploadHandler，公共组件未修改。
