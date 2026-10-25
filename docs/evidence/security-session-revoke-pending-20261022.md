# SecuritySettings 会话撤销互斥

## 续接约定

- 日期：2026-10-22。
- parent/source：`../evaluations/enterprise-ui-plan.md`，用户“继续”及上一轮密码提交门禁。
- reason：检查安全页其余破坏性操作是否存在 DOM 禁用更新前的重复请求。
- 范围：SecuritySettings 两个撤销函数、同一安全回归文件及本证据/总计划。
- 非目标：修改认证协议、MFA、加载请求生命周期、视觉样式或发布。
- 风险/协作：medium / managed；主线程唯一写入者，Bohr 只读复核。

## 验收场景

1. Given 单会话撤销正在等待，When 同一调用栈内触发批量入口并再次确认，Then 只调用单会话 Provider。
2. Given 批量撤销正在等待，When 同一调用栈内触发单会话入口并再次确认，Then 只调用批量 Provider。
3. Given 单会话撤销正在等待，When 同步重入同一入口并确认，Then 不重复调用 Provider。
4. Given 用户取消或 Provider 失败，When 重新确认，Then 取消不写入，失败保留记录且允许重试（同文件已有用例）。

## 实现与证据

`revokeSession` 与 `revokeAllOthers` 均在进入确认流程之前检查共享 `revoking`。
沿用已有请求开始赋值和 finally 释放机制，不修改作用域隔离或 Provider 参数。

- 新增两个方向的交叉入口用例、一个重复单会话用例。
- 同步使用 DOM `click()`，不在事件之间 await；断言精确 Provider 参数及互斥。
- 等待期间按钮禁用；成功后移除非当前会话并保留当前会话。
- 仅移除本轮两个 guard：36 通过、3 失败；交叉入口各额外调用一次，重复单会话调用两次。
- 恢复 guard：`bunx vitest run src/components/builtin-safety-followup.test.svelte.ts`，39/39，退出码 0。
- 失败实验的清理阶段出现 `derived_inert` 提示；恢复修复后的运行未出现该提示。
- `git diff --check` 通过。
- 独立复核：Bohr 只读检查，无已确认 P0/P1/P2 阻断；未重复运行测试。

## 边界

这是源码组件的同步 DOM 事件回归，不是人工连点或真实浏览器复现证明。
成功用例移除了唯一可撤销会话，未独立证明仍有其他设备时的成功后入口解锁；
释放逻辑经代码复核，失败后的解锁由既有重试用例覆盖。
没有执行浏览器测试、全量测试、类型检查、包构建、示例构建或发布。
既有 dist 不包含本轮修复；真实 SessionProvider、跨客户端并发、读屏和线上验收仍待完成。

## 续接：读取重试与写入作用域隔离

- parent/source：本证据；用户继续完成企业级规范。
- reason：`loadSecurity()` 与密码、MFA、会话撤销共用 `requestId`，读取重试会
  取消仍在途写入的收尾逻辑，造成密码输入持续 disabled。
- 修复：`securityReadId` 仅负责安全读取的 latest-wins；`scopeId` 负责 Provider/
  租户作用域替换时失效写入和确认动作。读取重试不再取消当前作用域内的写入。
- 新增 8 个场景：密码成功/抛错/失败返回 × 读取先完成/写入先完成，并覆盖旧
  Provider 读取回执在替换后不污染新作用域。
- 反向验证：临时让 `loadSecurity()` 推进 `scopeId`，8 个场景中的 6 个均因
  密码字段仍 disabled 失败；移除实验代码后回归 **47/47**。
- 未改变 Provider 参数、错误脱敏、MFA 未知状态、撤销共享 pending 锁或确认
  取消语义；`git diff --check` 通过。
- 作用域拆分后重新执行 `bunx playwright test --config=./playwright.security-settings.config.ts`：
  **4/4**（desktop 与 narrow，各密码失败恢复、读取失败重试场景）通过。
  该配置不覆盖读取重试期间并行密码写入的浏览器路径。
- 代际拆分的独立复核已返回：Bohr 未发现 P0/P1/P2 阻断，确认实验代码已移除、
  六种密码结果/完成顺序断言有效；未新增 MFA/撤销与读取重试交叉测试。
- 随后完成 UI 分发包与示例重建，当前修复已进入消费者产物；详见
  `enterprise-consumer-build-20261022.md`。本节取代前文“dist 不包含本轮修复”
  的历史边界，不代表真实服务或发布验收。
