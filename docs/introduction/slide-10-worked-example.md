# Slide 10 — Worked Example: Meta Ads Manager

**Title:** Worked Example: Meta Ads Manager

---

## The Graph

```
ads-manager (agent)
  └── fills: budget-steward (role)     owns: campaign-budgets, cpa-target
  └── fills: creative-manager (role)   owns: ad-creatives, creative-rotation
  └── fills: account-sentinel (role)   owns: meta-ad-account-health; decides: []

All three roles require:
  └── performance-audit (skill, shared)   ← deduplicated in lockfile
  └── [role-specific skill]

All skills require:
  └── meta-ads (tool)                     ← never: daily-budget-over-200, activate-without-human-approval, ...
```

## Why Three Roles?

The original single role mixed three accountabilities whose escalations **different humans review**:
- Spending money → finance team
- Making creative → creative team  
- Watching the account → ops/security

`owns` lists must be disjoint. The conflict checker enforces this.

## Authority in Action

| Action | Verdict | Why |
|---|---|---|
| Raise budget $100→$110 | **Autonomous** | role `decides` (≤20%/24h), under tool's $200 `never` |
| Raise budget $100→$130 | **Escalate** | role `escalates` (>20%) |
| Set $250/day budget | **Forbidden** | tool `never`; no role can widen |
| Activate ad after drafting | **Forbidden** | tool `never` (`activate-without-human-approval`) |
| Duplicate to new geography | **Escalate** | listed nowhere → default disposition |

## Speaker Notes

- The shared `performance-audit` skill appears once in the lockfile despite being required by all three roles — this is deduplication by path, not by name.
- The `account-sentinel` role has `decides: []` — a pure watcher role. This is intentional: watching the actors' domain is someone's job, and the conflict checker stops the actors from absorbing it.
- The tool's `never` block is the security primitive — no role or agent can override it.
- All `never` rules are consolidated on ONE node (the tool). Skills reference the tool directly; no capability split needed.
