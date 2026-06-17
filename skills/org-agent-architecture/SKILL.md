---
kind: skill
name: org-agent-architecture
aliases: [oaa]
description: Scaffold, decompose, validate, and maintain organizational agent hierarchies under the AGENT → ROLE → SKILL → TOOL convention (one primitive, four kinds, authority blocks, agents.lock). Use this skill whenever the user wants to create or edit an AGENT.md, ROLE.md, SKILL.md, TOOL.md, or NOUN.md; define what an agent owns, decides, escalates, or must never do; set up or reorganize a repository of agents, roles, skills, or tools; wrap an MCP server or API as a tool; split a role into sub-roles or extract a shared skill; review an agent architecture for ownership conflicts or authority gaps; or generate or update agents.lock entries — even if they don't name the convention explicitly and just say things like "give this agent a job description," "what is this agent allowed to do on its own," or "add a new tool for X."
allowed-tools:
  - read
  - write
  - edit
  - glob
  - grep
---

# Organizational Agent Architecture

This skill applies the Organizational Agent Architecture (OAA) convention for structuring multi-agent systems the way companies are structured: agents fill roles, roles require skills, skills require tools, and bounded authority composes down the chain. The full rationale lives in the convention's proposal document (PROPOSAL.md, where the repository includes it); this skill is the working procedure.

## Core Model (memorize this)

- **One primitive, four kinds.** Every node — `kind: agent | role | skill | tool` — shares one frontmatter schema: `kind`, `name`, `description`, `requires`, `authority`. The typed filename is the identity mechanism, not the directory path. Two valid forms per kind:
  - **Directory form** (default): `AGENT.md` / `ROLE.md` / `SKILL.md` / `TOOL.md` inside a named directory — use when the node has sub-folders (`memory/`, `decisions/`, `server/`) or supporting assets.
  - **Flat-file form**: `<name>.agent.md` / `<name>.role.md` / `<name>.skill.md` / `<name>.tool.md` — use when the node is self-contained in a single file with no sub-folders.
- **`requires` is the only edge.** It points to the next layer down. Never lateral or upward. Kind aliases: agents may spell it `fills`; skills may spell it `allowed-tools` (agentskills.io compatibility).
- **Authority composes by intersection.** `never` accumulates by union (deny wins everywhere), `decides` intersects (autonomous only if every declaring layer permits), `escalates` accumulates by union. Precedence: `never` > `escalates` > `decides`. **Anything listed nowhere defaults to escalate.** A layer can only narrow what it inherits — never widen it.
- **`agents.lock`** at the repository root pins every resolved node by path and content hash. Generated, committed, never hand-edited. Hashes exclude `README.md`, `memory/`, and `decisions/` (narrative and runtime state are not identity).

Before composing or auditing any authority block, read `references/authority-model.md`. Before declaring a structure valid, run `references/validation.md`. For a complete worked example of every pattern below, read `references/example-meta-ads.md`.

## Workflow: Bootstrap a Repository

Create exactly this at the root, nothing more:

```
/
├── README.md          ← universal entry point (narrative; excluded from hashes)
├── agents.lock        ← start as {"lockfileVersion": 1, "nodes": {}}
├── roles/  skills/  tools/  agents/      ← plural kind names; add nouns/ only when adopting the noun layer
```

Top-level folders are convenience, not identity. You may place all four kind folders under a single wrapper directory (e.g. `company/`) to separate agentic rules from source code, docs, or other repo contents — as long as all four folders sit together under that one wrapper. Do not invent additional nesting or prefix conventions beyond this.

When using a wrapper directory, add two files at the wrapper root:

```
company/
├── CLAUDE.md      ← OAA territory entry point: editing and compilation instructions for any AI working here
├── agents.lock    ← integrity pins for the full graph; lives here, not the repo root
├── agents/  roles/  skills/  tools/
```

`CLAUDE.md` at the wrapper root tells any AI assistant that everything below it follows the OAA convention and instructs it how to compile agents. Without it, an assistant has no context for why these files are structured as they are.

## Workflow: Create a Node

1. **Pick the kind** using the decision guide below. If torn between two kinds, the thing is probably two nodes.
2. **Choose the file form** — directory if the node needs sub-folders (`memory/`, `decisions/`, `server/`), flat file otherwise. Then copy the matching template from `assets/templates/`. Directory form: `ROLE.template.md` → `ROLE.md` inside a new directory named for the node. Flat-file form: save directly as `<name>.<kind>.md` (e.g. `budget-steward.role.md`).
3. **Fill the frontmatter first, body second.** The frontmatter is the contract; the body is operating prose. Resolve every `{{placeholder}}` — a template artifact left in a committed file is a validation failure.
4. **Add the manifest** (`assets/templates/manifest.json`) if the node is a directory.
5. **Wire `requires`** as relative paths to real nodes. If the node a `requires` should point to doesn't exist yet, create it first (tools before skills, skills before roles, roles before agents — build bottom-up).
6. **Add a lockfile entry** per `assets/templates/agents.lock.json`, or note that the lock needs regeneration if a resolver exists in this repository.

### Kind Decision Guide

| The user is describing… | Kind |
|---|---|
| A single callable capability (one API endpoint, one MCP function, one script) | **tool** |
| An MCP server or API with multiple functions | **tool** (see Tool Types below) |
| A procedure — steps, workflow, how-to, when-to | **skill** |
| An accountability — a domain someone owns, with decision rights and escalation thresholds | **role** |
| A runner — schedule, memory, model, the thing that executes | **agent** |
| An object acted upon (the subscriber list, the budget) | **noun** — or, pre-adoption, a consistently named string in authority fields |

## Workflow: Author Authority

Place each constraint at the **one layer that owns it** — the intersection rule propagates it everywhere, and duplication creates copies that drift:

- **Hard ceilings and physical-safety rules → tool `never`.** These must hold regardless of which role calls the capability ("daily-budget-over-200", "send-to-unverified-address").
- **Decision rights and human thresholds → role `decides` / `escalates`.** This is the job description ("budget-change-within-20pct-per-24h" decides; "account-policy-flag" escalates).
- **Procedure-specific failure handling → skill `escalates`** only when it is a property of that procedure ("repeated-tool-failure").
- **Agents declare nothing.** An empty/absent agent authority block means "exactly what my roles permit, bounded by what the tools forbid" — that is the design, not an omission.
- **Do not enumerate the universe.** Unlisted actions escalate by default; that is the safety net. List only what genuinely belongs in `decides` (so the agent can act) and `never` (so nothing can re-permit it).
- **Name identifiers as future nouns**: lowercase, hyphenated, canonical, reused exactly ("campaign-budgets", not "budgets" in one file and "campaign-budget" in another).

An empty `decides: []` is a legitimate role shape (a pure watcher). Never write an empty `never` to "fill in" the template — omit fields that have no content.

## Workflow: Decompose

Apply these triggers; do not decompose speculatively:

- **Split a role** when its `owns` list mixes accountabilities whose escalations different humans should review (spending money vs. making creative vs. watching the account). After the split, `owns` lists must be disjoint — run the conflict check.
- **Extract a shared skill** when two roles (or a single role's procedures) would compute or define the same thing (metric definitions, parsing rules). Place it as a standalone skill and have the role `requires` it directly alongside its procedure skills. The definition then exists in exactly one place.
- **A named tool** is the default for an MCP server or API: one `TOOL.md` with provenance, transport config, and all `never` rules consolidated. Skills reference it directly via `allowed-tools`. MCP server code, vendored packages, proxy code, and `mcp.json` go in the tool's `server/` folder — the implementation never lives outside the tool node.
- **Use the connector/capability split** only when different functions on the same server need different `never` rules that would incorrectly constrain skills that never call those functions. Split into one connector `TOOL.md` (transport-wide `never`) + one capability file per function (`requires: [./TOOL.md]`); skills then require the capability files, never the connector directly.
- **Keep the agent singular** until roles need different schedules, models, or reviewing humans; the split is then a one-line `fills` move.

## Workflow: Validate

Run the full checklist in `references/validation.md` whenever nodes are created or edited, and report findings as: **errors** (must fix: ownership overlap, upward edge, unresolvable `requires`, widened authority), **warnings** (should fix: inconsistent identifiers, missing manifest, stale lock), and **gaps** (worth raising: actions discussed in prose but absent from any authority field).

## Workflow: Compile an Agent

Compilation resolves an agent's full dependency chain into a single `AGENTS.md` runtime instruction file. The compiled file is a generated artifact — regenerate it from source whenever any node in the chain changes; never hand-edit it.

1. **Read `AGENT.md`** — collect `fills` (the list of role paths) and `metadata` (schedule, model, etc.)
2. **Walk the chain** — for each role: read `ROLE.md`, collect `owns / decides / escalates / never / requires`; for each skill those roles require: read `SKILL.md`, collect workflow steps and `authority.escalates`; for each tool those skills reference: read `TOOL.md`, collect `authority.never`, `env`, and declared functions. Do not read upward or laterally.
3. **Check `agents.lock`** — hash each node file in the resolved chain (excluding `README.md`, `memory/`, `decisions/`) and compare against pinned entries. If every hash matches, AGENTS.md is already current — stop. If any hash differs, proceed.
4. **Validate** the resolved chain per `references/validation.md`. Do not write output for an invalid graph; report errors first.
5. **Write `AGENTS.md`** into the agent's directory with this exact preamble, then the full runtime content:

   ```markdown
   <!-- GENERATED — do not hand-edit -->
   <!-- Source:    agents/{agent-name}/AGENT.md -->
   <!-- Generated: {iso-timestamp} -->
   ```

   Content sections (in order): agent identity; hard limits (all `never` rules from every tool, inlined verbatim); memory schema; run order (shared skills first, then each role with its `decides` / `escalates` / workflow pointer); escalation dispatch instructions; env var table (names only, never values); what the agent does not own (role `never` fields).

6. **Write `mcp-config.json`** next to `AGENTS.md` — merge the `server/mcp.json` of every required tool with `type: mcp` into one file, keyed by tool name. A tool of that type missing its `server/mcp.json` is reported as a compile-time warning, not silently dropped; an incomplete `--mcp-config` would otherwise fail only at run time.

7. **Update `agents.lock`** — write fresh hashes for every node touched in this compilation run.

**Do not** modify source nodes during compilation. **Do not** call any MCP tool. **Do not** run the agent's workflow. The compiler is a read + write operation on files only.

## Workflow: Ontology and Memory

The `@oaa/ontology` MCP server exposes a domain vocabulary compiler and a SQLite-backed entity store. Together they provide the shared memory layer that roles use to reason without re-fetching from external APIs on every decision.

### Three tools, three purposes

| Tool | When to call it | Who calls it |
|------|-----------------|--------------|
| `compile_schema` | Once, at agent startup, pointed at the OAA root directory. Compiles all `.rel` files, emits `schema.sql`, and opens the SQLite store. | The agent harness / bootstrap skill |
| `write_entity` | After any skill fetches or computes metrics for a base entity. Persists the current field values so derived concepts are queryable immediately. | The fetch/audit skill (e.g. `performance-audit`) |
| `query_concept` | When a role needs to evaluate a derived concept (e.g. "which campaigns are underachieving?") without making an external API call. | Any role or decision skill |

### Opening the store

Call `compile_schema` with `root_dir` set to the OAA wrapper directory (the one containing `ontology/`, `agents/`, `roles/`, etc.). The server tries three locations for the database, in order:

1. `<root_dir>/memory/ontology.db` — persists across restarts; preferred.
2. `/tmp/oaa-<hash>.db` — used when the primary path is on a filesystem that does not support SQLite writes (e.g. a Windows NTFS mount accessed from Linux).
3. `:memory:` — in-process only; resets each run. Adequate for stateless agents.

The tool response tells you which path was chosen. Record it in the agent's `memory/` folder if you need it downstream.

### Writing entities

After a skill fetches raw data and computes derived metrics, call `write_entity` once per entity instance. Fields must match property names declared in the `.rel` source (kebab-case). Unknown fields are rejected — they indicate a drift between the skill and the ontology.

```
write_entity(kind="Campaign", id="<campaign-id>", fields={
  "name": "...",
  "status": "Active",
  "rolling-3day-cpa": 28.4,
  "daily-spend-pacing": 0.97,
  "creative-frequency": 2.1
}, source="meta-ads")
```

The `source` field records which tool produced the values — useful for staleness audits.

### Querying derived concepts

Derived concepts in `.rel` compile to SQL views. `query_concept` accepts any base entity name or any derived concept name — no special handling needed.

```
query_concept(concept="UnderachievingCampaign")   // rolling-3day-cpa > 35
query_concept(concept="OverpacedCampaign")         // daily-spend-pacing > 1.25
query_concept(concept="Campaign", filters={"status": "Active"})  // equality filter on base table
```

The response includes the rows and the SQL that was executed — useful for explaining the decision to a human reviewer.

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

## Common Mistakes

- Restating a tool's `never` inside a skill or role "for safety" — it weakens nothing but creates drift; delete the duplicate.
- Putting decision thresholds on the agent — they belong to the role; the agent is replaceable.
- A skill that contains organizational judgment ("escalate purchases over $500") — that is a role's line; move it.
- Hardcoding a model name into agent identity — model choice is host configuration, recorded in the body, not the frontmatter contract.
- `requires` pointing upward (tool→skill, skill→role) — edges flow toward implementation only.
- Secrets or credential values in any node file — environment variables only; node files may name the variable, never the value.
- Treating README.md as the spec — it is regenerable narrative; the typed root file and manifest are the node.

## Files in This Skill

| File | Read when |
|---|---|
| `references/authority-model.md` | Composing, auditing, or explaining any authority block |
| `references/validation.md` | Declaring a structure valid; reviewing a change |
| `references/example-meta-ads.md` | The user wants an example, or you're unsure how a pattern looks in practice |
| `assets/templates/` | Creating any node — always copy, never write frontmatter from memory |

## Quick Template (inline fallback)

If you cannot read `assets/templates/`, use this. It is the one primitive — every kind is this same shape. Copy, set `kind`, save under the typed filename, resolve every `{{placeholder}}`, delete comments, and OMIT any field you don't need (never leave one empty).

```yaml
---
kind: {{agent | role | skill | tool}}
name: {{lowercase-hyphenated-name}}        # must match the directory (or file) name
description: {{One sentence. What this is and when to use it.}}
requires:                                  # the only edge; downward only, never upward
  - {{relative/path/to/required/node}}     # agents may spell this `fills`; skills `allowed-tools`
authority:                                 # omit entirely on agents
  owns: [{{domain}}]                       # roles only; disjoint across all roles
  decides: [{{bounded-autonomous-action}}] # roles; bounds in the name, e.g. ...-within-20pct-per-24h
  escalates: [{{human-threshold}}]         # roles; plus procedure failures on skills
  never: [{{forbidden-regardless}}]        # hard limits on tools; non-ownership on roles
---

# {{Kind}}: {{Name}}

{{Operating prose. Prose never grants or restricts — only the frontmatter composes.}}
```

Kind extras, one line each: **tool** adds `type: api|mcp|local` and `env: ENV_VAR_NAME`; **role** adds `watches: [...]` and a `decisions/` folder; **agent** adds `metadata: {schedule: ...}` and a `memory/` folder; **skill** keeps the body as the workflow steps. Composition rules: `never` unions, `decides` intersects, `escalates` unions, precedence `never` > `escalates` > `decides`, unlisted actions escalate by default.

## Tool Types

All three types share the same frontmatter shape. The `type:` field and one additional tag identify the kind:

| Type | Use when | Extra fields |
|---|---|---|
| `api` | Direct HTTP call to an external service (Resend, Stripe, etc.) | `auth: api-key\|oauth\|bearer`; `env: ENV_VAR_NAME` |
| `mcp` | Function exposed by an MCP server | `env: ENV_VAR_NAME` |
| `local` | Internal operation on the host organization's own systems (database, filesystem) | `layer: sqlalchemy\|filesystem\|internal-service`; `models: ModelName` |

**Environment variables:** name the variable in `env:`, never the value. The body may list what the variable is for; the value lives only in the execution environment.
