# 复合选择字段原生提交续接

## 任务约定

- parent：`relation-field-feedback-20261021.md`；source：继续原企业级 FormField 规范。
- reason：树选择、级联与穿梭框有受控回调，却未由 FieldRenderer 提供原生提交值。
- goal：补齐隐藏输入，保留数值零、路径顺序和最新宿主值，disabled 时退出原生提交。
- 编码：树单选使用 `key` 标量；树多选及穿梭框沿用 multiselect 的重复 `key[]`；
  级联路径沿用结构化数组的 `key` JSON 编码，保留路径顺序与值类型。
- 非目标：不改变 AutoForm/useForm 的 Provider 提交、选值算法、服务端解码或组件独立使用 API；
  不把原生 FormData 的字符串值作为有类型的 Provider 数据。
- Delegation Decision：medium / managed；主线程唯一 writer，Bohr 唯一只读 verifier。
- 范围：FieldRenderer 对应三个分支、field-renderer-advanced 单文件测试和规范记录。
- 当前环境无 agmesh，以本文记录续接；不提交、推送、发布或部署。

### 同类缺口续接

- parent：上述复合字段提交；source：持续目标；reason：相邻 hidden 输入仍未同步 disabled。
- goal：Boolean、Images、TagsInput 和 Rate 的隐藏提交值同步 disabled，
  保留既有字段名、值、宿主更新与回调契约。
- 新增写入范围：FieldRenderer 两处分支、TagsInput/Rate 各一处 hidden 属性、
  同一 field-renderer-advanced 测试和本文。
- 风险/协作维持 medium / managed、主线程 writer、Bohr 只读 verifier。
- 验收：禁用不提交，启用保留 false/零，禁用期间宿主更新后恢复最新值，
  不因禁用切换或宿主更新调用 onchange。
- 无主题、布局、选择算法、Provider 提交或依赖变更。

## 验收

```gherkin
Given 树单选值为数字零或字符串
When 创建 FormData
Then 使用业务 key 保留标量值，空值沿用空字符串

Given 树多选或穿梭框有多个值
When 创建 FormData
Then 每个值按原顺序使用重复 key[]，空集合不提交成员

Given 级联路径包含多个层级
When 创建 FormData
Then 业务 key 提交一个 JSON 路径，空路径提交 []

Given 复合选择字段禁用且宿主更新值
When 创建 FormData 后重新启用
Then 禁用期间不提交，重新启用提交最新值且不额外触发 onchange
```

## 状态

已完成本地实现和定向验证：

- `cd packages/ui && bun run test src/components/field-renderer-advanced.test.svelte.ts`：
  12/12 通过。
- 树选择单选、多选及 `treeselect` 别名均覆盖；数字零、空值、顺序和最新受控值均保留。
- 级联路径使用单个 JSON 字段；穿梭框使用重复 `key[]` 字段。
- `cd packages/ui && bun run test src/components/hierarchical-field-feedback.test.svelte.ts src/components/transfer-field-feedback.test.svelte.ts src/components/field-renderer-contract.test.svelte.ts`：33/33 通过。
- `git diff --check`：通过。
- Bohr 只读复核：当前范围无 P0/P1/P2 问题。

以上 12/12 与复核结论对应树、级联、穿梭框阶段。
后续 hidden disabled 修复验证命令：
`cd packages/ui && bun run test src/components/field-renderer-advanced.test.svelte.ts src/components/tags-input.test.svelte.ts`。
字段文件最终 17/17，Tags 既有文件 3/3，合计 20/20；新增用例覆盖
Boolean、Images、Tags、Rate 及 rating 别名的禁用提交、false/零和最新值恢复。
Bohr 第二阶段独立只读复核确认四处 hidden 属性和五个入口的回归断言自洽，
未发现明确 P0/P1/P2 问题；最终 `git diff --check` 通过。

未进行真实浏览器、读屏、服务端解码、全仓类型检查、消费者构建或发布；这些仍不由本地 FormData 契约推断完成。
