# Example: Performance Marketing Agent

A complete OAA workspace demonstrating the full chain from business domain ontology through agent, roles, skills, and tool. One agent, three roles, four skills (one shared across all three roles), one tool.

## The Graph

```
ads-manager (agent)
  ├── fills: budget-steward      owns: campaign-budgets, cpa-targets
  │     ├── budget-pacing        → meta-ads
  │     └── performance-audit    → meta-ads (shared)
  ├── fills: creative-manager    owns: ad-creatives, creative-rotation
  │     ├── launch-campaign      → meta-ads
  │     └── performance-audit    → meta-ads (shared)
  └── fills: account-sentinel    owns: meta-ad-account-health; decides: []
        ├── account-monitoring   → meta-ads
        └── performance-audit    → meta-ads (shared)
```

`performance-audit` is required by all three roles but appears exactly once in `agents.lock`. Deduplication is structural — by resolved path, not by name.

Why three roles for one agent? Because the three accountabilities escalate to *different humans*: budget changes go to Finance, creative decisions go to the Creative team, account health alerts go to Ops. Splitting them into separate roles is what makes escalation routing precise.

`account-sentinel` has `decides: []` — a pure watcher. It owns the account health domain but makes no autonomous decisions. This is intentional.

## Ontology

`ontology/customer-acquisition.rel` defines the business vocabulary:

- **Entities**: `Campaign`, `Channel`, `Audience`
- **Derived concepts**:
  - `UnderachievingCampaign` — rolling 3-day CPA > 35
  - `HighValueCampaign` — budget > 10000
  - `StaleActiveCampaign` — past end-date but still spending
- **Tool map**: `meta-ads` — maps `Campaign` → `AdSet`, `Campaign.budget` → `AdSet.daily_budget`, etc.

`ontology/ONTOLOGY.md` is compiled output. Edit the `.rel` source, then run `compile_ontology`.

## Compiled Outputs

- `agents/ads-manager/AGENTS.md` — compiled agent chain with full authority (generated)
- `agents/ads-manager/mcp-config.json` — merged tool server configuration (generated)
- `agents.lock` — resolved path URIs + SHA-256 hash for every node in the chain
- `ontology/ONTOLOGY.md` — compiled ontology reference (generated)

Do not hand-edit generated files. `compile_agent` overwrites them silently.

## Authority Decisions

| Action | Verdict | Why |
|---|---|---|
| Raise budget $100 → $110 | **Autonomous** | `budget-steward` decides (≤20%/24h), under tool's $200 ceiling |
| Raise budget $100 → $130 | **Escalate** | `budget-steward` escalates (>20%/24h) → Finance |
| Set $250/day budget | **Forbidden** | `meta-ads` never; no role can widen it |
| Activate ad after drafting | **Forbidden** | `meta-ads` never (`activate-campaign-without-approval`) |
| Swap creative (approved brief) | **Autonomous** | `creative-manager` decides |
| Launch new creative without brief | **Escalate** | `creative-manager` escalates → Creative team |
| Duplicate to new geography | **Escalate** | unlisted anywhere → default disposition |
| Account policy violation detected | **Escalate** | `account-sentinel` escalates → Ops |

The tool's `never` block is the security primitive. Hard limits live in one node. No skill, role, or agent anywhere in the chain can override them.

## Swap the tool, not the ontology

To add Google Ads support: add a `map google-ads { ... }` block to the ontology, create `tools/google-ads/TOOL.md`, and add it to the relevant skill `allowed-tools`. The entities, derived concepts, and authority blocks are unchanged.

## Running

```bash
# Step 1: Install the OAA skill
npx skills add Chuck3PointZero/OAA --skill '*'

# Step 2: Add the MCP servers
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#v0.5.0:harness
claude mcp add oaa-ontology -- env NODE_OPTIONS=--experimental-sqlite \
  npx -y github:Chuck3PointZero/OAA#v0.5.0:ontology

# Step 3: Compile the agent chain (from Claude Code with harness MCP connected)
# Ask: compile_agent agents/ads-manager/AGENT.md

# Step 4: Compile the ontology
# Ask: compile_ontology ontology/customer-acquisition.rel

# Step 5: Run the compiled agent
claude -p "Begin your run." \
  --permission-mode dontAsk \
  --system-prompt-file "agents/ads-manager/AGENTS.md" \
  --mcp-config "agents/ads-manager/mcp-config.json" \
  --strict-mcp-config
```
