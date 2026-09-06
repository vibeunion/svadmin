## UI State Evidence

适用于行为或布局变更的 PR：

- [ ] 已填写 PM Gate：JTBD、Anti-Goals、信息架构和 Gherkin 验收场景
- [ ] 已附状态矩阵（`docs/ui-state-matrix.md` 或变更说明中的等价矩阵）
- [ ] 已在 `1440x900` 和 `1920x1080` 真实浏览器视口生成并附加两张截图
- [ ] 已检查空态、加载态、错误态、折叠态和展开态
- [ ] 已运行 `git diff --check`
- [ ] 已运行对应的 Playwright 用例，并确认无横向溢出、重叠或异常固定高度

## PM Gate

### JTBD

<!-- 使用 docs/pm-gate-template.md，说明用户要完成的真实任务。 -->

### Anti-Goals

<!-- 明确本次不做什么，尤其是权限、持久化和外部集成边界。 -->

### Gherkin Acceptance

<!-- 至少包含主流程，以及一个空态、错误态或权限边界场景。 -->

### 1440x900

<!-- Attach the real viewport screenshot here. -->

### 1920x1080

<!-- Attach the real viewport screenshot here. -->
