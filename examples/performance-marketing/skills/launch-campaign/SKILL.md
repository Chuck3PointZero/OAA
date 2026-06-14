---
kind: skill
name: launch-campaign
description: Creates and activates a new campaign on Meta Ads from an approved brief; maps business-domain fields to API vocabulary using the ontology tool map.
allowed-tools:
  - tools/meta-ads
authority:
  escalates:
    - brief-missing-required-fields
    - tool-returned-policy-violation
---

# Skill: Launch Campaign

Translates an approved campaign brief into a Meta Ads API call. All field mapping from business vocabulary (`Campaign.budget`, `Campaign.objective`) to API vocabulary (`AdSet.daily_budget`, `AdSet.optimization_goal`) follows the `meta-ads` concept map in `ontology/customer-acquisition.rel`.

## Workflow

1. Load brief from `memory/briefs/{brief-id}.json`. If missing or incomplete: escalate with `brief-missing-required-fields`.
2. Map brief fields to API fields using the ontology map:
   - `budget` → `daily_budget` (in account currency subunits)
   - `objective` → `optimization_goal` (enum translation: awareness→REACH, conversion→OFFSITE_CONVERSIONS, etc.)
   - `start-date` / `end-date` → `start_time` / `end_time` (Unix timestamps)
3. Call `meta-ads.create_campaign` with status=PAUSED (never activate immediately — role constraint).
4. If tool returns a policy violation code: escalate with `tool-returned-policy-violation`.
5. Write the created campaign ID to `memory/campaigns-launched.json`.
6. The role then decides whether to activate (separate tool call gated by role authority).

## Notes

The brief schema is defined in `memory/briefs/README.md`. The skill validates required fields before calling the tool — a missing `objective` is a skill-level escalation, not a tool error.
