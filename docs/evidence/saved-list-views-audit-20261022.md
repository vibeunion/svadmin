# 共享视图（B3-02）当前状态复核

- 日期：2026-10-22
- 范围：仅复核共享视图当前状态，不新增代码。
- 模块：`packages/ui` saved-list-views
- 环境：本地仓库 `/Users/zhd/workspace/svadmin`
- 执行者：pi（本轮唯一 writer）

## 复核对象

- 验收条目：`docs/evaluations/enterprise-ui-acceptance-matrix-20261022.md` 的 B3-02 共享视图。
- 本轮直接测试：`packages/ui/src/components/saved-list-views-model.test.svelte.ts`
- 已独立复核的关联文件（本轮未复跑）：`packages/ui/src/components/saved-list-views.test.ts`

## 前轮复核（解码/契约层，独立于本轮模型层）

- 对象：`packages/ui/src/components/saved-list-views.test.ts`
- 本段为前轮对同一文件的独立运行记录，独立于本轮 `saved-list-views-model.test.svelte.ts`；两者是两次独立运行，不合并为一个命令。
- 执行命令：

```bash
cd /Users/zhd/workspace/svadmin/packages/ui
bunx vitest run --config ./vitest.config.ts src/components/saved-list-views.test.ts
```

- 结果：`Test Files 1 passed (1)`，`Tests 38 passed (38)`；**pi 自测**与**主线程独立复核**分别独立执行，均得到 38/38 通过、原始 exit code `0`；主线程另确认 `git diff --check` exit code `0`。
- 前轮运行证据覆盖：
  1. 系统/团队元数据：system source 解码为只读，`local` 远端 source 收敛为 `team`，显式 default 标记保留但不可写。
  2. 访问主体/access：access 编解码、畸形或越权 access 拒绝、不执行 getter、成员目录边界。
  3. 未知字段拒绝：未知 columns id 裁剪；filter/sorter 未知字段与畸形 JSON 失败关闭（整视图拒绝）；receipt 中 extra/secret 字段与不可静默归一化的 state 拒绝。
  4. 隔离键：偏好 key 编入 resource/provider/tenant/identity，匿名与身份互不冲突；legacy 迁移仅限默认 provider 且无 tenant。
  5. 回执关联：版本化成功/`VERSION_CONFLICT` 回执；回执与请求 view/source/expectedVersion 严格关联，过期或错配回执被拒绝；只读服务端元数据保留且返回分离视图。
- 边界：该段仅为解码/契约层与 stub/mock 本地单测证据，不证明真实共享视图服务、真实视图存储/身份作用域或真实租户授权。

## 执行命令

```bash
cd /Users/zhd/workspace/svadmin/packages/ui
bunx vitest run --config ./vitest.config.ts src/components/saved-list-views-model.test.svelte.ts
```

## 执行结果

- 框架：Vitest `v4.1.11`
- 结果：`Test Files 1 passed (1)`，`Tests 23 passed (23)`
- 原始 exit code：`0`
- 未使用 `tail` 截断输出。

## 本轮已运行用例覆盖（`saved-list-views-model.test.svelte.ts`，23 个）

1. 本地恢复与显式 URL：`explicitURL` 为 false/true 时均恢复本地视图；显式 URL 状态下 `initialSavedView`/`activeSavedViewId` 为空，不覆盖 URL 状态。
2. 保存/同名替换/删除：名称 trim 后保存，按名称大小写归一替换而不新增；保存与删除仅作用于当前 scope，另一租户 key 不被写入。
3. 存储写入失败：`localStorage.setItem` 抛错时保存不抛出，内存中保留视图，但持久化 key 为空。
4. 切换租户：切换到新租户时加载该租户视图，清空未完成名称与面板状态，且不覆盖任一租户已持久化视图。
5. 作用域未就绪：`isScopeLoaded` 为 false 时不加载、不保存；就绪后才调用 provider `list`。
6. 迟到列表结果隔离：`tenant`、`provider`、`unmount` 三种边界变化后，迟到的远端 list 结果被丢弃，不调用 `applyState`。
7. 远端默认视图优先级：`none`/`url`/`local`/`dirty`/`cleared` 五种状态下，仅 `none` 应用远端默认，其余均不应用。
8. 远端保存失败/版本冲突：失败或 `VERSION_CONFLICT` 时保留草稿名称、结束 pending、视图版本不变，且不应用状态。
9. 远端默认 opt-in 与唯一性：未 opt-in 时不自动应用；多个默认视图时按既有契约保留列表但不应用。
10. 旧租户保存回执：切换租户后旧租户保存响应被忽略，不写入当前租户视图、不清空当前草稿、不产生错误。
11. 版本化远端保存与删除：保存携带 `id`/`expectedVersion`/`source`/当前 state，回执更新版本并清空名称；应用后删除携带新版本，移除 active 持久化 key。
12. 默认视图变更重载：设置默认成功后重新拉取全部远端视图并反映 `default`。
13. 旧访问主体搜索：同一视图的旧搜索结果迟到时被新结果覆盖，loading 正确清除。
14. 脱离快照：应用远端视图时状态为独立快照，修改快照不污染已存视图；标记 dirty 清除 active id。

> 第 1、6、7、8、9 项为 `it.each` 参数化用例，测试数 23 与上表展开一致。

## pi 自测与主线程复核状态

- **pi 自测**：上述命令 23/23 通过、原始 exit code `0`；`git diff --check` 原始 exit code `0`。
- **主线程独立复核（本轮模型层）**：已完成。主线程独立执行同一 `bunx vitest run --config ./vitest.config.ts src/components/saved-list-views-model.test.svelte.ts`，得到 23/23 通过、原始 exit code `0`；主线程另确认 `git diff --check` exit code `0`，并已查看模型实现与本证据文件。
- 前轮对 `saved-list-views.test.ts` 的 38/38（pi 自测与主线程独立复核均通过、exit code `0`）仍是独立复核结论；38 与 23 是**两次独立运行**，不合并为一个命令，也不包含彼此用例。
- 模型层 23/23 仅证明模型逻辑，不代表已证明真实后端、真实共享视图服务、身份作用域或发布验收。

## 证据边界

- 仅覆盖组件/模型层的本地恢复、保存/删除、存储失败、租户切换、作用域就绪、迟到结果隔离、远端默认优先级、版本冲突、旧租户回执与脱离快照逻辑。
- 测试使用 `localStorage` 与 stub provider，不代表真实共享视图服务、真实视图存储/身份作用域、服务端默认视图冲突或真实租户授权。
- 不证明浏览器行为、读屏可用性、真实失效字段提示或发布验收。
- 本轮未修改代码、依赖或其他文件，未提交。
