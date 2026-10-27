# 本地 GoTrue 会话 → PostgREST → PostgreSQL 租户 CRUD 验收证据

- 契约：`docs/evaluations/enterprise-postgrest-tenant-acceptance-contract-20261026.md`
- 工作树：`enterprise-storage-acceptance`
- 状态：**本地运行时验收与定向类型检查通过，整体 PARTIAL**。pi 实施期间曾被磁盘
  ENOSPC 与 OrbStack 停机中断；其后主线程恢复环境并独立复验，后续类型边界修复
  也已独立复验通过，结果见末节。历史失败记录不改写为成功。
- 结论：最终 `pass=12 fail=0 skip=0 todo=0`、exit 0；不等同生产 RBAC、业务流程、
  发布或完整类型门禁通过。

## 历史运行（修复前）

- 上一轮运行时结果为 `pass=11 fail=1 skip=0 todo=0`。
- 唯一失败为 PostgREST `PGRST106`，即租户 schema/暴露配置未通过，而不是 tenant CRUD
  ／RLS 断言成功。
- 该结果只证明原有 11 项通过、新增第 12 项失败；不能作为本轮修复后的验收证据。

## 本轮代码收尾

1. `scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`
   - 删除失败分支中的 `console.error(output.slice(-6000))`，不再回显原始测试/服务日志。
   - 测试失败仅输出固定阶段、退出码与汇总计数；避免 token/password 泄露。
   - 运行 fixture 测试时增加 `--tsconfig-override=scripts/fixtures/enterprise-runtime/tsconfig.json`。
2. 新增 `scripts/fixtures/enterprise-runtime/tsconfig.json`
   - 仅本 fixture 使用，不改根 `tsconfig` 或全局配置。
   - `paths` 精确指向当前工作树的 `core` 根、`core/schema`、`core/options`、
     `core/audit`（supabase auth-provider 的传递依赖）与 `refine-adapter`。
   - 共享 `node_modules` 仍是指向原工作区的链接，因此不改共享依赖，只隔离测试源码解析。
3. `scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`
   - 第 12 项开头用 `import.meta.resolve` 实际断言五个关键直接/传递模块均解析到当前
     工作树 `packages/`，防止回落到原工作区。
   - 新增“当前租户本人把 row 的 `tenant_id` 改为另一租户被拒绝，独立会话读回未变”。
   - `user_metadata` 伪造后，除 read/insert 外再检查 update/delete 均拒绝，并独立读回
     A 记录未变；同时验证 B 对自己租户记录仍可 update/read。
   - 刷新 token 的断言改为布尔比较，失败时不回显 token。
   - 保留原 11 项全部断言与第 12 项，未改生产 API，runner 期望仍为 12 项。
4. 契约文案
   - 更正第 11 项为 AutoForm/FileUploadField 浏览器场景；手签 JWT 证据来自独立的
     `supabase-rbac.test.ts`，不属于原 11 项。
   - 明确共享 `node_modules` 可能读取原工作区，但本轮不修改原工作区与共享依赖；
     测试源通过 fixture `tsconfig` paths 显式隔离。

## 本轮窄检查

- 模块解析（实际命令）：
  `bun --tsconfig-override=scripts/fixtures/enterprise-runtime/tsconfig.json -e ...`
  - `@svadmin/core` → `.../enterprise-storage-acceptance/svadmin/packages/core/src/index.ts`
  - `@svadmin/core/schema` → `.../packages/core/src/schema.ts`
  - `@svadmin/core/options` → `.../packages/core/src/defined-options.ts`
  - `@svadmin/core/audit` → `.../packages/core/src/audit.ts`
  - `@svadmin/refine-adapter` → `.../packages/refine-adapter/src/index.ts`
  - 均位于当前隔离工作树，未解析到 `/Users/zhd/workspace/svadmin`。
- ESLint：`bunx eslint scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts
  scripts/fixtures/enterprise-runtime/storage-acceptance.test.ts`，无输出。
- TypeScript 窄检查：`node node_modules/typescript/bin/tsc -p
  scripts/fixtures/enterprise-runtime/tsconfig.json --pretty false`。
  - 变更 fixture 文件无诊断。
  - 仍有未修改生产文件既有错误 `packages/supabase/src/data-provider.ts(64,58)
    TS2345: unknown → SupabaseClient`；本轮未改生产 API，因此不把它伪报为通过。
- 仓库约束：`git diff --check` 通过。

## pi 收尾时未执行（历史状态）

- 未启动 OrbStack / Docker / compose，未运行 `storage-acceptance.run.ts` 或真实
  `bun test` acceptance。
- 未验证修复后的 PostgREST schema 暴露、真实 GoTrue 会话与租户 RLS 运行时结果。
- 未清理或变更原工作区与共享 `node_modules`。

## 主线程环境恢复与最终复验

- pi 首次进程以 `ENOSPC: no space left on device, write` 退出，主线程当时测得
  根卷可用约 106 MiB，OrbStack 状态为 Stopped。随后可用空间恢复约 3.8 GiB；
  主线程没有删除其他项目文件、缓存、镜像或执行全局 prune。
- 主线程执行 `orb start` 恢复环境，只对中断项目
  `svadmin-auth-storage-smoke-f2416eca-82f4-45c8-97bf-4d9a1f96dffb` 执行
  `compose down -v --remove-orphans`。清理使用无凭据意义的插值占位值，不重建服务。
  后续精确 project label 的容器（含停止项）、network、volume 查询全部为空。
- pi 已完成代码修正后，主线程运行
  `bun scripts/fixtures/enterprise-runtime/storage-acceptance.run.ts`：
  **12 pass / 0 fail / 0 skip / 0 todo，exit 0**，完成标记
  `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 出现。此结果是主线程独立运行，
  不补写成 pi 自测成功；原 11 项与新增 1 项在同一测试文件内运行。
- 最终项目为 `svadmin-auth-storage-smoke-783a30f7-eaed-484b-b5ee-0340e3d8a7ea`。
  runner 退出后主线程按该精确 label 分别查询容器（含停止项）、network、volume，
  三项均 exit 0 且输出为空。
- 新增第 12 项使用当前工作树 DataProvider/Core/refine-adapter、真实 GoTrue 会话、
  PostgREST 与 PostgreSQL。证明匿名拒绝、A/B 租户隔离、create/update 独立会话
  持久化读回、跨租户 get/insert/update/delete 拒绝、本人转移行租户被拒绝、
  user_metadata 伪造后仍拒绝跨租户操作且自身租户仍可读写、delete 后独立读取不存在。
- 主线程定向 ESLint（runner/test，`--max-warnings 0`）exit 0，
  `git diff --check` exit 0。主线程独立运行上述 fixture TypeScript 命令仍 exit 2，
  唯一输出为未修改的 `packages/supabase/src/data-provider.ts:64` 的 TS2345。
  这是当前待处理的局部类型边界问题，不宣称类型门禁通过，也未过滤诊断冒充绿色。

## 证据边界

- RLS 与租户 app_metadata 属于本地可丢弃 fixture 契约，不是生产租户策略。
  所有普通 CRUD 经过 `createSupabaseDataProvider`，service role 只用于可信租户种子；
  不证明生产字段权限、即时撤权、JWT 生命周期一致性或真实业务审批/版本服务。
- 本轮新增的是 Node 侧服务链路，不是资源工作台/AutoForm 到真实业务数据库的浏览器
  端到端验收；旧 AutoForm 场景仍只捕获 JSON。不证明读屏、部署或发布。
- 未修改产品组件或公共 API，未提交、推送、发布或部署；共享依赖只读，原工作区未修改。

## Follow-up：Refine 工厂类型边界修复（pi 记录）

- 历史保留：上文记录的 `data-provider.ts:64` TS2345、定向 TypeScript exit 2 是
  修复前诊断，不改写为已通过；修复动作见
  `docs/evaluations/enterprise-supabase-refine-type-boundary-contract-20261026.md`。
- 修复内容：`createSupabaseDataProvider` 保留公开 `client: unknown`、可调用检查与
  静态 SPA import；Refine 第三方工厂改为 `Reflect.apply` 动态调用，结果显式
  `unknown` 后交给既有 `createRefineAdapter` 运行时验证，未使用
  `as SupabaseClient`、`any`、`@ts-ignore`，未改第三方声明或严格选项。
- 新增回归：工厂只收到一次原始 client 引用；非对象 client 在工厂前拒绝；工厂返回
  非对象或缺少必需方法时仍由 adapter 拒绝；合法返回正常创建。原有方法校验与响应
  解码断言未改。
- pi 本轮命令与退出码：
  - `bun test --tsconfig-override=scripts/fixtures/enterprise-runtime/tsconfig.json packages/supabase/src/response-validation.test.ts` → 12 pass / 0 fail，exit 0。
  - `node node_modules/typescript/bin/tsc -p scripts/fixtures/enterprise-runtime/tsconfig.json --pretty false` → exit 0，无诊断。
  - `bunx eslint packages/supabase/src/data-provider.ts packages/supabase/src/response-validation.test.ts --max-warnings 0` → exit 0。
  - `git diff --check` → exit 0。
- 本轮未启动 Docker／OrbStack，未运行 runtime runner；主线程最终独立 12 项运行时
  复跑与独立类型检查仍待执行，故整体企业级目标保持 PARTIAL。

## 类型边界修复后的主线程最终复验

- 上节“待执行”是 pi 收尾时的状态；主线程已在最终代码上独立完成以下复验。
  不将上轮修复前的运行时 12/12 冒充本轮结果，也不合并单测与服务测试计数。
- 直接回归：
  `bun test --tsconfig-override=scripts/fixtures/enterprise-runtime/tsconfig.json packages/supabase/src/response-validation.test.ts`
  为 **12 pass / 0 fail、96 assertions、exit 0**。工厂原引用只传一次，非对象在工厂前
  被拒绝，无效工厂结果由适配器拒绝；合法 provider 实际执行 getOne 返回预期数据。
- fixture 类型检查：
  `node node_modules/typescript/bin/tsc -p scripts/fixtures/enterprise-runtime/tsconfig.json --pretty false`
  **exit 0，无诊断**。原 `data-provider.ts:64` TS2345 已消除；该命令不等同全仓类型门禁。
- 新增测试严格编译：以 `node node_modules/@typescript/native/bin/tsc --ignoreConfig
  --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess
  --noPropertyAccessFromIndexSignature --moduleResolution bundler --module esnext
  --target esnext --skipLibCheck --types bun,node` 指定
  `packages/supabase/src/response-validation.test.ts`，**exit 0，无诊断**。
  主线程中途发现的 TS2532 下标访问诊断已由 pi 改为可选访问，没有使用非空断言。
- 生产文件与该单测的 ESLint `--max-warnings 0` **exit 0**；`git diff --check` **exit 0**。
- 同一真实服务 runner 再次独立执行：**12 pass / 0 fail / 0 skip / 0 todo、exit 0**，
  完成标记 `SVADMIN_AUTH_STORAGE_ACCEPTANCE_COMPLETE` 出现。本轮项目为
  `svadmin-auth-storage-smoke-e96c429c-7129-4363-bd2f-753e762e553f`；退出后按其精确 label
  查询容器（含已停止）、network、volume，三项均 exit 0 且输出为空。
- 生产修复只涉及 `data-provider.ts` 工厂调用边界；公开 unknown 输入、静态 import、
  可调用检查与适配器响应校验保留，不新增公共 API，不修改第三方声明或编译选项。
  未提交、推送、发布或部署；真实业务浏览器闭环、生产权限与读屏等原范围仍需后续验收。

### 追加修正：严格单文件 TypeScript 诊断

- 主线程严格单文件检查发现 `response-validation.test.ts:80` 的 TS2532
  （`noUncheckedIndexedAccess` 下 `refineFactoryCalls[0]` 可能为 `undefined`）。
- 修正：改为 `refineFactoryCalls[0]?.[0]` 安全可选访问，未使用非空断言；
  合法 provider 不再只断言 `toBeDefined()`，而是实际执行
  `await provider.getOne({ resource: 'posts', id: 1 })` 并核对适配器返回值，
  随后仍断言工厂调用次数只有一次，确保 async 测试真实消费适配器。
- `data-provider.ts` 新增的两行重要注释改为简体中文；既有英文注释未改，生产逻辑未扩大。
- 本轮 pi 追加命令与退出码：
  - `bun test --tsconfig-override=scripts/fixtures/enterprise-runtime/tsconfig.json packages/supabase/src/response-validation.test.ts` → 12 pass / 0 fail，exit 0。
  - `node node_modules/@typescript/native/bin/tsc -p scripts/fixtures/enterprise-runtime/tsconfig.json --pretty false` → exit 0，无诊断。
  - `node node_modules/@typescript/native/bin/tsc --ignoreConfig --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --noPropertyAccessFromIndexSignature --moduleResolution bundler --module esnext --target esnext --skipLibCheck --types bun,node packages/supabase/src/response-validation.test.ts` → exit 0，无诊断。
  - `bunx eslint packages/supabase/src/data-provider.ts packages/supabase/src/response-validation.test.ts --max-warnings 0` → exit 0。
  - `git diff --check` → exit 0。
- 本轮未跑 Docker、未改 fixture tsconfig、未提交；主线程真实 12 项与独立严格检查仍待执行。
