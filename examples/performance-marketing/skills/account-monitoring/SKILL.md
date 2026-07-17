---
kind: skill
name: account-monitoring
description: Checks Meta ad account health — policy status, billing flags, API error rates, and unusual spend patterns outside normal campaign bounds.
allowed-tools:
  - ../../tools/meta-ads
---

# Skill: Account Monitoring

Used exclusively by `account-sentinel`. Fetches account-level signals that sit above the campaign layer — policy status, billing health, and aggregate spend anomalies that no single campaign metric would surface.

## Workflow

1. Call `meta-ads.get_account_status` — returns policy status, billing flags, and any active account restrictions.
2. Call `meta-ads.get_campaign_insights` with a short lookback window — compute aggregate spend vs. historical baseline.
3. If aggregate spend deviates by more than 2× the 7-day average: flag as `unusual-spend-pattern-detected`.
4. If any policy restriction is `ACTIVE` or `PENDING_DELETION`: flag as `account-policy-violation-detected`.
5. If the `meta-ads` tool returns repeated 4xx or 5xx codes across the session: flag as `api-error-rate-above-threshold`.
6. Write findings to `memory/account-health-{date}.json`.
7. Return: list of active flags (empty list = clean).

All non-empty flag lists are escalated by `account-sentinel` without autonomous action.
