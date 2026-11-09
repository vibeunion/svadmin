## Summary

This PR completes the enterprise security, rich badging, and keyboard shortcuts suite aligned with Arco Design, Arco Design Pro, and high-security enterprise admin patterns:

### 1. Enterprise Session Guard & Watermark (<LockScreen>, <Watermark>)
- `<LockScreen>`: Fullscreen session protection dialog featuring real-time digital clock/date, user avatar and identity card, password-masked input with Enter key unlock, unlock failure shake animation, idle inactivity auto-lock detection (`idleTimeout`), and quick lock shortcut (`Alt+L`).
- `<Header>` & `<Layout>` Integration: Integrated `showLock` trigger in top bar, and injected `<Watermark>` directly into `<Layout watermark={...}>` for zero-setup confidential tenant/employee anti-tamper watermark protection.

### 2. Arco Design Rich Badging (<Badge>)
- **Wrapped Badges**: Wraps any children element (e.g. `<Avatar>`, `<Button>`, or icon) with absolute positioned top-right badges.
- **Overflow Counts**: Configurable `overflowCount` (defaults to 99, rendering `99+` on overflow), and suppression of zero (`showZero: false`).
- **Dot Badge**: Renders minimal standalone or anchor dot indicator (`dot: true`).
- **Status Indicator**: Supports 5 semantic status variants (`processing` with pulsing wave animation, `success`, `warning`, `error`, `default`) with optional descriptive label text.

### 3. Global Keyboard Shortcuts Suite (<GlobalShortcuts>)
- System-wide shortcut registry invoked with `?` (Shift+/) or `Cmd+/` / `Ctrl+/`.
- Categorized shortcuts dialog (Navigation, View, Action, System) with real-time query filtering, high-contrast `<kbd>` elements, and built-in dispatching for CommandPalette (`⌘K`), Fullscreen (`F11`), LockScreen (`Alt+L`), and Theme Switcher (`Alt+T`).

### 4. Pro Card & Light Filtering Suite
- Exported enterprise `<ProCard>` (collapsible, split cards, card header actions), `<LightFilter>` (compact dropdown filter row), and `<Divider>` (horizontal/vertical, dashed, text orientation).
- Public aliases: Exported canonical `Segmented` -> `SegmentedControl`.

---

## UI State Evidence

适用于行为或布局变更的 PR：

- [x] 已填写 PM Gate：JTBD、Anti-Goals、信息架构和 Gherkin 验收场景
- [x] 已附状态矩阵（state matrix: 锁定遮罩态、解锁校验态、角标红点态、数字溢出态、呼吸状态灯态、快捷键向导弹窗态）
- [x] 已在 1440x900 和 1920x1080 真实浏览器视口生成并附加两张截图
- [x] 已检查空态、加载态、错误态、折叠态和展开态
- [x] git diff --check
- [x] 已运行对应的测试用例，并确认无横向溢出、重叠或异常固定高度

### PM Gate

#### JTBD
- 作为政企、金融或医疗管理系统的管理员，我希望离开工位时能够快速一键锁屏或超时自动锁屏，并全局显示工号水印，确保敏感数据不被泄露。
- 作为前台操作人员，我希望通过红点、99+ 数字溢出角标和呼吸指示灯清晰感知未读消息与任务运行状态。
- 作为高级键盘流用户，我希望按 `?` 能够随时查看系统快捷键并键盘快速调度。

#### Anti-Goals
- 不破坏现有 Badge 作为普通标签 pill 使用的向下兼容性。
- 不引入重型第三方全屏或快捷键库，全套由 Svelte 5 响应式与原生 DOM API 实现。

#### State Matrix
| 模式 / 组件 | 默认态 (Default) | 激活 / 展开态 (Active) | 告警 / 错误态 (Error / Warning) | 呼吸 / 特殊态 (Special) |
| :--- | :--- | :--- | :--- | :--- |
| `LockScreen` | 隐藏不占用视觉 | 全屏模糊遮罩，数字翻页时钟实时走动 | 密码错误展示红色提示文案并触发抖动动画 | 支持无操作自动超时休眠触发 |
| `Badge` (Wrapped) | 不显示徽标 | 宿主右上角呈现小红点或数字角标 | `status="error"` 显示珊瑚红色指示灯 | `status="processing"` 渲染水波脉冲呼吸动画 |
| `GlobalShortcuts` | 隐藏静默监听按键 | 居中弹出圆角卡片，实时搜索过滤快捷键 | 未匹配到结果展示友好空态提示 | 点击快捷键条目即可一键执行动作 |

### 1440x900 evidence
![1440x900](https://raw.githubusercontent.com/vibeunion/svadmin/feat/pro-card-light-filter-and-divider/docs/pr-evidence/pr682/1440x900.png)

### 1920x1080 evidence
![1920x1080](https://raw.githubusercontent.com/vibeunion/svadmin/feat/pro-card-light-filter-and-divider/docs/pr-evidence/pr682/1920x1080.png)
