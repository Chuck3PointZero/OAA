---
type: oaa/Tool
kind: tool
name: machincy-grokbot
description: Direct HTTPS access to the production Machincy API for Grok Bot. Uses X-API-Key auth and read/list surfaces for Orbit ops monitoring. Not the local MCP server.
connector: api
env: API_KEY
env: MACHINCY_API_BASE
authority:
  never:
    - execute-raw-sql
    - drop-tables
    - bypass-api-routing
    - read-other-service-secrets
    - block-or-ban-ip-addresses
    - return-above-tier-data-without-channel-context
    - overwrite-existing-observation
    - write-join-edge-without-confirm-call
    - hard-delete-observation-records
    - queue-bulk-newsletter-dispatch
    - reply-to-inbound-email
    - register-or-resubscribe-reader
    - process-unsubscribe
    - update-user-tier
    - create-or-update-campaign-draft
---

# Tool: Machincy Grok Bot (HTTPS API)

Grok Bot calls the **real** Machincy API over HTTPS from the cloud computer. This tool is separate from `machincy-api` (local MCP). Local Cursor/runner agents keep using `machincy-api`; Orbit on Grok Bot uses **machincy-grokbot**.

## Connection

| Item | Value |
|------|--------|
| Base URL | Environment `MACHINCY_API_BASE` (e.g. `https://YOUR_DOMAIN/api/v1`) |
| Auth | Header `X-API-Key: $API_KEY` |
| Env secrets | `API_KEY` (required), `MACHINCY_API_BASE` (required) |

Values live only in the Grok Bot secret/env store - never in prompts or this file.

## How to call

```bash
curl -sS -H "X-API-Key: $API_KEY" "$MACHINCY_API_BASE/signup?limit=1"
```

Use the cloud computer's HTTP client (`curl` or equivalent). Expect JSON. Non-2xx, timeout, or unparseable body is a tool failure for that call.

## Declared functions (read / list)

| Function | Method and path | Purpose |
|----------|-----------------|--------|
| `list_subscribers` | `GET /signup` | Signup health; query `status`, `welcome_sent`, `email`, `skip`, `limit` |
| `lookup_user` | `GET /users/lookup` | Optional context by email / Stripe id |
| `list_inbound_emails` | `GET /admin/support/inbound` | Inbound backlog |
| `list_access_logs` | `GET /admin/security/access-logs` | Access logs (investigate only) |
| `list_security_events` | `GET /admin/security/events` | Security events |
| `list_uptime_events` | `GET /admin/infra/events` | Uptime / smoke failure events |
| `list_campaign_drafts` | `GET /admin/campaign-drafts` | Optional pipeline visibility |
| `list_app_errors` | App errors list endpoint (audit) | Unhandled backend exceptions |
| `get_write_integrity_report` | Write integrity endpoint (audit) | Unattributed write detection |

Path details match the production FastAPI routes documented on the main `machincy-api` tool (capabilities A, G, I, K, O, S, T, V, W). Prefer `limit=1` or a bounded window for smoke; use a 24h window for daily ops.

## Not declared (do not call)

- `POST /signup`, PATCH subscriber, unsubscribe token flow  
- `POST /admin/dispatch` (bulk newsletter)  
- Inbound triage write / reply  
- `PATCH` user tier  
- Report/post endpoints unless a human run explicitly requires a thin alert and no specialist owns it  
- Any raw SQL or admin actions outside the table above  

## Relationship to machincy-api

| Tool | Runtime | Transport |
|------|---------|-----------|
| `machincy-api` | Local runner / Cursor MCP | `connector: mcp` |
| `machincy-grokbot` | Grok Bot cloud computer | `connector: api` (HTTPS) |

Same backend. Different access path. Orbit skills `allowed-tools` point at **machincy-grokbot**.
