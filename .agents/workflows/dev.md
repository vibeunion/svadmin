---
description: 全流程开发 — 分析、实现、测试、验证
---
// turbo-all

# Development Workflow

## 0. Pre-Execution Gate
- Is the request specific enough? (file paths, function names, error messages, issue numbers)
- If vague → use `/deep-review` first to clarify intent and scope
- If specific → proceed directly

## 1. Understand the Task
- Read relevant source files to understand current codebase
- Identify affected files and dependencies
- Check existing tests and documentation
- Gather codebase facts BEFORE asking the user (don't ask what you can discover)

## 1.5 Stack Discovery Gate
If the task creates, expands, or materially depends on a technical stack, fullstack web framework, database, or deployment target, record a Stack/Fullstack/Database/Deployment Profile before implementation:
- Priority: user instruction > project docs (`AGENTS.md`, `GEMINI.md`, `README.md`, ADRs, `docs/`) > existing code/package/lock/config evidence > project overlay > recommended fallback > blocked.
- Load `stack-profile-selector` and the concrete stack skills from `references/skills/INDEX.md`.
- For hosting/deployment choices, also load `deployment-target-selector` and the concrete platform skill.
- Recommended fallbacks apply only to greenfield work with no conflicting evidence.
- Never migrate frameworks, rewrite build tooling, or change hosting provider unless the user explicitly asks for it.
- Block and ask when the user says only "app" or "miniapp", when existing project evidence conflicts with the fallback, or when desktop/mobile/native/Mpx/deployment boundaries are unclear.

## 2. Plan Changes
- Create implementation plan (use task_boundary PLANNING mode)
- Break task into small, independent sub-tasks
- If task is complex, assign focused subagents for independent exploration, critique, or verification
- For high-risk changes (auth, data migration, production): consider `/deep-review` first

## 2.5 Delegation Gate
Resolve `orchestration.mode` before dispatch:

- `adaptive` becomes `native` only when the six native capabilities are explicitly overridden by Task Contract/project config or evidenced by the model-catalog and current host/runtime intersection; otherwise use `managed`.
- `native`: one owner/writer, low risk external=0, medium risk at most one risk-triggered verifier.
- `managed`: dispatch only the explorer/executor/verifier lanes actually needed, inside the configured external-agent, round, and wall-clock budget.
- `panel`: high-risk, review-high, or explicit reviewer-disagreement work uses one writer plus at most three isolated read-only reviewers and normally at most two rounds; ordinary review status alone does not escalate.
- `human-loop`: do not auto-start execution/review lanes for product direction, aesthetics/taste, business choices, or irreversible judgement.

Explicit legacy `collaboration.mode` remains compatible and resolves to managed. Every mode still requires deterministic tests/build/typecheck/diff evidence, approvals, and recovery evidence where applicable.

Default model mapping:
- Use the routine profile for implementation and explorer work; balanced/pro prefer `gpt-5.3-codex-spark`.
- Use the verification/review-loop profile for normal critic/verifier work; balanced/pro default to `glm-5.2`.
- Use `review_class: review-high` only for arbitration, high-risk review, and unresolved reviewer disagreement; record `escalation_reason`. The default OpenAI fallback is `gpt-5.6-sol`; legacy `needs_model: gpt-5.5` remains compatible.

Useful roles:
- `explorer`: read-only codebase or external-source research
- `critic`: challenge the plan before implementation
- `verifier`: independently check the implemented result and evidence
- `browser`: visual/runtime verification for UI work

Low-risk native work normally needs no external agent. Record `safe_skip_reason` only when Delegation Gate itself is skipped, not merely because the resolver chose native ownership.

Subagent requests must include role, exact scope, read/write ownership, allowed files/directories, verification command, output schema, and whether the result must be persisted in `.mailbox/`. Do not run multiple writers unless file ownership is explicitly disjoint.

## 3. Implement
- Make changes following the plan
- Use TypeScript, functional style, proper error handling
- Keep commits atomic (one logical change per commit)
- Use Lore Commit trailers for non-obvious decisions (especially `Rejected:` for abandoned approaches)

## 4. Verify (Mandatory — no evidence = not complete)
- Run existing tests: `npm test` or `bun test`
- Run type check: `npx tsc --noEmit` or `bun run typecheck`
- Run linter: `npm run lint` or `bun run lint`
- If UI changes, use browser verification or a verifier subagent to check the actual rendered behavior
- Capture fresh verification output as evidence

## 5. Completion Checklist
Before declaring the task done, confirm ALL applicable items:
- [ ] Requested behavior is fully implemented (no scope reduction)
- [ ] Type check passes with zero errors
- [ ] Related tests pass
- [ ] Build succeeds
- [ ] No debug/temporary code left behind
- [ ] Delegation Gate was satisfied or safely skipped with a reason
- [ ] Fresh verification evidence included in response

## 5.5. Scope Discipline (Anti-Overengineering)

高能力模型倾向过度分析、过度重构和加不必要抽象。完成前必须自检：

- 是否只改了请求范围内的文件，没有附带无关重构
- 是否引入了当前任务不需要的抽象层、配置项或扩展点
- 是否为了"未来可能需要"而提前设计
- 是否把简单问题复杂化（能用 3 行代码解决的是否写了 30 行框架）
- 是否把内部实现细节暴露到公开 API
- diff 是否最小且可读，能否再删一行

critic/verifier 子智能体应把以上作为标准审查项。发现过度设计时标记 `blocking_findings`，要求 executor 回退到最小实现。

## 6. Commit
- Use Conventional Commits format: `feat:`, `fix:`, `refactor:`, etc.
- Include relevant issue/ticket numbers
- Add `Rejected:` trailer when you abandoned an alternative approach

## Notes
- For complex tasks: decompose into sub-tasks and use focused subagents for independent work
- For simple tasks: just do it directly, don't over-engineer the process
- Always check `progress.md` at project root if working in multi-agent mode
- Apply Reasoning Effort tiers: LOW for simple lookups, STANDARD for features, HIGH for architecture
