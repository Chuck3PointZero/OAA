---
type: oaa/Skill
kind: skill
name: evaluate-and-flag-issues
description: SOP for deciding which signup, inbound-email, and platform-health packet items require human attention. No tools; pure judgment against role thresholds.
allowed-tools: []
---

# Skill: Evaluate and Flag Issues

## Workflow

1. **Inputs.** Require the three packets: signup-health, inbound-email, platform-health. If a packet is missing because a monitor skill failed, treat that domain as **unknown** and flag `monitor-skill-failure` for that domain.

2. **Apply thresholds** (from role defaults or run instructions), for example:
   - welcome_not_sent_count above N → flag `welcome-dispatch-gap`
   - past_sla_count > 0 → flag `inbound-backlog-past-sla`
   - uptime failures or unnotified uptime rows → flag `smoke-or-uptime-failure` / `uptime-alert-dispatch-failure`
   - security_events_count > 0 with confirmed incident semantics → flag `confirmed-security-incident`
   - app_error_spike or write_integrity not ok → flag `app-error-spike` / `unattributed-database-write`
   - signup volume anomaly strings from the packet → flag `signup-anomaly`

3. **Output.** A `flagged_issues` list: each item has `code`, `summary`, `source_packet`, and `recommend` (what the human should consider). Drop informational noise that does not need a human today.

4. **Hand off** flagged_issues to compose-ops-digest. Immediate escalate paths (security incident, healthz/uptime red) may short-circuit to the human before digest time if the run instructions say so.
