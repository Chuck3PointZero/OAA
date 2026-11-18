---
type: oaa/Skill
kind: skill
name: monitor-platform-health
description: SOP for measuring API/website health via machincy-grokbot - uptime events, security events, app errors, and write integrity. Read and list oriented; does not restart services or block IPs.
allowed-tools:
  - ../../tools/machincy-grokbot
---

# Skill: Monitor Platform Health

Produces a **platform-health packet** for the ops digest. Complements (does not replace) webservice-monitor's api-health-check and api-smoke-test; this skill aggregates list/report surfaces the Operations Manager needs for one daily view.

## Workflow

1. **Uptime.** Call `machincy-grokbot__list_uptime_events` (e.g. since last 24h). Note any `health_check_failure` or `smoke_test_failure` rows and whether they were `notified`.

2. **Security.** Call `machincy-grokbot__list_security_events` (or equivalent list) for the window. Count confirmed vs noise if the payload distinguishes them. Do not re-scan raw access logs unless investigating a specific incident already escalated - deep access-log audit belongs to security-auditor.

3. **App errors.** Call list app errors for the window. Compute `error_count` and whether it looks like a spike vs routine (use baseline from memory or instructions when present).

4. **Write integrity.** Call get write integrity report. Flag any unattributed or mismatched counts the API returns.

5. **Packet fields:**
   - `uptime_events_count` / `uptime_unnotified_count`
   - `security_events_count`
   - `app_error_count` / `app_error_spike` (boolean or note)
   - `write_integrity_ok` (boolean or short status)
   - `anomalies` - named issues for evaluate-and-flag-issues

6. **Skill-level failure.** If a list call fails (non-2xx / timeout / unparseable), record which capability failed in the packet and treat that capability as unknown - do not assume healthy. Escalate tool failure when the whole skill cannot run.

7. **Never** block IPs, restart services, execute SQL, or modify env. Prefer not to POST report_uptime_event / report_security_event from this skill unless the Operations Manager run explicitly requires a thin report and no specialist already owns that write; default is list-only and escalate to human / existing auditor roles.
