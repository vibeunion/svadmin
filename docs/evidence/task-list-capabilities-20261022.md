# 任务列表读取能力边界

## 续接约定

- parent: `task-list-read-gate-20261022.md`
- source: 用户要求按原有范围继续完善企业级规范。
- reason: 独立 TaskList 缺少 Provider 时显示空列表，缺少 list/listDlq 时仍尝试读取。
- goal: 能力缺失时显示明确提示、不请求、不重试、不显示未经确认的计数和旧记录。
- scope: TaskList、task-list-query 单文件测试、本文和路线图。
- non-goals: 不改任务 Provider 协议、核心 hook、服务端权限或发布流程。
- risk/orchestration: medium / managed，主线程唯一 writer，独立只读 verifier。

## 验收场景

```gherkin
Given Provider 缺失或未提供当前队列的读取方法
When 在 Provider 数据模式展示任务列表
Then 提示能力缺失，不显示空列表、任务计数或 Retry，不调用其他队列

Given 普通队列与死信队列读取能力不同
When 切换队列或补充可读取 Provider
Then 仅请求当前支持的队列并正常显示结果

Given 已加载列表随后替换为不支持当前队列的 Provider
When 旧请求迟到完成
Then 不恢复旧记录、计数或操作入口

Given 传入静态任务
When Provider 未提供列表能力
Then 静态任务仍正常展示，不请求且不显示能力错误
```

## 验证状态

- 在 `packages/ui` 执行
  `bunx vitest run src/components/task-list-query.test.svelte.ts`：**12/12 通过**。
- 覆盖普通列表/DLQ 能力缺失、双语提示、补充 Provider 后恢复、队列切换不回退、
  静态任务不误报，以及旧普通列表请求迟到隔离。
- Bohr 独立只读复核确认无 P0/P1 阻断；代码分支共享，DLQ 的迟到回放未单独
  重复测试，作为非阻塞覆盖边界保留。
- `git diff --check` 通过；真实服务端、浏览器、读屏和发布验收未完成。
