# 批量操作栏状态契约

## 续接约定

- parent：`enterprise-ui-plan.md` 批次三批量操作；
  source：继续整体企业级规范；reason：公共 BatchActionBar 的默认语言、
  区域名称与处理中操作约束未形成统一契约。
- goal：默认文本随语言切换；处理中保留上下文且阻止清除及自定义动作交互；
  恢复后继续操作；嵌入表单时清除选择不提交表单。
- scope：BatchActionBar、对应单文件测试和测试宿主、四条中英翻译、本文及路线图。
- Delegation Decision：medium / managed；主线程唯一 writer，Bohr 只读 verifier。
- 非目标：不替换 AutoTable 内部工具栏，不更改 Provider、后端批量范围、
  幂等键、部分成功或服务端取消协议；不提交、推送或部署。
- 单文件先验证组件契约；随后针对模拟器不能证明的 inert 行为增加隔离 Chromium
  fixture（`output/playwright/batch-action-bar-contract-20261021`）。
  编排与业务范围不变，不进行全仓测试或构建。

```gherkin
Given 同一操作栏已经选择若干记录
When 切换语言或更新总数
Then 默认区域名称、选择计数和清除文案同步更新，自定义文案保持不变

Given 宿主将操作栏设为处理中
When 用户尝试清除选择或操作自定义动作
Then 禁止交互且保留当前选中上下文，恢复后可继续

Given 操作栏位于原生表单内
When 清除选择
Then 只调用清除回调一次，不触发表单提交
```

## 当前结果

- `packages/ui/src/components/batch-action-bar.test.svelte.ts`：**15/15** 通过。
- 默认文案改用 `@svadmin/core/i18n`；新增区域名称和总数计数的中英翻译，
  选择计数、清除和处理中状态复用既有翻译。
- `pending=true` 时区域保留当前上下文并设置 `aria-busy`，清除按钮禁用，
  自定义 `actions` 与 `children` 容器设置 `inert`；恢复后清除和自定义动作恢复。
- 清除按钮显式为 `type="button"`，不会隐式提交宿主表单。
- 显式 `selectedLabel`、`clearLabel`、`ariaLabel`、`pendingLabel` 优先级保持，
  语言切换不会覆盖消费者传入的业务文案。
- 稳定的 `role=status` 节点位于 busy 区域外；可见的处理中标签不重复播报。
- 首轮独立复核指出状态提示位于 busy 区域内的风险；已移至稳定外部节点，
  并为三种布局增加节点不重建及不位于 busy 祖先下的断言。
- 最终只读复核确认该 P2 关闭，当前范围无新增 P0/P1/P2；复核未代替测试执行。
- `inert` 仅约束容器内的动作子树，不控制宿主已打开的 portal，也不阻止
  程序直接调用处理器。宿主仍需维护业务 pending、授权与幂等守卫。
- 本轮只验证组件契约，不宣称 AutoTable 的服务端幂等、部分成功、取消、
  跨页全选协议或真实读屏认证。DOM 模拟器只验证 inert 属性；真实浏览器结果
  见下节，不能把它外推到 portal、其他浏览器或读屏软件。

`git diff --check`：通过。

## Chromium

- 默认布局在 1440x900、390x844 两视口完成同一流程，两组均通过，
  `pageErrors: []`。验证鼠标坐标点击 inert 动作不调用处理器；Tab 从前一控件
  跳到后一控件，Enter 不触发动作；恢复后动作和清除均可使用，原生提交次数为零。
- 语言切换覆盖区域名称、选择计数、清除文案和处理中提示；零选择且 pending
  时仍显示操作栏，结束后隐藏。未验证浮动/轻量布局的浏览器键盘路径。
- 已查看 `batch-390.png`、`pending-390.png`，本次短文案无重叠；两视口最终态及
  390px 处理中态无页面横向溢出。没有宣称长文案或完整视觉验收。
- 复现脚本和 fixture：`output/playwright/batch-action-bar-contract-20261021/`。
  浏览器与 4205 服务已关闭。运行中的批量操作仅为本地计数回调，不访问生产接口。
