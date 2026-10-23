# 上传字段反馈续接

## 任务约定

- parent：`form-field-description-20261021.md`；source：用户要求继续完成既有规范。
- reason：上传字段没有把说明、错误状态传递到原生输入和可见选择入口；
  禁用入口的点击/键盘仍调用文件选择器。
- goal：新增可选 ariaLabel、invalid、describedby，关联原生 input 和可见入口；
  FieldRenderer 透传字段名、说明与错误；禁用时不打开文件选择器。
- 非目标：上传传输、队列、重试、取消、multipart、布局、其他复合控件及服务端验收。
- medium / managed；当前线程唯一 writer，Bohr 唯一只读 verifier。
- 写入：FileUpload、FieldRenderer、单一定向测试文件和对应规范/证据。
- 无 agmesh 命令，本文记录续接；不提交、推送、发布或部署。

## 验收

```gherkin
Given 上传字段有名称、说明与校验错误
When 字段渲染
Then 两入口均拥有字段名与描述关联，input 使用 aria-invalid，可见入口使用 data-invalid

Given 宿主清除校验错误或说明
When 字段更新
Then 两个入口同步移除过期属性且不改写上传队列

Given 上传入口禁用
When 点击或按 Enter/Space
Then 不调用文件选择器

Given 同页有两个上传字段实例
When 读取描述关联
Then 每个入口仅引用本实例说明
```

## 执行状态

- 定向命令（在 `packages/ui`）：
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/file-upload-field-feedback.test.svelte.ts`。
- 失败基线 3/8：两条字段语义用例和三种禁用入口用例失败。
- 首次修复 8/8，但 Svelte 警告 role=button 不支持 aria-invalid；随后仅在原生
  input 保留该属性，可见入口使用 data-invalid。未把有警告的运行作为最终验收。
- 补充原生提交不变及动态禁用恢复后 **10/10**，本次无该 ARIA 警告。
- Bohr 独立只读复核未发现明确 P0/P1/P2；按建议补强“撤销错误但保留说明”、
  可见按钮无 aria-invalid、已选文件与回调次数不变，最终再次 **10/10**。
- `git diff --check` 通过；本轮本地实现与定向验证完成，整体目标仍未完成。
- 仅本地 DOM/事件与原生提交回归；未进行真实浏览器、读屏、跨浏览器、
  全仓类型检查、消费者构建或服务端上传验收。
