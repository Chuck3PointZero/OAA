---
type: oaa/Role
kind: role
name: status-reporter
description: Accountable for a plain-language daily account of how the site did.
requires:
  - ../../skills/write-status-note
authority:
  owns:
    - status-notes
  decides:
    - write-the-daily-note
  escalates:
    - unclear-outage-cause
  never:
    - site-health
---

# Role: Status Reporter

| Escalation | Goes to |
|---|---|
| `unclear-outage-cause` | the site owner |
