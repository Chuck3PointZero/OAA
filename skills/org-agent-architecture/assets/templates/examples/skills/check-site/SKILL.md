---
type: oaa/Skill
kind: skill
name: check-site
description: Probes the site once and escalates when it has failed on two checks in a row.
allowed-tools:
  - ../../tools/site-probe
authority:
  escalates:
    - site-probe-unavailable
---

# Skill: Check Site

## Workflow

1. Call `probe_site`. If it cannot run, escalate `site-probe-unavailable` and stop.
2. A check **fails** when `status` is not 200, or `ms` is over 5000.
3. Read the previous result from memory. If this check failed and the previous one failed too,
   escalate `site-down` once, and do not escalate again until a check passes.
4. Write this check's result to memory.
