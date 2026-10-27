# Ontology and Memory

Moved here from `SKILL.md` in 0.8.0. One wording change: who calls `compile_schema` is now "the agent's startup step". The ontology skill is `oaa-ontology-design`.

The `@oaa/ontology` MCP server exposes a domain vocabulary compiler and a SQLite-backed entity store. Together they provide the shared memory layer that roles use to reason without re-fetching from external APIs on every decision.

### Three tools, three purposes

| Tool | When to call it | Who calls it |
|------|-----------------|--------------|
| `compile_schema` | Once, at agent startup, pointed at the OAA root directory. Compiles all `.rel` files, emits `schema.sql`, and opens the SQLite store. | The agent's startup step |
| `write_entity` | After any skill fetches or computes metrics for a base entity. Persists the current field values so derived concepts are queryable immediately. | The fetch/audit skill (e.g. `performance-audit`) |
| `query_concept` | When a role needs to evaluate a derived concept (e.g. "which campaigns are underachieving?") without making an external API call. | Any role or decision skill |

### Opening the store

Call `compile_schema` with `root_dir` set to the OAA wrapper directory (the one containing `ontology/`, `agents/`, `roles/`, etc.). The server tries three locations for the database, in order:

1. `<root_dir>/memory/ontology.db` - persists across restarts; preferred.
2. `/tmp/oaa-<hash>.db` - used when the primary path is on a filesystem that does not support SQLite writes (e.g. a Windows NTFS mount accessed from Linux).
3. `:memory:` - in-process only; resets each run. Adequate for stateless agents.

The tool response tells you which path was chosen. Record it in the agent's `memory/` folder if you need it downstream.

### Writing entities

After a skill fetches raw data and computes derived metrics, call `write_entity` once per entity instance. Fields must match property names declared in the `.rel` source (kebab-case). Unknown fields are rejected - they indicate a drift between the skill and the ontology.

```
write_entity(kind="Campaign", id="<campaign-id>", fields={
  "name": "...",
  "status": "Active",
  "rolling-3day-cpa": 28.4,
  "daily-spend-pacing": 0.97,
  "creative-frequency": 2.1
}, source="meta-ads")
```

The `source` field records which tool produced the values - useful for staleness audits.

### Querying derived concepts

Derived concepts in `.rel` compile to SQL views. `query_concept` accepts any base entity name or any derived concept name - no special handling needed.

```
query_concept(concept="UnderachievingCampaign")   // rolling-3day-cpa > 35
query_concept(concept="OverpacedCampaign")         // daily-spend-pacing > 1.25
query_concept(concept="Campaign", filters={"status": "Active"})  // equality filter on base table
```

The response includes the rows and the SQL that was executed - useful for explaining the decision to a human reviewer.

### What belongs where

- Derived concept rules (the `where:` clause) belong in the `.rel` source file, not in skill prose. Prose describes *procedure*; the ontology defines *what a concept is*.
- Do not hardcode threshold values in role or skill files if those thresholds are already expressed in the `.rel` ontology. Reference the derived concept name instead (`UnderachievingCampaign`), and let `query_concept` apply the rule.
- The `memory/` folder inside the agent directory holds the database path and any runtime scratchpad. It is excluded from `agents.lock` hashes (runtime state is not identity).

### Compilation: memory schema section

When compiling `AGENTS.md`, the **memory schema** section should list the entity kinds the agent writes and reads, like:

```markdown
## Memory Schema

Ontology store: `memory/ontology.db` (SQLite, managed by @oaa/ontology)

| Entity | Written by | Read via |
|--------|-----------|---------|
| Campaign | performance-audit skill | UnderachievingCampaign, OverpacedCampaign, FrequencyFatigueCampaign, HighEfficiencyCampaign views |
| ChannelAccount | account-health skill | FlaggedAccount view |
```
