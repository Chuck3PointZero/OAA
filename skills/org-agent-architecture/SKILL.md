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
triggers:
  - give this agent a job description
  - what is this agent allowed to do on its own
  - what can this agent do without asking
  - create an AGENT.md
  - create a ROLE.md
  - create a SKILL.md
  - create a TOOL.md
  - add a new role
  - add a new agent
  - authority block
  - who decides
  - who owns this
  - escalation threshold
  - what is this agent never allowed to do
  - agents.lock
  - compile agent
  - compile the agent
  - agent hierarchy
  - wrap an MCP server
  - wrap an API as a tool
  - split a role
  - extract a shared skill
  - agent architecture
  - organizational agent
  - OAA
  - AGENT.md
  - ROLE.md
  - agent permission
  - agent authority
  - agent ownership
  - what does this agent own
  - decision rights
  - escalation rules
  - never rules
  - node validation
  - agents dot lock
  - lockfile
  - COMPANY.md
  - company map
  - ontology
  - compile schema
  - write entity
  - query concept
---

# Organizational Agent Architecture

This skill applies the Organizational Agent Architecture (OAA) convention for structuring multi-agent systems the way companies are structured: agents fill roles, roles require skills, skills require tools, and bounded authority composes down the chain. The full rationale lives in the convention's proposal document (PROPOSAL.md, where the repository includes it); this skill is the working procedure.

## Core Model

- **MUST treat the typed filename** (`AGENT.md`, `ROLE.md`, `SKILL.md`, `TOOL.md`) **as the node's identity** — never the directory path or directory name alone. Every node shares one frontmatter schema: `kind`, `name`, `description`, `requires`, `authority`. Two valid forms per kind; MUST NOT invent a third:
  - **Directory form** (default): typed file inside a named directory — use when the node needs sub-folders (`memory/`, `decisions/`, `server/`) or supporting assets.
  - **Flat-file form**: `<name>.agent.md` / `<name>.role.md` / `<name>.skill.md` / `<name>.tool.md` — use when the node is self-contained with no sub-folders.
- **MUST use `requires` as the only edge**, pointing downward only; MUST NOT allow any edge that points upward (tool→skill, skill→role) or laterally. Kind aliases: agents may spell it `fills`; skills may spell it `allowed-tools` (agentskills.io compatibility).
- **MUST apply union composition for authority**: `never` accumulates by union (deny wins everywhere — no layer can remove a `never` declared below it), `decides` accumulates by union (autonomous if any layer on the path permits), `escalates` accumulates by union. Precedence: `never` > `escalates` > `decides`. **Anything listed nowhere defaults to escalate** — that is the safety net, not an omission.
- **MUST treat `agents.lock` as a generated file**: regenerate it, commit it, never hand-edit it. It pins every resolved node by path and content hash; hashes exclude `README.md`, `memory/`, and `decisions/` (narrative and runtime state are not identity).
- **MUST read `references/authority-model.md`** before composing or auditing any authority block. **MUST run `references/validation.md`** before declaring a structure valid.

For a complete worked example of every pattern below, read `references/example-meta-ads.md`.

## Workflow: Bootstrap a Repository

Create exactly this at the root, nothing more:

```
/
├── README.md          ← universal entry point (narrative; excluded from hashes)
├── INSTRUCTIONS.md    ← binding convention rules, copied VERBATIM (unmodified) from
│                          assets/INSTRUCTIONS.md — not a template, nothing to fill in
├── agents.lock        ← start as {"lockfileVersion": 1, "nodes": {}}
├── roles/  skills/  tools/  agents/      ← plural kind names; add nouns/ only when adopting the noun layer
```

`INSTRUCTIONS.md` is the binding companion to `README.md`'s narrative — it is what a
fresh session, or a weaker/older model, reads before touching any node, so treat it as
instructions to follow, not reference material to skim. It is copied unmodified, the same file
in every company under this convention — it documents how to build *a* company, not this one
specifically. Company-specific narrative belongs in `README.md`/`CLAUDE.md`, never in this file.
Call `get_instructions()` to retrieve the canonical version; the local copy is a convenience
cache for offline/filesystem-only consumers.

Top-level folders are convenience, not identity. You may place all four kind folders under a single wrapper directory (e.g. `company/`) to separate agentic rules from source code, docs, or other repo contents — as long as all four folders sit together under that one wrapper. Do not invent additional nesting or prefix conventions beyond this.

When using a wrapper directory, add three files at the wrapper root:

```
company/
├── CLAUDE.md         ← OAA territory entry point: editing and compilation instructions for any AI working here
├── INSTRUCTIONS.md   ← binding convention rules, copied VERBATIM from assets/INSTRUCTIONS.md
├── agents.lock       ← integrity pins for the full graph; lives here, not the repo root
├── agents/  roles/  skills/  tools/
```

`CLAUDE.md` at the wrapper root is company-specific — it names this company's domain and
tells an AI assistant how to compile agents here. `INSTRUCTIONS.md` is the opposite: the same
convention rules verbatim in every company, never edited per instance. Without either, an
assistant has no context for why these files are structured as they are — or worse, has only
the narrative version and treats optional guidance as mandatory. Do not merge the two files or
let `CLAUDE.md`'s narrative bleed into `INSTRUCTIONS.md`'s rules — that would recreate the
exact per-company drift a shared, unmodified rules file exists to prevent.

## Workflow: Create a Node

0. **Before creating a new ROLE, check whether an existing role's `owns`/`decides`/
   `escalates`/`never` already describes this accountability.** OAA supports many agents
   filling one role — this is often the correct pattern for "the same job, another instance"
   (another territory, another book, another automated implementation of the same
   responsibility) rather than "a new job." Inventing a new role's authority block when an
   existing one already covers the ground produces disjoint-but-redundant `owns` domains and
   restated `never` rules that drift from the original — the exact failure this step exists
   to prevent. Create a new role only when the accountability is genuinely different, not
   merely differently implemented.

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

Place each constraint at the **one layer that owns it** — the composition rules propagate it everywhere, and duplication creates copies that drift:

- **Hard ceilings and physical-safety rules → tool `never`.** These must hold regardless of which role calls the capability ("daily-budget-over-200", "send-to-unverified-address").
- **Decision rights and human thresholds → role `decides` / `escalates`.** This is the job description ("budget-change-within-20pct-per-24h" decides; "account-policy-flag" escalates).
- **Procedure-specific failure handling → skill `escalates`** only when it is a property of that procedure ("repeated-tool-failure").
- **Agents declare nothing.** An empty/absent agent authority block means "exactly what my roles permit, bounded by what the tools forbid" — that is the design, not an omission.
- **Do not enumerate the universe.** Unlisted actions escalate by default; that is the safety net. List only what genuinely belongs in `decides` (so the agent can act) and `never` (so nothing can re-permit it).
- **Name identifiers as future nouns**: lowercase, hyphenated, canonical, reused exactly ("campaign-budgets", not "budgets" in one file and "campaign-budget" in another).

An empty `decides: []` is a legitimate role shape (a pure watcher). Never write an empty `never` to "fill in" the template — omit fields that have no content.

**Body sections are examples, not requirements.** Section headings a template
mentions (Memory, Decisions Log, or similar) illustrate what operating prose
*might* contain — never a required-sections checklist. A node whose frontmatter
is self-explanatory needs no body beyond a one-line mission, and that is fully
valid; do not flag a missing example section as a finding of any severity. See
`assets/templates/ROLE.template.md` for the minimal-valid shape.

## Workflow: Decompose

Apply these triggers; do not decompose speculatively:

- **Split a role** when its `owns` list mixes accountabilities whose escalations different humans should review (spending money vs. making creative vs. watching the account). After the split, `owns` lists must be disjoint — run the conflict check.
- **Extract a shared skill** when two roles (or a single role's procedures) would compute or define the same thing (metric definitions, parsing rules). Place it as a standalone skill and have the role `requires` it directly alongside its procedure skills. The definition then exists in exactly one place.
- **A named tool** is the default for an MCP server or API: one `TOOL.md` with provenance, transport config, and all `never` rules consolidated. Skills reference it directly via `allowed-tools`. MCP server code, vendored packages, proxy code, and `mcp.json` go in the tool's `server/` folder — the implementation never lives outside the tool node.
- **Use the connector/capability split** only when different functions on the same server need different `never` rules that would incorrectly constrain skills that never call those functions. Split into one connector `TOOL.md` (transport-wide `never`) + one capability file per function (`requires: [./TOOL.md]`); skills then require the capability files, never the connector directly.
- **Keep the agent singular** until roles need different schedules, models, or reviewing humans; the split is then a one-line `fills` move.

## Pattern: Multiple Agents, One Role

When the same accountability needs many independent, isolated instances — multiple
territories, multiple accounts, multiple books, multiple automated implementations of one
job — fill the role with many agents rather than forking the role per instance. Each agent's
own `## Memory`/runtime state carries the instance-specific data (this territory's numbers,
this book's positions), since state lives per-agent, not per-role. The role's authority
(`owns`/`decides`/`escalates`/`never`) is the shared contract every instance inherits
identically; only the runtime state and the underlying implementation differ per agent. This
is the same pattern already used for splitting one role's work across schedule-differentiated
agents — just applied to parallel siblings instead of sequential phases.

## Workflow: Validate

Run the full checklist in `references/validation.md` whenever nodes are created or edited, and report findings as: **errors** (must fix: ownership overlap, upward edge, unresolvable `requires`, widened authority), **warnings** (should fix: inconsistent identifiers, missing manifest, stale lock), and **gaps** (worth raising: actions discussed in prose but absent from any authority field). Every reported finding must cite the exact rule it violates (see `validation.md`'s preamble) — an uncitable finding is not reported.

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

### Optional: Compact Prompt (Pass 2)

If `compile_agent` returns `compactNeeded: true` (the agent's `AGENT.md` has `models: [tiny]`), perform Pass 2 after the steps above:

1. Call `get_compact_prompt_template()` to get the rewriting instructions.
2. Read `AGENTS.orig.md` (the narrative backup `compile_agent` just wrote alongside `AGENTS.md`).
3. Rewrite it following those instructions — Identity, Tools, Rules, Workflow, Output contract; cut all rationale, history, and explanatory prose; keep every tool name, env var, and never-list item verbatim.
4. Verify every tool name, env var, and never-list item from `AGENTS.orig.md` appears verbatim in your rewrite before writing anything.
5. Write the compact result to `AGENTS.md`, with `<!-- compacted: see AGENTS.orig.md for the narrative source -->` as the first line.
6. If the fact-retention check fails, leave `AGENTS.md` as the narrative version Pass 1 wrote and report what was missing. The next `compile_agent` call will retry automatically.

## Workflow: Compile Company Map

`COMPANY.md` is a generated artifact — the plain-English reference that maps every role to its agent, schedule, and authority boundaries without requiring a reader to open the full node tree. Never hand-edit it; regenerate it whenever any `AGENT.md`, `ROLE.md`, or `SKILL.md` in the graph changes.

1. **Run validation first.** Execute the full checklist in `references/validation.md` against the current graph. Collect every **gap**-severity finding. This is a precondition, not optional — `COMPANY.md`'s `## Gaps` section is sourced only from this run's actual findings, never authored freeform.

2. **Read every node in the graph.** For each agent: `AGENT.md` frontmatter (name, `fills`, `metadata.schedule`). For each role those agents fill: `ROLE.md` frontmatter (`owns`, `decides`, `escalates`, `never`) and body prose. For each skill those roles require: `SKILL.md` frontmatter (`name`, `description`, `allowed-tools`). For each tool those skills reference: `TOOL.md` frontmatter (`name`). Do not read upward or laterally.

3. **Apply the company-map prompt.** Call `get_company_map_prompt()` to retrieve the prompt (see Addendum B1 in OAA-REPAIRS.md for this tool's implementation). If the harness tool is not yet available, read `assets/prompts/company-map-system-prompt.md` directly as a fallback — same content, same effect. Pass the collected node data AND the gap-severity findings from step 1 to that prompt and synthesize `COMPANY.md` prose, including its `## Gaps` section.

4. **Verify before writing.** Every role in the graph must appear in the Roles section. Every agent must appear in the mapping table. No authority rule, threshold, or tool name in the output may be absent from the source nodes. Every line in `## Gaps` must correspond exactly to a gap-severity finding from step 1 — no more, no fewer; if step 1 found zero gaps, the section still appears with one line saying so. If any invented content is detected, abort and report what was fabricated.

5. **Write `COMPANY.md`** to the OAA wrapper root (the directory containing `agents/`, `roles/`, `skills/`, `tools/`). The first line after the heading must be:

   ```markdown
   <!-- GENERATED — do not hand-edit. Regenerate by following the "Compile Company Map" workflow in the OAA skill. -->
   ```

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

## Scenario Workflows

### Scenario: New system from scratch
When the user says "set up OAA for a new project" or "I need an agent for X from zero":
1. Bootstrap the repository structure (wrapper dir + four kind folders + `CLAUDE.md` + `INSTRUCTIONS.md` copied verbatim from `assets/INSTRUCTIONS.md` + empty `agents.lock`)
2. Identify the domain — what does the agent need to do, what does it own, what must it never do
3. Build bottom-up: create tools first, then skills, then roles, then agent
4. Author authority at the correct layer (tool `never`, role `decides`/`escalates`)
5. Compile the agent — walk chain, validate, write `AGENTS.md` + `mcp-config.json`
6. Update `agents.lock`
7. Run the Validation Checklist

### Scenario: Add an agent to an existing system
When the user wants a new agent in a repo that already has OAA structure:
1. Run the Kind Decision Guide — confirm agent is the right kind (not a new role for an existing agent)
2. Check whether the needed roles and tools already exist; create only what's missing
3. Build any new nodes bottom-up
4. Wire `fills` on the new `AGENT.md` to existing roles
5. Check `owns` for ownership conflicts with existing roles
6. Compile and update `agents.lock`
7. Run the Validation Checklist

### Scenario: Authority audit
When something went wrong, a role feels too broad, or a user asks "what is this agent allowed to do":
1. Read `references/authority-model.md`
2. Walk the full chain for the agent in question: agent → roles → skills → tools
3. Collect all `decides`, `escalates`, and `never` fields
4. Apply composition rules: union all three; precedence `never` > `escalates` > `decides`
5. Report: what the agent can do autonomously, what triggers escalation, what is categorically forbidden
6. Flag any action discussed in prose but absent from any authority field (gap)
7. Flag any `never` duplicated across layers (drift) or any identifier with spelling variants across layers (error)
8. Run the Validation Checklist

### Scenario: Decompose a bloated role
When a role's `owns` list has grown to cover multiple accountabilities
with different human reviewers, or two roles define the same concept:
1. List every item in `owns` and identify which human should review escalations for each
2. Draw the split line — each new role gets a disjoint slice of `owns`
3. Check whether any skill is procedure-only (stays with one role) or shared (extract it)
4. Create new role nodes; move authority fields to the correct new role
5. Update `requires` on the agent to reference both new roles
6. Confirm `owns` lists are disjoint across the whole graph
7. Recompile all affected agents; update `agents.lock`
8. Run the Validation Checklist

## Common Mistakes

- MUST NOT restate a tool's `never` inside a skill or role "for safety" —
  duplication creates drift without adding safety; delete the duplicate.
- MUST NOT place decision thresholds on the agent — they belong to the role;
  the agent is replaceable, the role is not.
- MUST NOT put organizational judgment inside a skill body ("escalate purchases
  over $500") — if it is a threshold or ownership decision, it is a role's line.
- MUST NOT hardcode a model name in agent identity frontmatter — model choice is
  host configuration, recorded in the body prose only.
- MUST NOT allow `requires` edges to point upward (tool→skill, skill→role) or
  laterally — edges flow toward implementation only.
- MUST NOT store credential values in any node file — env var names only; the
  value lives only in the execution environment.
- MUST NOT treat `README.md` as the spec — it is regenerable narrative; the
  typed root file and manifest are the node.
- MUST NOT leave `{{placeholder}}` strings in any committed node file —
  unresolved placeholders are a validation failure, not a draft marker.
- MUST NOT hand-edit `AGENTS.md` or `COMPANY.md` — both are generated
  artifacts; edit source nodes and recompile.
- MUST NOT hand-author run order, memory schema tables, or env-var tables in
  AGENT.md body prose — these are compile-agent's generated sections; source of
  truth is the role's `## Memory` section and the tool's `env:` field, and a
  hand-copy goes stale the moment either changes.
- MUST NOT flag a missing example-only body section (Outputs, Metrics, Inputs,
  Handoffs, or similar) as a finding of any severity — these are illustrations
  of what prose might contain, not a required-sections checklist.
- MUST NOT model an external autonomous system as a TOOL because it's "just an
  API to call" — check whether it exercises independent judgment (makes its own
  LLM calls, plans its own steps, has its own persona/system prompt) before
  choosing the kind. A tool is dumb by convention; something that reasons on its
  own is an AGENT with `executor: remote`, filling whichever role its output
  accountability actually matches.

## Validation Checklist

Run this before declaring any OAA work done in a session. This is a session-end
summary — `references/validation.md` is the canonical, full checklist.

**Node integrity**
- [ ] Every node has a typed filename (`AGENT.md` / `ROLE.md` / `SKILL.md` / `TOOL.md`)
      or a typed flat file (`<name>.<kind>.md`) — no other naming form used
- [ ] No `{{placeholder}}` remains in any committed node file
- [ ] Every `requires` (or `fills` / `allowed-tools`) edge points downward only
- [ ] No secrets or credential values appear in any node file
- [ ] `INSTRUCTIONS.md` is present at the repository or wrapper root

**Authority correctness**
- [ ] `never` rules live at the tool layer; none duplicated in skills or roles
- [ ] `owns` lists are disjoint across all roles in the graph
      (no two roles claim the same domain)
- [ ] Decision thresholds live in role `decides` / `escalates`, not on the agent
- [ ] Agent frontmatter has no `authority` block (agents declare nothing)

**Compilation**
- [ ] `agents.lock` updated after any node change
- [ ] `AGENTS.md` marked `<!-- GENERATED — do not hand-edit -->`
- [ ] `COMPANY.md` (if present) marked generated and regenerated after role changes
- [ ] `mcp-config.json` present for every agent that requires MCP tools

**Structure**
- [ ] Build order honored: tools created before skills, skills before roles,
      roles before agents
- [ ] No speculative decomposition — roles split only when `owns` mixes
      accountabilities with different human reviewers
- [ ] Shared skills extracted only when two or more nodes define the same thing

## Files in This Skill

| File | Read when |
|---|---|
| `references/authority-model.md` | Composing, auditing, or explaining any authority block |
| `references/validation.md` | Declaring a structure valid; reviewing a change |
| `references/executor.md` | Setting `executor` or `models` on an agent; understanding local vs remote dispatch |
| `references/runner.md` | Running a compiled agent or a whole company — triggers, tools as pickup points, scheduler patterns |
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

Kind extras, one line each: **tool** adds `type: api|mcp|local` and `env: ENV_VAR_NAME`; **role** adds `watches: [...]` and a `decisions/` folder; **agent** adds `metadata: {schedule: ...}` and a `memory/` folder; **skill** keeps the body as the workflow steps. Composition rules: `never` unions, `decides` unions, `escalates` unions, precedence `never` > `escalates` > `decides`, unlisted actions escalate by default.

## Tool Types

All three types share the same frontmatter shape. The `type:` field and one additional tag identify the kind:

| Type | Use when | Extra fields |
|---|---|---|
| `api` | Direct HTTP call to an external service (Resend, Stripe, etc.) | `auth: api-key\|oauth\|bearer`; `env: ENV_VAR_NAME` |
| `mcp` | Function exposed by an MCP server | `env: ENV_VAR_NAME` |
| `local` | Internal operation on the host organization's own systems (database, filesystem) | `layer: sqlalchemy\|filesystem\|internal-service`; `models: ModelName` |

**Environment variables:** name the variable in `env:`, never the value. The body may list what the variable is for; the value lives only in the execution environment.
