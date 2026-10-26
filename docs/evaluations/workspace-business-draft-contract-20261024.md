# 工作区业务草稿续接契约

> 本地实施及独立验证已完成，见
> [业务草稿浏览器续接结果](enterprise-ui-closeout-20261024.md#业务草稿浏览器续接结果)。
> 本文后续“实施与审查中”是初版阶段记录，不是当前阻塞；oneOf 另项也已本地完成。
> example 使用内存 Provider，不能据此关闭真实身份、服务端冲突或部署验收。

- parent: enterprise-ui-unblock-contract-20261024.md
- source: 用户“继续，直到全部完成”，要求 pi 执行、主线程审查。
- reason: 适配器和受控夹具已有证据，但 example AutoForm 尚未恢复业务字段。
- orchestration: managed；pi 为唯一代码 writer，主线程检查公开契约、独立验证。
- risk: medium；只使用 example 既有内存 Provider 和注入的 sessionStorage。
- scope: AutoForm 草稿观察/恢复接口、直接回归、WorkspaceResourceEditor/
  WorkspaceTabsPage 接入以及对应浏览器用例；保留所有既有 dirty。
- non-goals: 不改 Core Provider/资源协议；不自动写业务记录，不从 DOM 采集草稿，
  不实现跨设备存储，不提交、推送、发布或部署。oneOf 为另一个本地剩余项。

## 行为契约

1. AutoForm 仅在宿主显式订阅时提供可分离的字段草稿；接口不能泄露可写的内部
   引用。未 ready、只读、未授权、身份失效时不提供可恢复的草稿。
2. 恢复通过显式实例入口触发，不走提交，不能设置主键、隐藏/不可编辑字段；
   校验整份候选后再写入，失败不得产生部分应用。恢复后仍为未提交 dirty 状态。
3. example 只白名单保存当前编辑资源的明确非敏感文本字段，存储依旧显式注入。
   记录/用户/会话作用域变化退休旧回调及候选。
4. 刷新后先读最新记录，提示可恢复草稿；只有用户确认才应用。保存的基线与
   最新记录不同则显示冲突并拒绝自动恢复；不声称有服务端原子版本保证。
5. 成功保存、明确丢弃、确认关闭清除快照；初始干净回调不得误删尚未确认草稿。
   存储失败给出可见反馈，不能假报已保存或已删除。

## 审查修订

- 草稿候选通过纯数据/字段白名单检查后，复用 Core `setValues` 原子更新；
  不逐字段写入，不提前执行必填等提交校验。空的必填字段可以恢复，
  但随后保存仍必须通过原有校验，不能因此调用 Provider。
- AutoForm 最小接口为 `draftFields`、`onDraftChange` 与显式实例方法
  `restoreDraft(candidate): boolean`。不保留初版 bindable 恢复 prop，
  避免候选因 ready/身份变化被延迟自动应用。
- example 首次仅白名单 `crm_accounts.accountName`，不从 text/email
  字段类型自动推导持久化范围。基线比较仅覆盖白名单字段，
  不声称具备整条记录或服务端原子版本冲突保证。
- 本地业务浏览器权威入口为 `e2e/workspace-tabs.spec.ts` 和
  `playwright.workspace-tabs.config.ts`，不为此复制一个独立受控页面。
- 当前是实施与审查中，不把 pi 初版 4/4 当作上述修订后的通过证据。

## 验收

```gherkin
Scenario: 刷新与确认恢复
  Given 编辑表单已加载且宿主显式启用白名单字段草稿
  When 用户修改字段后刷新页面
  Then 显示服务端原值和恢复提示，确认后显示草稿且未调用 update

Scenario: 基线变化
  Given 有待确认草稿且其基线与最新业务记录不同
  When 用户尝试恢复
  Then 拒绝覆盖最新记录并显示冲突，不调用业务写入

Scenario: 生命周期清理
  Given 当前记录有字段草稿
  When 成功保存或明确丢弃并再次刷新
  Then 不再出现旧草稿，其他标签和身份的快照不受影响

Scenario: 恢复接口保护
  Given 表单未 ready、未授权、只读、提交中或已换身份
  When 旧宿主回调或候选尝试恢复
  Then 不修改当前表单，不触发业务写入
```

## 验证边界

先运行直接相关单文件测试与定向 ESLint/diff，再运行已有工作区专属浏览器
中的对应场景。不运行全量套件；构建只在消费者必须读取 dist 时执行目标包。
本契约不是通过证明，实际计数与限制须由主线程收取退出码后补记。
