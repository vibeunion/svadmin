# 关系字段反馈与禁用提交续接

## 任务约定

- parent：`transfer-field-feedback-20261021.md`；source：继续原 FormField 验收。
- reason：关系字段的 ID/描述已有透传，需验证实际名称与反馈更新；隐藏值未跟随
  disabled，导致可见控件禁用但原生提交仍含该字段。
- goal：修复关系单选/多选隐藏输入的 disabled，验证已有名称、说明/错误关联、
  菜单/焦点在反馈更新后保持不变；不增加冗余 aria-label。
- 非目标：改查询、权限、租户、搜索或选值算法，重做 Combobox 语义，新增 API。
- medium / managed：主线程 writer，Bohr 只读 verifier；无 agmesh，以本文记录。
- 写入：FieldRenderer relation 分支、现有字段契约测试/夹具、对应文档。
- 必要修复范围：定向测试发现说明更新导致 ComboboxField 作用域对象重算并关闭菜单，
  因此增加该组件内部的作用域字段比较；不改变查询参数、权限规则或选值算法。
- 不提交、推送、发布或部署。

## 验收

```gherkin
Given 关系字段已有外层 label
When 渲染真实 Provider 选项
Then 可见按钮具有字段名且标签关联该按钮

Given 单选或多选关系字段被禁用
When 原生表单序列化
Then 隐藏关系值不进入提交，重新启用恢复原值与字段名

Given 关系选择菜单打开且搜索框有焦点
When 宿主更新字段说明或清除错误
Then 描述同步更新但菜单不关闭、不修改选值，Escape 仍能回焦
```

## 状态

已完成本地实现和定向验证：

- 关系单选/多选隐藏值跟随 disabled，重新启用保留原值及字段名。
- 保留外层 label 命名方式，不新增重复 aria-label。
- ComboboxField 按作用域字段比较，而非对象引用比较；重置、分页缓存、
  可见缓存和延迟搜索使用一致判断。
- 说明/错误更新以及说明移除不关闭菜单、不丢失搜索焦点；Escape 返回触发按钮。
- `cd packages/ui && bun run test src/components/field-renderer-contract.test.svelte.ts`：
  最终版本 7/7 通过。
- `cd packages/ui && bun run test src/components/relation-picker.test.svelte.ts`：
  23/23 通过，仅作为独立 RelationPicker 的补充证据，不替代 ComboboxField 验收。
- `git diff --check`：通过。
- 初次直接使用 `bun test` 未加载 Vitest 的 DOM 环境，失败于 `Element is not defined`；
  已使用项目配置重跑，不将该失败归为组件回归。

未运行全量测试、全仓类型检查、真实浏览器验收；未提交、推送、发布或部署。
Bohr 独立只读复核已回收：当前限定范围未发现明确 P0/P1/P2 问题。
