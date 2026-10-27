---
type: oaa/Role
kind: role
name: site-owner
description: Accountable for deciding what to do when the site has a problem.
requires:
  - ../../skills/decide-site-escalation
authority:
  owns:
    - site-decisions
  decides:
    - accept-downtime-for-a-window
  escalates:
    - downtime-longer-than-a-day
---

# Role: Site Owner

The site's decision point when something is wrong: it accepts a downtime window when that is the right trade-off, and escalates a problem too large for that - an outage lasting longer than a day.

| Escalation | Goes to |
|---|---|
| `downtime-longer-than-a-day` | a wider decision beyond this role |
