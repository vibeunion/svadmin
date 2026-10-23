# 树与级联字段反馈续接

## 任务约定

- parent：`form-field-description-20261021.md`；source：继续完成原 FormField 规范。
- reason：TreeSelect/Cascader 触发按钮缺少宿主字段 ID、名称与说明/错误描述。
- goal：两组件新增 id、ariaLabel、describedby、invalid，透传给实际 Popover
  触发按钮；FieldRenderer 关联标签和描述，不影响选值与面板协议。
- 非目标：树加载/虚拟化、级联路径算法、原生提交能力、AutoForm 首错聚焦、
  Transfer/ArrayField、自定义 children、读屏与跨浏览器验收。
- medium / managed；当前线程唯一 writer，Bohr 唯一只读 verifier。
- 写入：两组件、FieldRenderer、单一定向测试文件及规范证据。
- agmesh 不可用，本文记录续接；不提交、推送、发布或部署。

## 验收

```gherkin
Given 同页两个相同业务字段使用树或级联选择器
When 读取标签与触发按钮
Then 标签仅关联当前实例按钮，按钮关联本实例说明和错误

Given 面板打开后宿主更新说明或校验状态
When 更新完成
Then 触发按钮同步更新且面板仍关联该按钮

Given 触发按钮使用显式 ID 或宿主未提供 ID
When 打开面板并选择叶节点
Then 上游生成/提供的按钮 ID 有效，原选值回调不变
```

## 状态

- 命令（在 `packages/ui`）：
  `node ../../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/components/hierarchical-field-feedback.test.svelte.ts`。
- 首次 0/8：六条字段关联用例找不到字段命名按钮；另两条找不到 dialog，
  原封装没有声明面板角色，不能将其等同于字段关联失败。
- 修复字段属性后 3/8；面板缺少最终 DOM ID，触发按钮没有 aria-controls。
  本地 bits-ui 的 Popper 层将 id 解构后未合入最终 props，单纯传 Content.id 不足。
  使用受支持的 child snippet 保留 wrapperProps/props/ref attachment，并将
  panelId 显式落到最终节点，8/8。
- 扩展 Escape/显式 ID 更新用例后 11/13，发现上游 controls 保留旧 content ID；
  两组件显式从当前 panelId 驱动 controls（关闭时移除），最终 **13/13**。
- 仅本地 happy-dom DOM/事件验证；未运行浏览器、读屏、全仓类型检查或消费者构建。
- Bohr 只读复核未发现明确 P0/P1/P2，指出焦点测试需要先证明进入面板；
  补上此前置断言并将 union render 改为显式分支后，最终再次 **13/13**。
- `git diff --check` 通过。本轮局部契约已完成，整体企业规范仍未完成。
