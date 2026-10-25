# Member Directory 错误反馈

## 续接约定

- parent: `notification-settings-error-feedback-20261022.md`；source: 用户继续完成企业级规范。
- reason: 成员目录读取和邀请失败会直接展示 Provider 异常；空 Error 的读取
  失败还会将清空后的数组误报为空目录。
- goal: Provider 读取/邀请失败使用通用文案，读取失败阻断空态，重试/再次邀请
  恢复；保留邮箱本地校验、复制失败和 Provider 参数契约。
- scope: MemberDirectory、builtin-pm-repairs 单文件及本文。
- non-goals: 不修改成员目录 Provider 协议、服务端邀请、权限模型或复制链接行为。
- risk/orchestration: medium / managed；主线程唯一 writer，Bohr 只读 verifier。

## 验收与边界

1. Given 读取失败，Then 不显示空目录；重试恢复记录。
2. Given 邀请失败，Then 通用错误且保留邮箱；再次邀请成功。
3. 现有邮箱格式校验和复制失败仍使用具体本地文案。
4. `bunx vitest run src/components/builtin-pm-repairs.test.svelte.ts`：**23/23**。
   覆盖私有诊断、空 Error、非 Error 的读取及邀请失败与成功恢复；失败保留
   邮箱、成功清空、参数与次数保持。
5. 邀请失败后重新提交无效邮箱，先清除远程错误标记，确保具体邮箱校验不会被
   旧通用错误遮盖；无效提交不额外调用 Provider。
6. 首轮旧测试断言 `Delivery failed` 失败，改为通用文案和原诊断不存在，
   保留“不报告成功”和原调用参数断言。
7. 发送邀请期间隐藏目录重试入口，避免重试推进请求代际后让邀请回执无法清理
   `sending`；`load()` 也以 `untrack` 读取发送状态，防止同一 effect 因忙碌状态
   变化重复加载。新增 pending 邀请成功/失败、重试点击和 Provider 替换隔离回归。
8. 定向命令 `bunx vitest run src/components/builtin-pm-repairs.test.svelte.ts`：
   **26/26**；邀请完成后重试入口恢复，旧 Provider 的迟到邀请不污染新目录。

## 续接：邀请与读取重试互斥

- parent: 本文错误反馈；source: 用户继续；reason: 目录错误期间可发送邀请，
  同时重试读取会使旧邀请无法清理忙碌标记。
- goal: 发送期间不启动目录重试，完成后恢复；Provider 切换不被旧请求阻塞。
- scope: MemberDirectory、同一测试文件及证据/路线图；risk/orchestration:
  medium / managed，主线程 writer、Bohr 只读 verifier。
- non-goals: 不改变邀请接口或撤销已发出的服务端请求；不扩展复制链接并发流程。
- Given 目录读取失败且邀请正在发送，When 同一事件批次尝试重试，
  Then list 仍一次；When 邀请成功/失败，Then 发送恢复，重试可再读取。
- Given 旧邀请未完成，When 替换 Provider，Then 新目录正常加载；
  旧邀请完成后新邮箱与状态不被覆盖，新邀请仍可成功。

未覆盖真实目录 Provider、浏览器、读屏、语言切换和消费者发布构建。

## 续接：浏览器恢复与实例隔离

- parent: 本文已有恢复契约；source: 用户要求按原始总范围继续；reason: 浏览器证据缺失。
- risk/orchestration: medium / managed，主线程 writer，Bohr 只读复核。
- scope: enterprise-ui 成员目录 fixture、路由、Playwright 专用配置和 browser.spec.ts；
  不改变 MemberDirectory Provider 协议。
- `bunx playwright test --config=./playwright.member-directory.config.ts`：**4/4**，
  Chromium 桌面/窄屏均通过。
- 覆盖读取失败不显示空目录、Retry 恢复成员列表、邀请失败隐藏 Provider 原文并
  保留邮箱、再次邀请成功清空邮箱并提交精确值；同时覆盖搜索/邀请输入的双实例
  ID、焦点、筛选、无匹配、清空恢复和写入状态隔离。
- 已检查 `output/playwright/member-directory/desktop-invite-failed.png` 与
  `output/playwright/member-directory/narrow-invite-failed.png`：错误提示位于邀请
  表单下方，无重叠；窄屏右侧角色列需横向滚动，本轮未新增该滚动操作断言。
- Bohr 复核未发现确认的 P0/P1/P2 阻断；按建议记录失败邀请入参，并在搜索流程后
  检查调用次数。早期错误按钮文案及并行端口冲突均已修复或串行重跑，不计为通过。

仍未覆盖真实目录 Provider、读屏、语言切换、跨浏览器和消费者发布构建。
