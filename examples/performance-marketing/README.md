# Example: Performance Marketing Agent

A complete working OAA workspace demonstrating the full chain from business domain ontology through agent, roles, skills, and tool.

## The Graph

```
campaign-manager (agent)
  ├── budget-steward (role)        owns: campaign-budgets, cpa-targets
  │     ├── budget-pacing (skill)  → meta-ads (tool)
  │     └── performance-audit      → meta-ads
  └── campaign-operator (role)     owns: campaign-lifecycle, campaign-scheduling
        ├── launch-campaign        → meta-ads
        └── performance-audit      → meta-ads (shared — appears once in lockfile)
```

## Ontology

`ontology/customer-acquisition.rel` defines the business vocabulary:

- **Entities**: `Campaign`, `Channel`, `Audience`
- **Derived concepts**: `HighValueCampaign` (budget > 10000), `StaleActiveCampaign` (past end-date, still spending)
- **Tool map**: `meta-ads` — maps `Campaign` → `AdSet`, `Campaign.budget` → `AdSet.daily_budget`, etc.

`ontology/ONTOLOGY.md` is compiled output. Edit `.rel` source, then run `compile_ontology`.

## Compiled Outputs

- `agents/campaign-manager/AGENTS.md` — compiled agent chain with full authority
- `agents.lock` — integrity lockfile
- `ontology/ONTOLOGY.md` — compiled ontology reference

These files are generated. Do not edit by hand.

## Key authority decisions

| Situation | Verdict | Declared on |
|---|---|---|
| Raise daily budget $100 → $115 | **autonomous** | budget-steward `decides` (≤20%/24h) |
| Raise $100 → $140 | **escalate** | budget-steward `escalates` (>20%) |
| Set budget $600/day | **forbidden** | meta-ads `never` (ceiling $500) |
| Launch campaign with approved brief | **autonomous** | campaign-operator `decides` |
| Launch without brief | **escalate** | campaign-operator `escalates` |
| Activate a paused campaign | **forbidden** | meta-ads `never` + operator `escalates` |
| Modify targeting | **forbidden** | meta-ads `never` |
| Modify ad creative | **forbidden** | both roles `never` |

## Swap the tool, not the ontology

To add Google Ads support: add `ontology/maps/google-ads.rel` with a `map google-ads { ... }` block, create `tools/google-ads/TOOL.md`, and add it to the relevant skill `allowed-tools`. The entities, derived concepts, and authority blocks are unchanged.

## Running

```bash
# Compile the agent chain
OAA_ROOT=. node @oaa/harness --root .

# Compile the ontology
OAA_ROOT=./ontology node @oaa/ontology --root ./ontology

# Or use the MCP tools directly from Claude Code
```
