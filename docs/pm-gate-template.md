# PM Gate

Use this template before implementing a feature request, issue, or user-facing
UI change. Keep the answers short and concrete.

## JTBD

When `[situation]`, `[user]` needs to `[motivation]`, so they can `[expected outcome]`.

## Anti-Goals

- We will not `[out-of-scope behavior]`.
- We will not `[new persistence, permission, or integration boundary]`.

## Information Architecture

- Primary decision on the first screen: `[decision]`.
- Primary fields: `[up to three fields]`.
- Secondary details moved to: `[drawer, detail view, or action menu]`.
- Risky action requiring confirmation: `[action or none]`.

## State Matrix

| State | User-visible result | Available action |
| --- | --- | --- |
| Loading | `[skeleton or progress]` | `[none or cancel]` |
| Empty | `[what is missing]` | `[next useful action]` |
| Error | `[actionable explanation]` | `[retry or recovery]` |
| Forbidden | `[permission boundary]` | `[request access or go back]` |
| Success | `[fact that is actually confirmed]` | `[next action]` |

## Gherkin Acceptance

```gherkin
Feature: [feature name]

Scenario: [primary user outcome]
  Given [precondition]
  When [user action]
  Then [observable result]

Scenario: [empty, error, or permission boundary]
  Given [precondition]
  When [user action]
  Then [observable result]
```

## Verification Evidence

- [ ] Targeted unit or contract tests pass.
- [ ] `bun run verify` passes.
- [ ] UI changes include `1440x900` and `1920x1080` screenshots.
- [ ] UI changes cover loading, empty, error, forbidden, and success states.
