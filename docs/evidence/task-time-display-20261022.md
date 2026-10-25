# 任务中心时间显示

## 续接约定

- parent: `task-submit-refresh-capabilities-20261022.md`
- source: 用户继续完善整体企业级规范。
- reason: 三个任务组件使用不带 locale 的 toLocaleString，应用语言与日期语言脱节。
- goal: 复用既有日历值解析，统一任务时间显示并跟随应用语言，保留秒数。
- scope: task-utils、TaskList/TaskDetails/TaskQueueDrawer、现有单文件测试及路线图。
- non-goals: 不新增时区配置，不把真实时间点强制改成 UTC，不修改共享 DateField。
- risk/orchestration: medium / managed，主线程唯一 writer，独立只读 verifier。

## 验收场景

```gherkin
Given 列表、详情和任务抽屉显示同一个时间点
When 应用语言在英文和中文间切换
Then 日期格式随语言变化且保留秒数，读取和写入不因语言切换而触发

Given 无时区日历日期或日期时间
When 展示任务时间
Then 保持日历值，不因宿主时区产生日期偏移

Given 缺失或非法时间
When 渲染任务时间
Then 显示统一占位，不显示 Invalid Date 或抛出渲染异常
```

## 验证状态

- 在 `packages/ui` 执行
  `TZ=America/Los_Angeles bunx vitest run src/components/TaskQueueDrawer.test.svelte.ts`：
  **52/52 通过**，并通过 `git diff --check`。
- 覆盖列表/详情/抽屉的中英文往返且不触发手动读取或写入，civil 值、非法值、
  非法 locale 及跨 UTC 日界 instant。查询 hook 使用 mock，不证明实际网络次数。
- 真实浏览器时区、读屏和发布验收仍未完成。
- Bohr 独立复核指出 UTC 环境可能掩盖时区错误；补充非 UTC 跨日界回归后，
  再次复核确认该 P2 关闭，无新增阻断。
