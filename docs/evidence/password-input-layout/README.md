# PasswordInput Layout Evidence

## JTBD

让用户在登录表单中稳定识别、输入和显示密码；锁图标与显示按钮不能遮挡文字，
切换可见性不能提交表单或清空已输入内容。

## Anti-Goals

- 不改变认证 provider、登录请求、权限、密码策略或会话行为。
- 不替业务项目重写 `AuthPageShell`。
- 不把组件级布局修复扩展为全站视觉重构。

## Gherkin Acceptance

1. Given empty, masked, or visible password input, When the field renders,
   Then the text area has clearance from both adornments.
2. Given the field is nested inside a form layout, When it renders,
   Then the label remains above a full-width control.
3. Given a password has been entered, When the visibility button is activated
   with mouse, Tab, Enter, or Space, Then the value is preserved and the form
   submit count remains zero.
4. Given a 390px, 768px, 1024px, 1280px, 1440px, or 1920px viewport, When
   the field renders in LTR or RTL, Then the document has no horizontal
   overflow.

## State Matrix

| Composition | Direction | Value states | Viewports | Expected result |
| --- | --- | --- | --- | --- |
| Default and `clean-flat` | LTR and RTL | Empty, masked, visible | 390, 768, 1024, 1280, 1440, 1920 | No overlap, stable icon centering, no horizontal overflow |
| Direct and nested | LTR and RTL | Empty, masked, visible | 390, 768, 1024, 1280, 1440, 1920 | Label remains above the control; parent form rules do not collapse the field |
| Keyboard interaction | LTR | Masked and visible | 390, 1440 | Tab/Option-Tab reaches the toggle; Enter/Space toggles without submit |

## Verification

- `bun run --cwd packages/ui build`
- `bun run --cwd packages/ui test -- src/components/password-input.test.svelte.ts`: 4 passed
- `SVADMIN_WEBKIT_EXECUTABLE_PATH=.../webkit-2368/pw_run.sh bun x --no-install playwright test --config playwright.config.ts password-input.spec.ts`: 4 passed
- `git diff --check`: passed

## Screenshots

- `1440x900.png`
- `1920x1080.png`
