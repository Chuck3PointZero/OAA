<!-- GENERATED - do not hand-edit. Regenerate by following the "Compile Company Map" workflow in the OAA skill. -->

# Machincy Operations Manager - Company Map

Orbit monitors the Machincy website and API via **machincy-grokbot** (HTTPS + `X-API-Key`). It reads signup state, inbound email backlog, and platform health; flags issues against thresholds; and posts one ops digest per run. It never dispatches mail, changes subscriber status, or touches infrastructure.

---

## Agent -> Role Mapping

| Agent | Role | Schedule | Model |
|---|---|---|---|
| orbit | operations-manager | `0 9 * * *` | host default |

---

## Roles

### operations-manager

Single entry point for Machincy website and API operations.

| Field | Values |
|---|---|
| **Owns** | `website-api-ops-rhythm`, `open-loop-visibility`, `company-ops-digest`, `signup-health-surface`, `inbound-email-ops-surface`, `platform-health-surface` |
| **Decides** | `evaluate-metric-against-threshold`, `flag-issue`, `compose-and-route-ops-digest`, `recommend-human-action`, `signup-velocity-and-status`, `inbound-email-backlog`, `healthz-and-uptime`, `security-events`, `app-error-logs`, `write-integrity` |
| **Escalates** | `signup-anomaly`, `welcome-dispatch-gap`, `inbound-backlog-past-sla`, `bounce-or-complaint-spike`, `healthz-unreachable`, `smoke-or-uptime-failure`, `confirmed-security-incident`, `app-error-spike`, `unattributed-database-write`, `audit-digest-dispatch-failure` |
| **Never** | `queue-bulk-newsletter-dispatch`, `reply-to-inbound-email`, `register-or-resubscribe-reader`, `process-unsubscribe`, `update-user-tier`, `restart-or-redeploy-services`, `modify-environment-configuration`, `block-or-ban-ip-addresses`, `execute-raw-sql`, `touch-another-agents-memory` |

---

## Skills

| Skill | Tool | Purpose |
|---|---|---|
| monitor-signups | machincy-grokbot | Lists subscribers; computes signup-health packet (volume, welcome gaps, status mix) |
| monitor-inbound-email | machincy-grokbot | Lists inbound support queue; computes inbound-email packet (open count, oldest age, past-SLA) |
| monitor-platform-health | machincy-grokbot | Lists uptime events, security events, app errors, write integrity; computes platform-health packet |
| evaluate-and-flag-issues | - | Pure judgment: applies thresholds against the three packets; outputs flagged_issues list |
| compose-ops-digest | - | Stitches packets and flagged_issues into one short human-facing ops digest |

---

## Tools

### machincy-grokbot

| Field | Value |
|---|---|
| **Connector** | `api` (HTTPS) |
| **Auth** | `X-API-Key: $API_KEY` |
| **Env vars** | `API_KEY`, `MACHINCY_API_BASE` |
| **Declared functions** | `list_subscribers`, `lookup_user`, `list_inbound_emails`, `list_access_logs`, `list_security_events`, `list_uptime_events`, `list_campaign_drafts`, `list_app_errors`, `get_write_integrity_report` |

Hard limits (tool `never` - cannot be overridden by any layer):
`execute-raw-sql`, `drop-tables`, `bypass-api-routing`, `read-other-service-secrets`, `block-or-ban-ip-addresses`, `return-above-tier-data-without-channel-context`, `overwrite-existing-observation`, `write-join-edge-without-confirm-call`, `hard-delete-observation-records`, `queue-bulk-newsletter-dispatch`, `reply-to-inbound-email`, `register-or-resubscribe-reader`, `process-unsubscribe`, `update-user-tier`, `create-or-update-campaign-draft`

Note: `machincy-api` (local MCP) remains available for local runners and Cursor agents; it is a separate tool from `machincy-grokbot`.

---

## Gaps

The following issues were identified during compilation validation. They do not block runtime but should be resolved.

1. **`INSTRUCTIONS.md` missing at `company/`** - The OAA binding convention rules file (`INSTRUCTIONS.md`, copied verbatim from `assets/INSTRUCTIONS.md`) is absent from the wrapper root. A fresh session has no convention context without it.

2. **`CLAUDE.md` missing at `company/`** - The company-specific OAA entry point is absent. Without it, an AI working in this directory has no instructions for how to compile or edit agents here.

3. **Role duplicates tool `never` rules** - `operations-manager` restates 7 hard limits already declared on `machincy-grokbot`: `queue-bulk-newsletter-dispatch`, `reply-to-inbound-email`, `register-or-resubscribe-reader`, `process-unsubscribe`, `update-user-tier`, `execute-raw-sql`, `block-or-ban-ip-addresses`. Per OAA convention, hard ceilings belong only at the tool layer; duplicates in the role create drift when the tool's list is updated. Remove the duplicates from `ROLE.md`.
