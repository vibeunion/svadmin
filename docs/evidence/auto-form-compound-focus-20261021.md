# AutoForm 复合字段错误定位续接

## 任务约定

- parent：`compound-field-native-contract-20261021.md`；source：继续完成企业级表单规范。
- reason：自动首错定位仅查询 aria-invalid，漏掉使用 data-invalid 或分组语义的字段；
  总览定位仅尝试一个候选控件，可能停在不能聚焦的隐藏/禁用控件上。
- goal：以当前已渲染字段及 form.errors 定位错误，按实际 DOM 顺序聚焦首个可操作
  错误字段；总览使用相同候选选择逻辑，保持多实例隔离。
- 非目标：不改校验、Provider 写入、错误摘要顺序、各控件公开 API、布局或原生提交。
- Delegation Decision：medium / managed；主线程唯一 writer，Bohr 只读 verifier。
- 范围：AutoForm 内部聚焦逻辑、新专用测试夹具与单文件测试、规范记录。
- 无 agmesh 命令，本文记录续接；不提交、推送、发布或部署。

## 验收

```gherkin
Given 首个无效字段是数组、穿梭框或树选择等复合控件
When 用户提交表单
Then 焦点进入该字段的可操作控件，Provider 不发生写入

Given 分组布局改变了字段的实际显示顺序
When 表单有多个错误
Then 自动聚焦按页面顺序，错误总览继续按原有字段定义顺序展示

Given 错误字段内有隐藏、禁用或 inert 控件
When 自动定位或激活错误总览
Then 跳过不可操作候选；无可操作候选时自动定位继续尝试后续错误字段

Given 同页渲染相同资源的两个表单
When 提交或点击其中一个表单的错误总览
Then 焦点只落入该表单，不被另一个实例或嵌套字段的同名 key 截获
```

## 状态

已完成本地实现和定向验证：

- `cd packages/ui && bun run test src/components/auto-form-compound-focus.test.svelte.ts`：
  14/14 通过。
- 覆盖数组、Transfer、TreeSelect/treeselect、Cascader、多选、Images、Tags、
  分组显示顺序、两个同资源表单、嵌套同名字段、hidden/disabled/inert、
  `aria-disabled`、disabled fieldset 以及首个 legend 例外。
- `AutoForm` 现在按实际 DOM 中的顶层字段容器和 `form.errors` 找首个可操作控件；
  不再依赖单一 `aria-invalid` 属性。错误总览使用同一候选过滤规则。
- 相邻回归：
  `cd packages/ui && bun run test src/components/auto-form-accessibility.test.svelte.ts src/components/form-contract.test.svelte.ts`
  148/148 通过。
- `git diff --check`：通过。
- Bohr 独立只读复核：当前最终差异未发现明确 P0/P1/P2，确认分组/非分组、
  嵌套同名键、实例隔离及 fieldset 第一 legend 例外。
- 首次夹具使用无约束 Schema 被项目契约拒绝，改为封闭 Schema 后
  11/13；补显式 fieldset 祖先处理与第一 legend 回归后最终 14/14。
  初次 Schema 错误不是产品行为失败证据。
- 相邻回归中 Vite 报 svelte2tsx 缺少 source map 警告；进程正常退出且
  148/148 通过，未修改依赖以消除该警告。

未进行真实浏览器、读屏、全仓类型检查、消费者构建或发布；DOM 聚焦契约不能替代这些验收。
