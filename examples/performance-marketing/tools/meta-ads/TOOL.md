---
kind: tool
name: meta-ads
description: Wraps the Meta Marketing API for campaign and budget operations; enforces spend ceilings and activation rules regardless of caller.
type: mcp
env: META_ACCESS_TOKEN
concept-map: meta-ads    # references the map tool name in ontology/customer-acquisition.rel
provenance:
  source: github.com/pipeboard-co/meta-ads-mcp
  status: third-party
  vendored: server/vendor/meta-ads-mcp
  pinned-in: agents.lock
authority:
  never:
    - daily-budget-over-500-per-campaign    # hard ceiling regardless of role grant
    - activate-campaign-without-approval    # human gate always required for activation
    - modify-targeting-on-any-campaign      # targeting changes always require human review
    - delete-campaign                       # irreversible; never autonomous
    - access-payment-methods               # payment is out of scope for this tool
---

# Tool: Meta Ads

Wraps the [Meta Marketing API](https://developers.facebook.com/docs/marketing-apis/) via the `meta-ads-mcp` MCP server. Authenticates with a long-lived system user access token passed as `META_ACCESS_TOKEN`.

**Auth model**: System user token with `ads_management` and `ads_read` permissions on the ad account. Token is read from the environment — never hard-coded, never logged.

**Rate limits**: Meta enforces a per-account call budget. The proxy layer queues burst calls and retries with exponential backoff up to 3 times before surfacing an error.

## Declared Functions

| Function | Description |
|---|---|
| `get_campaigns` | List campaigns with status, daily budget, and rolling spend |
| `get_campaign_insights` | Fetch CPA, CTR, impressions, frequency for a date range |
| `update_campaign` | Update `daily_budget`, `status`, or `name` on an existing campaign |
| `create_campaign` | Create a new campaign in PAUSED status |

## server/

- `server/mcp.json` — transport config (stdio; reads `META_ACCESS_TOKEN` from env)
- `server/proxy/` — enforcement layer; applies every `never` rule before forwarding
- `server/vendor/meta-ads-mcp/` — vendored upstream, hash-pinned in `agents.lock`

## Concept Map

Business vocabulary from `ontology/customer-acquisition.rel` maps to this tool's API fields:

| Business Concept | Meta API Object | Notes |
|---|---|---|
| `Campaign` | `AdSet` | Meta's AdSet is the budget-holding object |
| `Campaign.budget` | `AdSet.daily_budget` | in account currency subunits (cents) |
| `Campaign.objective` | `AdSet.optimization_goal` | enum mapping in launch-campaign skill |
| `Campaign.start-date` | `AdSet.start_time` | Unix timestamp |
| `Channel` | implicit | inferred from ad account placement settings |
