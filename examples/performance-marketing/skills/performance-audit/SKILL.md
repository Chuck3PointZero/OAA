---
kind: skill
name: performance-audit
description: Pulls rolling 3-day campaign performance from Meta Ads and computes CPA, CTR delta, and frequency; surfaces campaigns that are below the CPA floor or above the frequency ceiling.
allowed-tools:
  - tools/meta-ads
---

# Skill: Performance Audit

Used by both `budget-steward` and `campaign-operator` to reason from the same metrics. Defines the numbers the roles' authority blocks reference.

**CPA floor**: account's target CPA × 1.5. A campaign below this floor is flagged.
**Frequency ceiling**: 3.0 impressions per unique per 7-day window. Above this, creative fatigue is declared.

## Workflow

1. Call `meta-ads.get_campaigns` — returns all active campaigns and their spend/result data.
2. For each campaign, compute rolling 3-day CPA = total spend / total conversions over the last 72 hours.
3. Compare CPA to floor and frequency to ceiling.
4. Write a structured audit report to `memory/audit-{date}.json`.
5. Return: list of campaigns in each state — healthy, below-cpa-floor, above-frequency-ceiling, stale-active.

## Supporting Files

- `references/metric-definitions.md` — canonical formulas for CPA, CTR delta, frequency
