# 嵌套数组原生提交契约

## 续接约定

- parent：`toolbar-upload-lifecycle-20261021.md`；source：用户继续完善企业表单。
- reason：ArrayField 内部字段带原生 name，外层数组 JSON 与内部字段重复提交，
  多行或其他同名顶层字段会发生歧义。
- goal：默认顶层字段保持兼容，嵌套数组仅由外层 JSON 负责原生提交；
  内部字段继续受控编辑、原生校验、无障碍关联和 disabled 传播。
- scope：FieldRenderer、ArrayField、array-field-feedback 单一定向测试及本文。
- 非目标：文件二进制的嵌套 multipart 编码、后端解码、主题或布局改造。
- Delegation Decision：medium / managed；主线程唯一 writer，Bohr 只读 verifier。
- 不提交、推送、发布或部署。

```gherkin
Given 多行数组包含文本、布尔、标签、日期范围和嵌套数组
When 读取表单 FormData
Then 只得到外层数组 JSON，不包含内部字段散落的 name

Given 表单同时包含与内部字段同名的顶层字段
When 提交表单
Then 顶层值独立提交，不与数组内部值混合

Given 嵌套字段处于可编辑状态
When 修改内部字段并由宿主更新受控值
Then 回调保留嵌套结构，外层 JSON 同步更新

Given 数组被禁用或者清空
When 读取表单 FormData
Then 禁用数组不提交，启用的空数组提交空 JSON 数组
```

原始 File 不适合 JSON 编码；文件输入作为明确例外，保留既有 name 与二进制
原生提交通道，避免附件数据丢失。多行同名附件的归属仍采用既有行为，尚未新增
索引路径或服务端编码约定。此 JSON 契约仅覆盖可序列化数组值。

独立使用 ArrayField 时默认保留子字段提交；由 FieldRenderer 输出外层 JSON
时才关闭内部可序列化字段的原生 name。

## 本地证据

- 上轮 `cd packages/ui && bun run test src/components/array-field-feedback.test.svelte.ts`
  最终 11/11：嵌套编辑回传、同名顶层隔离、禁用/清空、standalone 与原始 File。
- 上轮相邻 FieldRenderer 回归连同数组首轮共 33/33；不是最终数组 11 项的
  重复计数，也不能推导浏览器或服务端解码通过。
- 本轮回收 Bohr 只读复核，当前未发现新增 P0/P1/P2 阻塞。确认 File 的
  原生 name/disabled 传播及 standalone 默认行为；多行附件归属仍待独立规范。
