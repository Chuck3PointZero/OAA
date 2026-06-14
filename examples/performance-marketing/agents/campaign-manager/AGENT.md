---
kind: agent
name: campaign-manager
description: Manages paid acquisition campaigns across channels — budget allocation, campaign lifecycle, and performance monitoring.
fills:
  - roles/budget-steward
  - roles/campaign-operator
metadata:
  schedule: "0 8,14,20 * * *"   # runs three times daily; also event-triggered on spend alerts
---

# Agent: Campaign Manager

Runs in the performance marketing team's environment. Reads campaign performance data from Meta Ads, allocates budget within the bounds defined on its roles, and launches or pauses campaigns according to declared authority.

This agent never touches creative — that accountability belongs to a separate agent not shown here.

## Memory

`memory/state.json` persists spend summaries and prior decisions across activations.

```json
{
  "last-run": "2026-01-14T08:00:00Z",
  "campaigns-monitored": ["campaign-id-1", "campaign-id-2"],
  "spend-today": { "campaign-id-1": 142.50, "campaign-id-2": 87.20 }
}
```
