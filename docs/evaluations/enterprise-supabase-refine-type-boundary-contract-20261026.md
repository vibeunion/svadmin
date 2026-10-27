# Supabase DataProvider Refine 工厂类型边界窄修复契约

- parent: `docs/evaluations/enterprise-postgrest-tenant-acceptance-contract-20261026.md`
- source: 主线程在真实 GoTrue/PostgREST/PostgreSQL 验收中独立复跑 runtime
  `12/12`、exit 0 后，执行
  `node node_modules/typescript/bin/tsc -p scripts/fixtures/enterprise-runtime/tsconfig.json --pretty false`
  仍 exit 2，唯一诊断为 `packages/supabase/src/data-provider.ts:64` 的
  TS2345：`unknown` 传给 `@refinedev/supabase` 工厂期望的 `SupabaseClient`。
- reason: 公开边界必须是 `client: unknown` 并依赖运行时对象校验，但静态工厂签名
  要求具体 SDK 类型；直接用公开参数调用会把未知输入伪装成 SDK 类型。必须沿用仓库
  已存在的 `Reflect.apply` 动态 SDK 边界模式，在不收窄公开类型、不添加类型断言／
  忽略、不修改第三方声明、不降低严格选项的前提下消除诊断。
- orchestration/risk/ownership: managed / medium；pi 是唯一 writer，主线程负责
  review、独立类型检查与最终 runtime 复跑。工作树为隔离的
  `enterprise-storage-acceptance`，保留全部既有改动；不写原工作区、不提交、不发布。
- scope: 仅限 `packages/supabase/src/data-provider.ts`、直接
  `packages/supabase/src/response-validation.test.ts` 及必要文档。工厂调用改为
  `Reflect.apply` 动态边界，工厂结果显式 `unknown` 后交给既有
  `createRefineAdapter` 运行时验证；保留静态 import 以支持 bundled SPA。
- regression: 在现有 response-validation 测试中新增窄回归：工厂只收到一次原始
  client 引用；非对象 client 在工厂前被拒绝；工厂返回非对象／缺少必需方法时仍由
  adapter 拒绝；合法返回正常创建 provider。原有 SDK 方法校验与响应解码断言不改。
- non-goals: 不把公开 `client: unknown` 改窄；不使用 `as SupabaseClient`、`any`、
  `@ts-ignore`；不改第三方声明或严格编译选项；不改 fixture 既有断言；不做整仓
  类型重写；不跑 Docker／runtime；不提交、推送、发布或部署。
- verification: pi 只运行 `bun test --tsconfig-override=scripts/fixtures/enterprise-runtime/tsconfig.json
  packages/supabase/src/response-validation.test.ts`、目标 TypeScript 命令、目标
  ESLint、`git diff --check`；运行时 12 项由主线程最终独立复跑。
- evidence: `docs/evidence/enterprise-postgrest-tenant-acceptance-20261026.md`；
  旧 TS2345 诊断保留为修复前历史，并标注后续修复。

## 执行状态

- pi 窄修复与验证完成：单文件测试 12 pass／0 fail（exit 0），fixture TypeScript
  exit 0，严格单文件测试 TypeScript exit 0，目标 ESLint exit 0，
  `git diff --check` exit 0。主线程已对最终实现独立复跑直接单测 12/12（96 assertions）、
  同一 runtime runner 12/12（零 skip/todo）、fixture TypeScript 与严格单文件 TypeScript、
  目标 ESLint/diff，全部 exit 0；精确项目容器/network/volume 查询为空。
  本契约的局部修复与验收完成，不等同整体企业目标、全仓门禁或发布完成。
