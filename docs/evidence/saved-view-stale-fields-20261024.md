# 保存视图失效字段裁剪与提示生命周期（B3-02）

## 续接契约

- parent: `enterprise-ui-closeout-20261024.md`
- source: 用户继续
- reason: B3-02 裁剪提示本地缺口
- orchestration: managed，medium；唯一 writer，主线程只读审查。
- goal: 在模型层完成保存视图失效字段裁剪、按视图身份保存提示元数据，以及删除或覆盖单视图时的精确提示清理。
- non-goals: 不新增 DOM/浏览器夹具，不验证真实 Provider、RBAC、租户服务或后端版本语义；不提交、推送、发布或部署。

## 行为契约

```gherkin
Scenario: 应用视图时裁剪失效字段
  Given 已保存视图包含当前资源不存在的列
  When 模型解码并应用该视图
  Then 应用载荷只包含当前资源允许的列
  And 持久化原文不被改写

Scenario: 本地删除或覆盖只清理对应提示
  Given 两个本地视图各自记录了不同的失效字段
  When 删除其中一个视图或按同名覆盖其中一个视图
  Then 只清除该视图身份对应的提示
  And 其他视图的提示继续展示
  And 覆盖后的持久化载荷不包含已失效字段

Scenario: 远端删除或覆盖只清理对应提示
  Given 远端列表返回两个视图且各自包含不同的失效字段
  When 删除一个远端视图或按同名保存覆盖其中一个视图
  Then 应用载荷和保存载荷均不包含失效字段
  And 只清除该视图身份对应的提示
  And 其他远端视图的提示继续展示

Scenario: 身份去重与作用域隔离
  Given 本地和远端存在相同 id 的视图
  When 模型合并可用视图
  Then 远端视图生效且被遮蔽的本地视图提示不外泄
  When 切换到另一个作用域并重新加载远端列表
  Then 旧作用域的本地和远端提示均被清空
```

## 实现要点

- `saved-list-views.ts`：解码列可见性和列顺序时记录被裁剪列；`SavedListViewDecodeReport` 只用于本地读取和远端列表解码。视图 id 允许任意合法字符串（包括 `__proto__`），写入按视图汇总的裁剪记录时使用 `Object.defineProperty` 写为可枚举自身数据属性，避免触发原型继承 setter 导致记录缺失，同时保持 `Record<string, string[]>` 接口不变。
- `saved-list-views.ts`：保存/删除回执解码保持原有严格语义，遇到未知列直接拒绝，不参与裁剪 `report`，也不与列表解码共用裁剪结果。
- `saved-list-views.svelte.ts`：本地与远端提示分别按视图 id 保存；删除或成功覆盖视图后只清除该 id 的提示；合并展示时只统计当前可见视图，避免被远端同 id 遮蔽的本地提示泄漏。
- `saved-list-views-model.test.svelte.ts`：统一通过 `staleSavedViewColumns` 断言，并覆盖本地/远端应用载荷、保存载荷、精确清理、身份去重和作用域切换；新增合法 id `__proto__` 的裁剪提示、应用载荷与删除清理回归。
- `AutoTable.svelte` 与 `packages/core/src/i18n.svelte.ts`：DOM 提示文案和状态输出为本轮新增，尚未做 DOM 验收，不是已有提示。

## 验证

独立复核（主线程只读复核，未跑全套）：

```text
模型测试：28 passed (28)，3.36s
解码测试：38 passed (38)，1.86s
exit 0
```

本轮新增 `__proto__` 回归后的 writer 单文件自测（仅运行相关模型测试，未跑全套）：

```text
$ bun run --cwd packages/ui test -- src/components/saved-list-views-model.test.svelte.ts
Test Files  1 passed (1)
Tests       29 passed (29)
Duration    3.39s
exit 0
```

定向静态检查：

```text
$ bunx eslint packages/ui/src/components/saved-list-views.ts \
    packages/ui/src/components/saved-list-views.svelte.ts \
    packages/ui/src/components/AutoTable.svelte \
    packages/ui/src/components/saved-list-views-model.test.svelte.ts \
    packages/core/src/i18n.svelte.ts
exit 0（无输出）

$ git diff --check -- <上述文件>
exit 0
```

## 边界

- 特殊 ID 修复后，主线程独立复跑模型单文件 **29/29**，exit `0`，3.26s；
  `git diff --check` 通过。此前 28/28 为修复前阶段证据，不替代当前结果。
- DOM 提示为本轮新增；本记录完成时尚未验收，后续已补三引擎两视口 **18/18**，
  见 `saved-view-stale-fields-browser-20261024.md`，不据此扩大本模型证据的覆盖范围。
- 本轮只完成模型层和 `__proto__` 特殊 id 缺陷修复；结论限于相关单文件测试与定向静态检查。
- 远端行为由受控 Provider mock 验证，不代表真实服务端版本冲突、权限过滤或跨租户数据隔离已验收。
- 未执行全量 typecheck、全量测试或发布流程；结论限于上述单文件回归和定向静态检查。
