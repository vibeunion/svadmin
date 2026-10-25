# 任务中心列表能力反馈

## 续接约定

- parent: `task-list-query-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: TaskProvider 的 list/listDlq 可选，缺失能力不能被展示为成功空列表，
  也不能通过刷新发起注定失败的读取。
- goal: 区分能力缺失与空数据，缺失时关闭查询、刷新与筛选，隐藏旧记录及计数，
  Provider 替换后恢复支持的列表；保留任务提交入口。
- scope: TaskQueueDrawer、两条中英文文案、现有单文件测试和本文。
- non-goals: 不改 Provider 协议、任务提交、核心 hook、布局或发布流程。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读复核。

## 验收场景

1. Given 缺少 list 或 listDlq，When 打开对应页签，Then 明确展示当前服务
   不提供该列表，无空数据提示、数量、旧记录或详情操作。
2. Given 当前能力缺失，When 尝试刷新，Then 无 refetch；查询 enabled=false，
   不展示重试按钮，自动刷新控件禁用，任务提交仍可用。
3. Given 当前能力缺失，When 替换为支持该能力的 Provider，Then 查询启用、
   列表及刷新恢复；再次撤掉能力后查询关闭、列表消失。

## 证据与边界

- 定向命令：`bunx vitest run src/components/TaskQueueDrawer.test.svelte.ts`：**34/34**。
- Bohr 指出自动刷新控件未禁用的 P2 边界；已补齐门禁，并在任务/死信两路验证
  Provider 能力撤销、恢复、再次撤销对应的控件禁用状态。
- Bohr 再次只读复核确认该 P2 关闭，本处无新增问题；`git diff --check` 通过。
- 新断言首次因误用 `Auto-refresh` 名称失败；对齐既有 `Auto refresh` 后重跑通过。
- 查询使用 mock，故 enabled 断言只证明组件传参，不证明真实网络轮询次数。
- 不以此关闭真实 Provider、浏览器、读屏、持久化任务恢复或发布验收。
