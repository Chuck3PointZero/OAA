# Organizational Agent Architecture (OAA)

Agent skills for structuring multi-agent systems the way companies are structured: agents fill roles, roles require skills, skills require tools, and bounded authority composes down the chain.

---

## Skills

| Skill | Description |
|-------|-------------|
| `org-agent-architecture` | Scaffold, decompose, validate, and compile organizational agent hierarchies. Use when creating or editing AGENT.md, ROLE.md, SKILL.md, or TOOL.md files; defining decision rights and escalation thresholds; reviewing an agent graph for ownership conflicts; or generating agents.lock entries. |
| `oaa-ontology-design` | Author and validate OAA business domain ontologies using the `.rel` formal language. Use when creating or editing `.rel` ontology source files, defining business entities and tool vocabulary maps, or compiling/validating the domain ontology. |

---

## Install

### Universal (Vercel skills CLI)

```bash
npx skills add Chuck3PointZero/OAA --skill '*'
```

To update:

```bash
npx skills update
```

### Agent install matrix

| Agent | Command |
|-------|---------|
| Claude Code | `claude skills add Chuck3PointZero/OAA` |
| Cursor | Add to `.cursor/mcp.json` - see [Cursor guide](#cursor) |
| GitHub Copilot / VS Code | Add to `.github/copilot-instructions.md` - see [Copilot guide](#copilot) |
| Codex | `codex skills add Chuck3PointZero/OAA` |
| Claude Desktop | See [Claude Desktop guide](#claude-desktop) |
| Windsurf | See [Windsurf guide](#windsurf) |

---

## Per-Agent Install Guides

<details>
<summary><strong>Claude Code</strong> (recommended: plugin install)</summary>

One command adds the marketplace pinned to `stable`; a second installs the plugin, which bundles both skills, the compile-and-validate utility, and the ontology MCP server:

```bash
/plugin marketplace add Chuck3PointZero/OAA@stable
/plugin install organizational-agents@oaa
```

The `@stable` suffix pins the marketplace to the currently-blessed release; `/plugin marketplace update` picks up new releases as they're cut. Once installed, mention OAA or ask to create an agent hierarchy and the skills activate automatically. The compile-and-validate utility (`oaa.mjs`, see [The compile and validate utility](#the-compile-and-validate-utility)) ships inside the skill and needs only Node, and the ontology/memory toolchain is live from the first install. The plugin no longer starts an `oaa-harness` MCP server.

**Fallback - separate skill and ontology installs** (for older Claude Code without plugin support):

```bash
claude skills add Chuck3PointZero/OAA
claude mcp add oaa-ontology -- env NODE_OPTIONS=--experimental-sqlite npx -y github:Chuck3PointZero/OAA#stable:ontology
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Install the skill. Compile and validate run through the utility that ships with it, so no MCP server is needed:

```bash
npx skills add Chuck3PointZero/OAA --skill '*'
```

See [The compile and validate utility](#the-compile-and-validate-utility).

</details>

<details>
<summary><strong>GitHub Copilot / VS Code</strong></summary>

Add the skill content to your repository's `.github/copilot-instructions.md`, or reference it via your VS Code workspace settings:

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    { "file": ".agents/skills/org-agent-architecture/SKILL.md" }
  ]
}
```

Install via skills CLI:

```bash
npx skills add Chuck3PointZero/OAA --skill '*'
```

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Install the OAA skill. Compile and validate run through the utility that ships with it, so no harness MCP server is needed: see [The compile and validate utility](#the-compile-and-validate-utility). Add the ontology server only if you use the ontology skill.

</details>

<details>
<summary><strong>Windsurf</strong></summary>

```bash
npx skills add Chuck3PointZero/OAA --skill '*'
```

Compile and validate run through the utility that ships with the skill: see [The compile and validate utility](#the-compile-and-validate-utility).

</details>

---

## Upgrading to v0.6.0

**New - `references/runner.md`.** A dedicated reference doc for how to run a compiled agent and how to run a whole company. Covers the canonical single-agent invocation, the three trigger types (schedule / event / on-demand), how work flows between roles through the tools they share, a minimal cron-driver pseudocode pattern, and the failure modes a naive scheduler misses. `SKILL.md` now surfaces both `runner.md` and `executor.md` in its Files table. No code changes - harness and ontology behavior are byte-identical to 0.5.0; the version bump keeps a single release tag reaching both servers.

## Upgrading to v0.5.0

**Breaking change - `decides` union.** Authority composition for `decides` (autonomous actions) has changed from **intersection** (intersection of all roles) to **union** (the sum of all roles). An agent filling multiple roles now holds the combined autonomous authority of all its roles. Prohibitions (`never`) still union and still override all grants.

**Also new in v0.5.0:**
- **Agent Narrative Body:** The narrative content of `AGENT.md` is now rendered into the generated `AGENTS.md`, allowing agents to carry their own specific context independent of their roles.
- **Introduction Slide Deck:** A comprehensive technical introduction was added in `docs/introduction/` (archived in 0.8 as `docs/archive/v0.7/`; it describes the 0.7 harness).
- **Node Search Optimization:** `node_modules` are now explicitly ignored during node discovery.

Full detail in [CHANGELOG.md](CHANGELOG.md) and [ontology/CHANGELOG.md](ontology/CHANGELOG.md).

---

## What You Get

Once the OAA skill is active, your agent understands the convention and can:

- **Create nodes** - author AGENT.md, ROLE.md, SKILL.md, TOOL.md files from templates with correct frontmatter
- **Wire the chain** - set `requires` edges bottom-up (tools first, then skills, then roles, then agents)
- **Author authority** - place `decides`, `escalates`, and `never` constraints at the right layer; understand the composition algebra
- **Validate** - check for ownership conflicts, upward edges, dead grants, and stale lock entries
- **Compile** - walk the full chain and produce a runtime `AGENTS.md` from source; update `agents.lock`
- **Decompose** - split roles, extract shared skills, apply the connector/capability split for MCP servers
- **Model the domain** - write `.rel` ontology files that define business concepts, derived rules, and tool vocabulary maps; compile to `ONTOLOGY.md` and a SQLite entity store that skills write to and roles query
- **Compact for small models** - when an agent declares `models: [tiny]`, the compiled `AGENTS.md` is also saved as `AGENTS.orig.md` and rewritten compactly (Pass 2) before the agent runs

### The Core Model

One primitive, four kinds. Every node shares the same frontmatter:

```yaml
---
kind: agent | role | skill | tool
name: lowercase-hyphenated-name
description: One sentence. What this is and when to use it.
executor: llm | remote     # optional, agents only
models: [tiny]             # optional, agents only
requires:
  - relative/path/to/required/node
authority:
  owns: [domain]           # roles only
  decides: [bounded-action]
  escalates: [human-threshold]
  never: [forbidden-always]
---
```

Authority composes down the chain: `never` unions (deny wins), `decides` unions (autonomous if any layer grants it), `escalates` unions. Anything unlisted defaults to escalate.

For the `models` hints (`tiny`, etc.), see [`executor.md`](skills/org-agent-architecture/references/executor.md).

### Remote Executors (`executor: remote`)

Every agent declares an `executor`. Omit it (or set `llm`) and the agent runs on a **local** LLM, handed the compiled `AGENTS.md` via `--system-prompt-file`. Set **`executor: remote`** and that *same* `AGENTS.md` is instead dispatched as the system prompt in a POST body to an external **OpenAI-compatible endpoint**. Compiling produces identical output for both - the executor is read by the runner at dispatch time, never by the compiler - so any agent can move between local and remote by changing one field.

A remote agent must carry a `metadata.remote` block naming the env vars that hold its endpoint, model, and key:

```yaml
---
kind: agent
name: inbound-support
executor: remote
models: [tiny]
fills:
  - ../../roles/inbound-support-triage
metadata:
  remote:
    endpoint_env: "INBOUND_AI_ENDPOINT"   # env var: OpenAI-compatible URL
    model_env:    "INBOUND_AI_MODEL"       # env var: model name
    auth_env:     "INBOUND_AI_KEY"         # env var: API key
  schedule: "*/5 * * * *"
---
```

Two things are **non-negotiable** for remote agents:

- **Authority is only as strong as the gateway.** A remote endpoint is *not* bound by the `AGENTS.md` system prompt - a hosted model can disregard any instruction it's handed. The composed `never` list becomes a real boundary only where it's enforced at the **tool-call level**. For `executor: remote`, that gateway is the *sole* hard boundary: treat the prompt as advisory and put the teeth in the tool layer. See [`authority-model.md`](skills/org-agent-architecture/references/authority-model.md).
- **Memory schema must be complete.** The runner injects the role's `## Memory` section into the system prompt. If field names aren't documented in ROLE.md, the remote model invents them - so fully populate `## Memory` on every role a remote agent fills.

---

## System Prompts & Generated Files

You author node files: `ROLE.md`, `SKILL.md`, `TOOL.md`, `AGENT.md`. The compile prompts and the utility generate every runtime file from them. Generated files are build artifacts: regenerate them from source, never hand-edit them.

```
company/                 <- the wrapper root
|-- CLAUDE.md            <- one line: "Read README.md."
|-- README.md            <- the company's router: domain, escalation sink, agents, which prompt does which job
|-- .oaa/                <- the OAA toolkit, copied verbatim from the skill by bootstrap; never edited
|   |-- VERSION  INSTRUCTIONS.md  oaa.mjs
|   `-- prompts/  references/  templates/
|-- agents.lock          <- generated by `oaa.mjs compile`: pins every node by content hash
|-- COMPANY.md           <- generated by compile-company-map: the plain-English org chart
|-- agents/<name>/
|   |-- AGENTS.md        <- generated per agent: the runtime system prompt
|   |-- mcp-config.json  <- generated: the merged tool servers
|   `-- predicate-<name>.py   <- generated, for `executor: predicate` agents only
|-- roles/  skills/  tools/
`-- ontology/
    |-- *.rel            <- authored ontology source
    `-- ONTOLOGY.md      <- generated: the compiled domain vocabulary
```

**`README.md` and `CLAUDE.md` - the router.** `bootstrap.prompt.md` writes both. The README says what the company is, where escalations go, which agents exist, and which prompt does which job. `CLAUDE.md` holds one line that points at it. Neither holds a schema, a compile step or an authority rule: those live in `.oaa/`, so there is exactly one copy of each. The README is metadata, not part of the OAA company model, and is not hashed.

**`.oaa/` - the toolkit.** The binding rules (`INSTRUCTIONS.md`), one prompt per job, the references, the templates and the utility, copied into the company so every path resolves inside it, stamped with the OAA version. It is the same in every company and is never edited there: change it in this repository and copy it again.

**`AGENTS.md` - the agent's runtime system prompt.** `compile-agent.prompt.md` writes it from the chain that `oaa.mjs compile` resolves and pins in `agents.lock`, stamped with a `<!-- GENERATED - do not hand-edit -->` preamble. It inlines every tool's `never` rules verbatim, plus the memory schema, run order, escalation dispatch, and an env-var table (names only). At run time this file **replaces** the host's default system prompt - it *is* the agent, not a description of it. Edit the source nodes and recompile; never touch `AGENTS.md` directly. An `executor: remote` agent gets the same file POSTed to its endpoint (see [Remote Executors](#remote-executors-executor-remote)). A `human` agent's `AGENTS.md` is that person's handbook, and a `predicate` agent's is the source its script is compiled from.

**`predicate-<name>.py` - a compiled script.** For an `executor: predicate` agent, `predicate-codegen.prompt.md` turns the compiled `AGENTS.md` into a deterministic script that runs with no model. Like `AGENTS.md`, it is generated and is not pinned in `agents.lock`.

**`COMPANY.md` - the plain-English org chart.** `compile-company-map.prompt.md` reads the full node graph and produces a human-readable reference that maps every role to its agent, schedule, and authority boundaries, and lists the gaps the last validation found. Intended for managers and compliance reviewers - people who need to understand the agent org without opening a node file. Regenerate it when roles or authority blocks change.

**`ONTOLOGY.md` - the compiled domain vocabulary (generated by `oaa-ontology-design`).** `compile_ontology` parses the `.rel` sources in `ontology/` and writes `ONTOLOGY.md` alongside a `schema.sql` and a SQLite entity store. Skills write runtime entities into the store; roles query derived concepts without re-hitting external APIs. Compiling reads `ONTOLOGY.md` as a plain file but never writes to `ontology/` - only the ontology server regenerates it. Edit the `.rel` sources, not the compiled file.

| File | Generated by | Role |
|------|--------------|------|
| `CLAUDE.md`, `README.md` | `bootstrap.prompt.md` (then edited by you) | The router: where to start, and which prompt does which job |
| `.oaa/` | copied from the skill by `bootstrap.prompt.md` | The toolkit, identical in every company |
| `agents.lock` | `oaa.mjs compile` | Content-hash pins for every node |
| `AGENTS.md` | `compile-agent.prompt.md` | The agent's runtime system prompt |
| `predicate-<name>.py` | `predicate-codegen.prompt.md` | The script a predicate agent runs |
| `COMPANY.md` | `compile-company-map.prompt.md` | Plain-English org chart for humans |
| `ONTOLOGY.md` | `compile_ontology` | Compiled domain vocabulary + entity store |

---

## Source Install (Power Users)

```bash
git clone https://github.com/Chuck3PointZero/OAA
cd OAA

# Symlink into your project's skills directory
ln -s $(pwd)/skills/org-agent-architecture ~/.claude/skills/org-agent-architecture
```

---

## The compile and validate utility

OAA ships one small command-line utility, `oaa.mjs`, for the two jobs that must be deterministic: resolving an agent's chain and pinning it in `agents.lock`, and checking the graph's structure. It lives inside the skill at `skills/org-agent-architecture/assets/oaa.mjs`, is one file with its dependencies bundled in, and needs only Node (built for Node 18 or later; tested on Node 22). There is nothing to install and no server to connect.

```bash
# from the wrapper root (the folder that holds agents/, roles/, skills/, tools/ and agents.lock)
node oaa.mjs compile <agent>            # prints the resolved chain and composed authority as JSON; updates agents.lock
node oaa.mjs validate                   # structural checks; each finding names its check; exit code 1 if INVALID
node oaa.mjs validate --json            # the same, as JSON
node oaa.mjs compile <agent> --root /path/to/company
```

- **`compile`** does not write `AGENTS.md`. It prints everything an author needs to write it (the agent, roles, skills and tools with their frontmatter, the composed `never` / `decides` / `escalates` / `owns` lists, the environment variables, and the merged MCP config) and updates `agents.lock`.
- **The lock hash** covers a node's root file and the files under `references/`, `scripts/`, `assets/` and `server/`, by path relative to the node and with line endings normalized to LF, so the same files give the same hash on Windows and on Unix. `README.md`, `memory/` and `decisions/` are not hashed. Locks written by earlier versions pin a different input, so they show as changed once: run `compile` for each agent to regenerate them.
- **`validate`** also accepts the four `executor` values: `llm`, `remote`, `predicate` and `human`.

The utility is built from `harness/src/` (`npm run bundle` in `harness/`). The old `oaa-harness` MCP server is no longer started by the plugin; its source stays in `harness/` for now.

## MCP Packages

OAA ships one MCP server, for the ontology. The skill provides the authoring procedure; the server provides the tooling.

### @oaa/ontology - domain vocabulary and memory store

Compiles `.rel` source files into a canonical `ONTOLOGY.md` and a SQLite entity store. Skills write runtime values after fetching from external APIs; roles query derived concepts without re-calling the API.

Distributed from this repo via tagged git refs, not the npm registry - `@oaa/ontology` is not published to npm. Requires Node 22.5+ for the built-in `node:sqlite` module, launched with `--experimental-sqlite` (passed below via `NODE_OPTIONS`).

```bash
# Claude Code (Node 22.5+ required for built-in SQLite)
claude mcp add oaa-ontology -- env NODE_OPTIONS=--experimental-sqlite npx -y github:Chuck3PointZero/OAA#stable:ontology

# Any MCP-compatible host
NODE_OPTIONS=--experimental-sqlite npx -y github:Chuck3PointZero/OAA#stable:ontology --root /path/to/company
```

| Tool | What it does |
|------|-------------|
| `compile_ontology(root_dir)` | Compiles all `.rel` files into ONTOLOGY.md; validates the domain model |
| `validate_ontology(root_dir)` | Reports syntax and semantic errors without writing output |
| `get_concepts(root_dir)` | Returns all entity and derived concept names |
| `compile_schema(root_dir)` | Emits schema.sql and opens the SQLite entity store |
| `write_entity(kind, id, fields, source)` | Persists a base entity instance (upsert by id) |
| `query_concept(concept, filters)` | Queries any entity table or derived concept view by name |

See [ontology/README.md](ontology/README.md) for the full reference.

### Configuring the ontology server

```json
{
  "mcpServers": {
    "oaa-ontology": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#stable:ontology", "--root", "/path/to/company"],
      "env": { "NODE_OPTIONS": "--experimental-sqlite" }
    }
  }
}
```

---

## Running a Compiled Agent

`AGENTS.md` is not a record of the compile - it IS the payload. "Running" an agent means handing that file to an LLM as its complete operating instructions. There's no separate launch mechanism beyond that handoff, and this is the same regardless of what triggers it. The command below is the **`executor: llm`** path; an **`executor: remote`** agent is handed the identical `AGENTS.md` as a POST to the endpoint named in its `metadata.remote` block instead of a local `--system-prompt-file` launch - same payload, different transport.

The principle is host-agnostic; the concrete command below is the Claude Code instantiation, using the `ads-manager` / `meta-ads` worked example from [`references/example-meta-ads.md`](skills/org-agent-architecture/references/example-meta-ads.md):

```powershell
claude.exe `
  -p "Begin your run." `
  --permission-mode dontAsk `
  --system-prompt-file "company\agents\ads-manager\AGENTS.md" `
  --mcp-config "company\agents\ads-manager\mcp-config.json" `
  --strict-mcp-config
```

(drop `.exe` on macOS/Linux)

- `-p` - headless; exits automatically when the run completes.
- `--permission-mode dontAsk` - no interactive prompts; required for any unattended/scheduled run.
- `--system-prompt-file` - **replaces** Claude Code's default system prompt with the verbatim contents of `AGENTS.md`. Not append: a compiled agent isn't a coding assistant with extra rules bolted on, it's exactly and only what `AGENTS.md` says.
- `--mcp-config` + `--strict-mcp-config` - scopes this run to only the tools `AGENTS.md`'s `## Tools` table names, isolated from whatever else sits in the operator's global Claude Code config. `mcp-config.json` is not hand-authored: the compile step writes it next to `AGENTS.md` every time, from the merged `mcpConfig` that `oaa.mjs compile` prints, by merging the `server/mcp.json` of every tool the agent's chain requires. An agent needing three tools and an agent needing one both get a single `mcp-config.json` - the merge happens at compile time, not at launch time.

The path to that agent's `AGENTS.md` and its compiler-generated `mcp-config.json` are the only per-agent variables. Everything else in the command is identical for every agent. If `oaa.mjs compile` lists a tool under `missingMcpConfigs`, the generated `mcp-config.json` will be incomplete for that tool until one is added and the agent is recompiled.

### Where the schedule lives

`AGENT.md`'s `metadata.schedule` field (a cron string) records *when* this command should run. *What* fires it at that time - cron, Windows Task Scheduler, a GitHub Actions workflow, a human at a keyboard - is host infrastructure and out of scope for OAA. Anything capable of running the command above on schedule satisfies the contract.

### What this is not

- **Not a retry policy.** A crashed or timed-out run is a host decision (retry next trigger, page on-call) - same as any other scheduled job.
- **Not multi-turn.** One trigger -> one `AGENTS.md` payload -> one autonomous run -> exit.
- **Not where the schedule lives** (see above) - this section only covers what happens once the trigger fires.

---

## Contributing

The skill lives in `skills/org-agent-architecture/`. To propose changes:

1. Fork this repository
2. Edit `skills/org-agent-architecture/SKILL.md` or files in `references/`
3. Open a pull request with your rationale

Community examples welcome in `contrib/`.
