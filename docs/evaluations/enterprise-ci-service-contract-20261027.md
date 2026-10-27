# CI 真实服务验收接入契约

- parent: `enterprise-storage-contract-20261026.md`
- source: 用户明确后续验收环境使用 CI；允许在现有隔离工作树内接入最小真实服务验收，但保留现有 dirty，不提交、不推送、不触发远程。
- reason: 本地 OrbStack Storage 验收已存在，但缺少在 Ubuntu CI 的 default Docker context 上以真实 14 项、三浏览器引擎执行的入口；本契约只补齐该 CI 接入，不扩大产品或验收范围。
- orchestration/risk: managed / medium；pi 唯一实施 writer，主线程独立 review/verifier。无 coordination.json / agmesh CLI，以本契约记录范围与执行状态。
- workspace: 隔离工作树 `enterprise-storage-acceptance`，基线 `72ce9847`。现有 dirty/untracked 文件保持原状，不清理、不提交。
- status: 已实施本地静态/参数验证；**CI workflow 未执行**，未触发 GitHub Actions，未推送，未产生远程运行证据。

## Scope

只允许并实际修改：

1. `scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
   - 新增显式 `SVADMIN_STORAGE_DOCKER_CONTEXT`：本地缺省仍为 `orbstack`，CI 传 `default`；仅允许这两个值，任意其他已命名 context（含远端 context）在调用 Docker 前失败。
   - 子进程环境移除 `DOCKER_HOST`、`DOCKER_CONTEXT`、`DOCKER_TLS_VERIFY`、`DOCKER_CERT_PATH`，只允许 `--context` 选择引擎，不能继承远端 Docker。
   - 保留真实 14 项断言、三引擎不可 skip、`up ... --pull never`、随机 project、随机凭据、loopback 动态端口与 finally `down -v`。
2. `docker/enterprise-storage/compose.yml`
   - 仅更新注释，说明同一 compose 同时服务本地 OrbStack 与 CI default context；CI 独立步骤 pull 公开镜像，runner 仍 `--pull never`。
3. 新建 `.github/workflows/enterprise-services.yml`
   - PR 路径触发 + `workflow_dispatch`；只读 `contents: read`；唯一 concurrency；45 分钟固定超时。
   - 路径过滤使用 `packages/**` 覆盖所有真实包依赖，并含 `scripts/fixtures/enterprise-runtime/**`、`scripts/fixtures/enterprise-ui/**`、compose、lockfile 与 workflow 自身。
   - Ubuntu runner 使用 `default` Docker context，独立步骤 pull 公开镜像；pull 步显式 `unset DOCKER_HOST DOCKER_CONTEXT DOCKER_TLS_VERIFY DOCKER_CERT_PATH`，与 runner 一致。
   - `bun install --frozen-lockfile`，Playwright 安装 chromium/firefox/webkit 及系统依赖。
   - 运行真实 storage runner；日志经 JWT 模式脱敏后写 artifact，附 commit SHA。
   - artifact 只含 runner 日志与 SHA，不含浏览器原始 trace、服务原始日志或 secret。
4. 本契约文件。

未新增 mock、镜像测试、通用 CI 框架、部署流程、secret 或生产配置。

## CI 依赖与命令

Workflow 关键命令：

```bash
docker --context default pull postgres:18
docker --context default pull public.ecr.aws/supabase/storage-api:v1.80.0
docker --context default pull public.ecr.aws/supabase/gotrue:v2.197.0
docker --context default pull postgrest/postgrest:v12.2.12
bun install --frozen-lockfile
bun run playwright install --with-deps chromium firefox webkit
SVADMIN_STORAGE_DOCKER_CONTEXT=default \
  bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts
```

运行依赖：

- Ubuntu GitHub runner 自带 Docker Engine 与 `default` context；workflow 的 pull 步显式移除 `DOCKER_HOST`、`DOCKER_CONTEXT`、`DOCKER_TLS_VERIFY`、`DOCKER_CERT_PATH`，与 runner 一致。
- `bun@1.4.2` 与 `node@26`，版本与现有 `enterprise-ui.yml` 对齐。
- Playwright 三引擎必须同时可用；测试 helper 固定返回 `['chromium', 'firefox', 'webkit']`，runner 要求 `pass=14 fail=0 skip=0 todo=0`。
- 公开服务镜像：PostgreSQL 18、Supabase Storage API v1.80.0、GoTrue v2.197.0、PostgREST v12.2.12。
- runner 内部构建 `packages/ui` 的最小 Tailwind CSS，并启动真实 GoTrue/Storage/PostgREST compose。

## 安全与生命周期

- CI 不配置生产 secret；所有数据库口令、JWT secret、anon/service key 均在 runner 进程内随机生成，只存在于进程环境，不落盘。
- 普通用户通过真实 GoTrue 注册；测试子进程不接收 JWT 签名 secret 或数据库口令。
- compose 端口只绑定 `127.0.0.1` 动态高位端口，测试入口拒绝非严格 loopback URL。
- 随机 Compose project 隔离；正常、失败与信号路径都执行本次 project 的 `down -v`，清理失败非零退出。
- runner 失败只输出固定阶段、退出码与汇总计数，不回显原始服务/测试日志。
- artifact 保留脱敏 runner 日志与 commit SHA，保留 7 天；不上传浏览器 trace、服务日志、环境文件或 secret。

## 验证边界

本轮仅执行：

- runner 单文件 Docker context 参数分支静态验证（仅接受 default/orbstack；`bad context` 等任意其他命名 context 在调用 Docker 前失败）；
- 新 workflow YAML 结构解析与关键字段静态检查；
- `git diff --check`。

明确禁止并**未执行**：全量测试、全量 build、真实 compose 启动、Playwright 浏览器安装/运行、GitHub Actions 远程触发。

## 风险与未完成项

- **CI 未执行**：workflow 的 Ubuntu/default Docker、公开镜像拉取、三引擎系统依赖与 45 分钟超时仍未经远程真实运行证明。
- runner 的本地默认仍为 `orbstack`；CI 必须显式传 `SVADMIN_STORAGE_DOCKER_CONTEXT=default`，否则会在无 OrbStack context 的 runner 上失败，这是有意的显式选择。任意其他已命名 context 会被拒绝，避免误连远端 Docker。
- Playwright 三引擎与真实浏览器上传场景在 CI 上可能受 runner 资源与系统依赖影响；只有远程运行通过后才能称为 CI 验收证据。
- workflow 路径过滤使用 `packages/**` 覆盖包依赖，并加入 `scripts/fixtures/enterprise-ui/**`；仍未列出的非包路径变更可能不触发。
- 本契约不代表合并、发布、部署、生产验收或总体企业级目标完成；总体状态仍为 PARTIAL。

## 验收条件

```gherkin
Scenario: CI 显式选择本地 Docker 引擎
  Given Ubuntu CI 不提供 OrbStack 且环境可能残留 DOCKER_HOST
  When workflow 传入 SVADMIN_STORAGE_DOCKER_CONTEXT=default
  Then runner 只以 default context 调用 compose
  And runner 不继承 DOCKER_HOST 等远端 Docker 变量
  And 任意其他已命名 context 在调用 Docker 前被拒绝
  And 本地不传参数时仍默认使用 orbstack

Scenario: CI 在独立步骤准备镜像但 runner 不联网拉取
  Given workflow 已显式 pull 公开依赖镜像
  When runner 启动真实服务栈
  Then compose up 仍使用 --pull never
  And 不使用生产 secret 或固定端口

Scenario: 真实 14 项与三引擎不可 skip
  Given Playwright chromium、firefox、webkit 及系统依赖已安装
  When runner 执行 storage-acceptance
  Then 只接受 pass=14 fail=0 skip=0 todo=0
  And chromium/firefox/webkit 全部真实执行

Scenario: PR 路径触发与手动触发
  Given workflow 只读 contents 权限且只有一个 concurrency
  When 相关路径 PR 变更或手动 dispatch
  Then 固定超时内执行同一真实服务验收
  And artifact 只含脱敏 runner 日志与 commit SHA
```
