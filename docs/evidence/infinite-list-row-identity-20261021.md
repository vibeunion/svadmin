# InfiniteList 行状态归属

## 任务契约

- parent: enterprise-ui-plan.md 资源列表工作流；source: 用户持续完善目标。
- goal: 刷新重排或替换记录时，本地草稿与 DOM 跟随业务记录而非页内位置。
- scope: InfiniteList、infinite-contract 单文件和宿主、本文及路线图索引。
- risk/orchestration: medium / managed，主线程唯一 writer，Bohr 只读 verifier。
- non-goals: 不改变 Provider 分页/去重策略，不增加拖拽或服务端写入，不发布部署。

Given 列表存在本地行草稿，When 同一查询刷新后记录重排，
Then DOM 和草稿仍归原业务 ID，新记录不接收旧行状态。

Given 分页返回重叠 ID，When 加载下一页，
Then 保留 Provider 的全部记录，不触发重复 key 错误。

## 实现边界

行 key 使用资源、Provider 名称、租户缓存标识、Provider 实例标识，以及带类型的
ID 与该 ID 的出现序号。这样同名 Provider 被替换、租户切换后返回缓存数据时，
也不会复用旧作用域的行 DOM。重复 ID 本身无法证明独立业务身份，其行实例仅按
同 ID 的出现顺序对应，不宣称能识别重复记录之间的交换。

## 验证

- `packages/ui/src/components/infinite-contract.test.svelte.ts`：58/58 通过，
  包含该文件内的严格 Svelte/TypeScript 检查。
- 旧索引 key 回放中，刷新重排与记录替换两条新增测试分别失败；恢复稳定
  ID+出现序号 key 后通过，证明测试覆盖了实际 DOM 身份缺口。
- 覆盖分页重叠 ID、同查询刷新重排、记录替换、筛选替换，以及 tenant/provider
  作用域切换后相同 ID 的草稿隔离；`git diff --check` 通过。
- 不宣称重复 ID 记录之间的业务身份可推断，也不关闭跨浏览器、读屏和真实
  Provider 性能验收。
