---
kind: skill
name: budget-pacing
description: Adjusts daily campaign budgets to maintain on-pace spend; increases or decreases within the bounds declared on the calling role.
allowed-tools:
  - tools/meta-ads
authority:
  escalates:
    - repeated-tool-failure   # if update_campaign fails 3× in one activation, escalate rather than retry
---

# Skill: Budget Pacing

Reads the current daily budget and projected end-of-day spend, then proposes an adjustment. The adjustment is applied only if it falls within the role's `decides` grant; otherwise, it is written to the escalation queue.

## Workflow

1. Read audit report from `memory/audit-{today}.json` (written by `performance-audit`).
2. For each campaign: compute pace ratio = actual spend at this hour / expected spend at this hour.
3. If pace ratio < 0.8: propose a budget increase (capped at +20%/24h per role grant).
4. If pace ratio > 1.2: propose a budget decrease.
5. Call `meta-ads.update_campaign` with the proposed budget.
6. On tool failure: retry once after 60s; if still failing, add to escalation queue.
7. Write outcomes to `memory/pacing-{date}.json`.
