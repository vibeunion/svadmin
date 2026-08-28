# Agent Configuration Template

> Auto-deployed by [agent-team-config](https://github.com/zuohuadong/agent-team-config).
> This file is overwritten by `agmesh deploy`. Put project-specific additions in `.agents/AGENTS.local.md`.
> Detailed rules live in `.agents/docs/AGMESH.md`; load that file only when the task needs the expanded workflow.

## Language

- Reply to the user in Simplified Chinese.
- Use Chinese for important code comments or explanations.
- Keep status concise; do not paste logs, files, base64, or screenshots into chat.

## Startup Loop

- Start with repo truth: inspect `git status` and targeted files.
- If `.agents/state/coordination.json` exists, use `agmesh context . --task <id>` or `agmesh automation status .` for bounded task, event, and mailbox context.
- Legacy projects only: read the smallest needed slices of `tasks.md`, `progress.md`, and `.mailbox/`.
- Prefer `rg`, focused `sed` ranges, `jq`, `git diff --stat`, `agmesh memory recall "<query>" --token-budget <n>`, and `agmesh automation context-pack . --type <kind>` over loading broad files.
- `agmesh automation status|doctor|orchestrate .` automatically maintains coordination context when it reaches 75% of budget; use `--suggest` only for a read-only preview.

## Task Rules

- Direct user instructions unblock safe local work from stale locks; they do not override safety, destructive/production writes, or writer ownership.
- Local checks need no release-gate/candidate-SHA precondition; they are not release acceptance.
- Do not silently shrink scope. Stop and state the tradeoff if the work exceeds the request.
- Never hardcode secrets, tokens, API keys, credentials, or sensitive URLs in code, logs, templates, or durable memory.
- Do not auto-commit, push, publish, deploy, or write production state unless the user explicitly requested it.
- Verify with the narrowest meaningful test first, then broaden for shared CLI behavior, templates, automation, data, security, deployment, or user-facing workflows.

## Delegation Gate

- For implementation, fix, test, deploy, refactor, PR/MR, or automation work, make a Delegation Decision before editing.
- Resolve `orchestration.mode` as `adaptive|native|managed|panel`. Adaptive requires an explicit Task Contract/project override or the intersection of model catalog and current host/runtime evidence for `native_delegation`, `tool_call`, `long_horizon`, `structured_output`, `context_isolation`, and `runtime_recovery`; missing evidence falls back to managed.
- Native keeps one owner/writer (low risk external=0; medium risk exactly one verifier). Managed dispatches only needed lanes under budget. High risk, review-high, or explicit reviewer disagreement resolves to a bounded panel with one writer and at most three read-only reviewers; ordinary review status alone does not. Product direction, aesthetics/taste, and business choices resolve to human-loop, while high-risk or irreversible operations still take panel precedence.
- Explicit legacy `collaboration.mode` remains compatible and resolves to managed. All modes share deterministic tests/build/typecheck/diff/approval/recovery evidence gates.
- Low-risk work may be done by the current owner with deterministic verification. A native plan with external=0 is a valid resolved plan, not a `safe_skip_reason`.
- Pure explanation, read-only review, simple shell queries, formatting-only edits, and documentation-only tasks may skip the Delegation Gate with `safe_skip_reason`.
- Host tool policy is not a valid `safe_skip_reason`. When the resolved plan requires a lane and runtime can spawn it, dispatch it; otherwise record `interruption_recovery` and mark the result `blocked` or `PARTIAL`. Native low-risk external=0 is not a runtime gap.
- Post-edit evidence/review gate: behavior-affecting changes require current diff inspection and deterministic verification; medium risk may add at most one independent verifier, high risk uses panel, and human-loop waits for a human decision.
- PARTIAL terminal gate: when every remaining acceptance item depends on production authorization, real credentials, external accounts, deployment, or human permission, record `PARTIAL` with exact blockers and at least one evidence reference, set the task `blocked`, and end the current task cycle. Do not auto-expand the same goal into acceptance-tool or framework work.
- Scope/continuation gate: claim freezes goal, non-goals, acceptance, risk, and orchestration. Material changes or resuming after `PARTIAL` require a follow-up Task Contract with `parent` / `source` / `reason`, or auditable human confirmation. Keep coordination status/risk, Contract execution state/scope hash, and effective orchestration consistent. Default project WIP is four `running` tasks; writer scope, DAG, high-risk capacity, verifier capacity, and exclusive-resource gates decide which tasks may run concurrently.

## Progressive Context

- Load project prompts, workflows, `references/skills/`, installed skills, and `.agents/docs/AGMESH.md` only when the current task needs them.
- For stack, deployment, or persistence choices, first select the relevant profile skill (`stack-profile-selector`, `deployment-target-selector`, or `database-profile-selector`), then load concrete framework skills.
- Keep visual evidence path-based. Inspect images only when visual judgement is essential, summarize the observation, and continue from paths.
- If a Codex session hits context pressure, run `agmesh automation inspect-session-context <session-id|session-file>` and continue with a concise handoff summary.

<!-- AGENT:OVERLAY:START -->
<!-- Project-specific overlay content goes here. -->
<!-- AGENT:OVERLAY:END -->
