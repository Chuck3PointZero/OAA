---
type: oaa/Role
kind: role
name: site-watcher
description: Accountable for noticing when the site is down, and for telling the owner.
requires:
  - ../../skills/check-site
authority:
  owns:
    - site-health
  decides: []
  escalates:
    - site-down
    - site-probe-unavailable
  never:
    - site-decisions
---

# Role: Site Watcher

A pure watcher: it finds a problem and escalates it, and never acts on the site.

| Escalation | Goes to |
|---|---|
| `site-down` | the site owner |
| `site-probe-unavailable` | the site owner |
