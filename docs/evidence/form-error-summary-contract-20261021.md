# FormField / ErrorSummary 反馈契约续接

## 续接约定

- parent：`enterprise-ui-plan.md` 批次二 FormField / ErrorSummary；
  source：用户继续完善企业级规范；reason：AutoForm 已有实例级错误关联和点击定位，
  但公共 ErrorSummary 默认名称、多实例和同字段多错误契约仍需验证。
- 本轮补默认可访问名称、实例级标题 ID、同字段多错误与动态翻译，
  保持现有错误条目、定位回调和静态渲染协议。
- 非目标：不重写 AutoForm 校验、FieldRenderer、字段布局、服务端错误映射或新增
  未被消费者使用的 FormField 包装器。
- Delegation Decision：medium / managed，主线程唯一 writer，Bohr 唯一只读 verifier。
- 协调工具恢复：当前环境无 `agmesh` 命令，以本文记录范围和执行状态。
- 状态：本轮本地实现、定向测试与独立复核完成；整体企业级规范仍在推进。
  不提交、推送、发布或部署。

## 验收

```gherkin
Given 表单当前没有错误
When 宿主提交后产生字段错误
Then 错误总览出现且具有可访问名称

Given 页面同时渲染多个未传 id 的错误总览
When 错误出现、清空并再次出现
Then 各自标题关联唯一且在当前组件生命周期内稳定

Given 同字段有多条错误或宿主切换语言
When 总览更新
Then 所有错误按宿主顺序显示且默认标题使用当前语言

Given 错误总览提供定位回调
When 用户激活字段错误条目
Then 仍只回调字段键，由宿主完成实例内控件聚焦

Given 错误总览没有定位回调
When 宿主渲染服务端或只读错误
Then 条目仍为静态文本，不生成无效按钮
```

## 验证

- 定向命令（在 `packages/ui` 执行）：
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/error-summary.test.svelte.ts`。
- 2026-10-21 失败基线：7/8，通过新增同字段多错误用例复现 `each_key_duplicate`。
  该基线在默认名称与翻译修复之后执行，不作为这两项的失败证据。
- 修复列表键后，同一单文件 **8/8 通过**，覆盖默认/显式名称、重复错误、实例
  ID、清空后恢复、语言切换、定位回调和只读文本。
- `git diff --check` 通过。上一轮未经执行的 4/4 声明已撤回。
- Bohr 只读复核指出测试夹具两项严格类型问题：数组索引可能为 undefined、
  可选标题显式清空。改用具名错误常量和 `definedOptions` 透传后，定向测试
  再次 8/8；第二次只读复核未发现剩余 P0-P2。未执行全仓类型检查。
- AutoForm 既有 `auto-form-accessibility.test.svelte.ts` 保持实例隔离、
  `aria-describedby` 和点击聚焦契约；本轮未改 AutoForm。
- 尚未进行跨浏览器、读屏软件和消费者发布构建验收。
  `aria-live` / `aria-atomic` 属性不证明条件挂载时一定播报。
