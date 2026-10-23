# 工具栏图片上传失败恢复

## 续接约定

- parent：`toolbar-upload-lifecycle-20261021.md`；source：继续至整体企业规范完成。
- reason：已有生命周期隔离，但上传失败直接关闭弹层，只写控制台，无恢复入口。
- goal：当前请求失败后保留面板、显示通用错误、显式重试剩余队列；
  成功项不重复上传/插入，旧作用域失败不影响当前操作。
- scope：ImageUpload、现有富文本单文件契约测试、证据和路线图状态。
- 非目标：后端取消/临时文件回收、对象存储、拖放/粘贴主编辑区失败恢复。
- Delegation Decision：medium / managed；主线程唯一 writer，Bohr 只读 verifier。
- 不提交、发布或部署；只运行直接相关单一文件及 diff 检查。

```gherkin
Given 图片上传失败
When 异步请求拒绝或者处理器同步抛错
Then 弹层保持打开，出现通用错误和重试入口，不输出原始错误

Given 多文件队列前一项已成功、后一项失败
When 显式重试
Then 仅重试失败项及未执行项，成功项不重复插入

Given 失败状态下替换上传处理器或关闭弹层
When 再次进入上传
Then 不继承旧失败状态和旧重试文件

Given 正在上传
When 用户重复触发重试或重新选择文件
Then 不发出并发请求，失败后可重新选择同一文件
```

## 当前证据

- `cd packages/ui && bun run test src/components/richtext-field-contract.test.svelte.ts`：
  41/41，退出码 0；同一文件涵盖既有字段与上传生命周期，以及本轮失败恢复。
- 覆盖同步抛错、Promise 拒绝、三文件中间失败后的 `A,B,B,C` 调用顺序、
  重试再次失败、并发保护、handler 变化清理、重新选择同文件、关闭/卸载/禁用
  后的迟到失败、旧 reject 与新 pending 请求交错。
- 选择文件后清空原生 input，使相同文件可以再次触发 change；
  队列持有 File 快照，不依赖拖放事件结束后的 FileList。
- Bohr 只读复核未发现确定的生产代码 P0/P1/P2；其指出的队列中间失败、
  旧失败与新 pending 交错、重新选择同文件覆盖已补入最终测试。
- 首次新增测试因未安装 `toHaveTextContent` matcher 失败，改用现有
  `textContent` 断言后通过；没有屏蔽上传失败或减少行为断言。
- `git diff --check` 通过。

仅为当前源码的 DOM 模拟器验证，不代表浏览器、读屏、真实上传/清理或消费者
发布已验收。本轮未运行全仓测试、包构建或类型检查；上一轮构建不是本轮证明。
主编辑区 drop/paste 的失败恢复仍是独立缺口，不能由本页的工具栏证明关闭。
