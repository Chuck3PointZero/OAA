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
| Cursor | Add to `.cursor/mcp.json` — see [Cursor guide](#cursor) |
| GitHub Copilot / VS Code | Add to `.github/copilot-instructions.md` — see [Copilot guide](#copilot) |
| Codex | `codex skills add Chuck3PointZero/OAA` |
| Claude Desktop | See [Claude Desktop guide](#claude-desktop) |
| Windsurf | See [Windsurf guide](#windsurf) |

---

## Per-Agent Install Guides

<details>
<summary><strong>Claude Code</strong> (recommended: plugin install)</summary>

One command adds the marketplace pinned to `stable`; a second installs the plugin, which bundles both skills and both MCP servers:

```bash
/plugin marketplace add Chuck3PointZero/OAA@stable
/plugin install oaa@oaa
```

The `@stable` suffix pins the marketplace to the currently-blessed release; `/plugin marketplace update` picks up new releases as they're cut. Once installed, mention OAA or ask to create an agent hierarchy and the skills activate automatically. `compile_agent`, `validate_graph`, and the full ontology/memory toolchain are all live from the first install.

**Fallback — separate skill and MCP installs** (for older Claude Code without plugin support):

```bash
claude skills add Chuck3PointZero/OAA
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#stable:harness
claude mcp add oaa-ontology -- env NODE_OPTIONS=--experimental-sqlite npx -y github:Chuck3PointZero/OAA#stable:ontology
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "oaa": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#stable:harness"]
    }
  }
}
```

Then install the skill:

```bash
npx skills add Chuck3PointZero/OAA --skill '*'
```

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

Add the OAA harness to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "oaa": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#stable:harness"]
    }
  }
}
```

</details>

<details>
<summary><strong>Windsurf</strong></summary>

```bash
npx skills add Chuck3PointZero/OAA --skill '*'
```

Add the harness to Windsurf's MCP settings under Cascade → MCP Servers.

</details>

---

## Upgrading to v0.5.0

**Breaking change — `decides` union.** Authority composition for `decides` (autonomous actions) has changed from **intersection** (intersection of all roles) to **union** (the sum of all roles). An agent filling multiple roles now holds the combined autonomous authority of all its roles. Prohibitions (`never`) still union and still override all grants.

**Also new in v0.5.0:**
- **Agent Narrative Body:** The narrative content of `AGENT.md` is now rendered into the generated `AGENTS.md`, allowing agents to carry their own specific context independent of their roles.
- **Introduction Slide Deck:** A comprehensive technical introduction is now available in `docs/introduction/`.
- **Node Search Optimization:** `node_modules` are now explicitly ignored during node discovery.

Full detail in [harness/CHANGELOG.md](harness/CHANGELOG.md) and [ontology/CHANGELOG.md](ontology/CHANGELOG.md).

---

## What You Get

Once the OAA skill is active, your agent understands the convention and can:

- **Create nodes** — author AGENT.md, ROLE.md, SKILL.md, TOOL.md files from templates with correct frontmatter
- **Wire the chain** — set `requires` edges bottom-up (tools first, then skills, then roles, then agents)
- **Author authority** — place `decides`, `escalates`, and `never` constraints at the right layer; understand the composition algebra
- **Validate** — check for ownership conflicts, upward edges, dead grants, and stale lock entries
- **Compile** — walk the full chain and produce a runtime `AGENTS.md` from source; update `agents.lock`
- **Decompose** — split roles, extract shared skills, apply the connector/capability split for MCP servers
- **Model the domain** — write `.rel` ontology files that define business concepts, derived rules, and tool vocabulary maps; compile to `ONTOLOGY.md` and a SQLite entity store that skills write to and roles query
- **Compact for small models** — when an agent declares `models: [tiny]`, `compile_agent` also writes `AGENTS.orig.md` and flags `compactNeeded`, cueing a Pass 2 compact rewrite via `get_compact_prompt_template` before the agent runs

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

Every agent declares an `executor`. Omit it (or set `llm`) and the agent runs on a **local** LLM, handed the compiled `AGENTS.md` via `--system-prompt-file`. Set **`executor: remote`** and that *same* `AGENTS.md` is instead dispatched as the system prompt in a POST body to an external **OpenAI-compatible endpoint**. `compile_agent` emits identical output for both — the executor is read by the runner at dispatch time, never by the compiler — so any agent can move between local and remote by changing one field.

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

- **Authority is only as strong as the gateway.** A remote endpoint is *not* bound by the `AGENTS.md` system prompt — a hosted model can disregard any instruction it's handed. The composed `never` list becomes a real boundary only where it's enforced at the **tool-call level**. For `executor: remote`, that gateway is the *sole* hard boundary: treat the prompt as advisory and put the teeth in the tool layer. See [`authority-model.md`](skills/org-agent-architecture/references/authority-model.md).
- **Memory schema must be complete.** The runner injects the role's `## Memory` section into the system prompt. If field names aren't documented in ROLE.md, the remote model invents them — so fully populate `## Memory` on every role a remote agent fills.

---

## System Prompts & Generated Files

You author node files — `ROLE.md`, `SKILL.md`, `TOOL.md`, `AGENT.md`. The compilers generate all the runtime prompts from them. Generated files are build artifacts — regenerate them from source, never hand-edit them.

```
company/               ← the wrapper root (OAA_ROOT)
├── CLAUDE.md          ← the OAA skill — installed via npx skills add
├── agents.lock
├── agents/<name>/
│   ├── AGENTS.md      ← generated per agent — the runtime system prompt
│   └── COMPANY.md     ← generated by the OAA skill — plain-English org chart
├── roles/  skills/  tools/
└── ontology/
    ├── *.rel          ← authored ontology source
    └── ONTOLOGY.md    ← generated — the compiled domain vocabulary
```

**`CLAUDE.md` — the OAA skill.** Installed at the `company/` root via `npx skills add Chuck3PointZero/OAA`. This file IS the skill — it is what makes any AI assistant working in the tree aware of the OAA convention and how to compile agents. It is not generated from node files; it is what generates everything else.

**`AGENTS.md` — the agent's runtime system prompt (generated by `org-agent-architecture`).** `compile_agent` walks the full AGENT → ROLE → SKILL → TOOL chain and writes a single `AGENTS.md` into the agent's directory, stamped with a `<!-- GENERATED — do not hand-edit -->` preamble. It inlines every tool's `never` rules verbatim, plus the memory schema, run order, escalation dispatch, and an env-var table (names only). At run time this file **replaces** the host's default system prompt — it *is* the agent, not a description of it. Edit the source nodes and recompile; never touch `AGENTS.md` directly. (An `executor: remote` agent gets the same file POSTed to its endpoint — see [Remote Executors](#remote-executors-executor-remote).)

**`COMPANY.md` — the plain-English org chart (generated by `org-agent-architecture`).** The OAA skill reads the full node graph and produces a human-readable reference that maps every role to its agent, schedule, and authority boundaries. Intended for managers and compliance reviewers — people who need to understand the agent org without opening a node file. Regenerate it when roles or authority blocks change.

**`ONTOLOGY.md` — the compiled domain vocabulary (generated by `oaa-ontology-design`).** `compile_ontology` parses the `.rel` sources in `ontology/` and writes `ONTOLOGY.md` alongside a `schema.sql` and a SQLite entity store. Skills write runtime entities into the store; roles query derived concepts without re-hitting external APIs. The harness reads `ONTOLOGY.md` via `get_ontology` but never writes to `ontology/` — only the ontology server regenerates it. Edit the `.rel` sources, not the compiled file.

| File | Source | Role |
|------|--------|------|
| `CLAUDE.md` | Installed (`npx skills add`) | The OAA skill — tells the AI assistant the whole convention |
| `AGENTS.md` | Generated by `compile_agent` | The agent's runtime system prompt |
| `COMPANY.md` | Generated by `org-agent-architecture` skill | Plain-English org chart for humans |
| `ONTOLOGY.md` | Generated by `compile_ontology` | Compiled domain vocabulary + entity store |

---

## Team Distribution

To roll OAA out across a team or organization, add this to your Claude Code project settings (`.claude/settings.json`):

<!-- NOTE: default branch is `master` (there is no `main`), and `.agents/marketplace.json` does not yet exist in the repo. Add that file on `master`, or update this sourceURL to wherever the marketplace manifest actually lives, before publishing these instructions. -->

```json
{
  "extraKnownMarketplaces": [
    {
      "name": "OAA",
      "sourceURL": "https://raw.githubusercontent.com/Chuck3PointZero/OAA/master/.agents/marketplace.json"
    }
  ]
}
```

Team members can then install via `claude skills add org-agent-architecture` without specifying the full GitHub path.

---

## Source Install (Power Users)

```bash
git clone https://github.com/Chuck3PointZero/OAA
cd OAA

# Symlink into your project's skills directory
ln -s $(pwd)/skills/org-agent-architecture ~/.claude/skills/org-agent-architecture
```

---

## MCP Packages

OAA ships two MCP servers. The skill provides the authoring procedure; the servers provide the tooling.

### @oaa/harness — graph compiler

Compiles an agent's full dependency chain into a runtime instruction file, validates the graph for structural errors, and reports agent state.

```bash
# Claude Code
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#stable:harness

# Any MCP-compatible host
npx -y github:Chuck3PointZero/OAA#stable:harness --root /path/to/company
```

Distributed directly from this repo, not the npm registry. Default refs use `#stable` — a moving tag that points at the latest blessed release, so users get updates without editing their config. Swap in a numbered tag (e.g. `#v0.5.0`) to pin — see [harness/README.md](harness/README.md#versioning-and-rollback).

| Tool | What it does |
|------|-------------|
| `compile_agent(name)` | Walks the chain, writes AGENTS.md, merges required tools' `server/mcp.json` into one `mcp-config.json`, updates agents.lock |
| `validate_graph()` | Returns errors, warnings, and gaps across the full graph |
| `get_status(name)` | Returns last run state and escalation log from memory/ |
| `get_ontology()` | Returns compiled ONTOLOGY.md if present |
| `run_agent(name)` | Returns AGENTS.md content, ready to hand to an LLM — see "Running a Compiled Agent" below for the launch command |
| `get_compact_prompt_template()` | Returns the Pass 2 compact-rewrite template (new in v0.5.0; embedded in the binary, so it works from any install path). Used when a `models: [tiny]` agent compiles with `compactNeeded` |

See [harness/README.md](harness/README.md) for the full reference.

### @oaa/ontology — domain vocabulary and memory store

Compiles `.rel` source files into a canonical `ONTOLOGY.md` and a SQLite entity store. Skills write runtime values after fetching from external APIs; roles query derived concepts without re-calling the API.

Distributed from this repo via tagged git refs, not the npm registry — neither `@oaa/harness` nor `@oaa/ontology` is published to npm. Requires Node 22.5+ for the built-in `node:sqlite` module, launched with `--experimental-sqlite` (passed below via `NODE_OPTIONS`).

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

### Running both together

```json
{
  "mcpServers": {
    "oaa-harness": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#stable:harness", "--root", "/path/to/company"]
    },
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

`AGENTS.md` is not a record of the compile — it IS the payload. "Running" an agent means handing that file to an LLM as its complete operating instructions. There's no separate launch mechanism beyond that handoff, and this is the same regardless of what triggers it. The command below is the **`executor: llm`** path; an **`executor: remote`** agent is handed the identical `AGENTS.md` as a POST to the endpoint named in its `metadata.remote` block instead of a local `--system-prompt-file` launch — same payload, different transport.

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

- `-p` — headless; exits automatically when the run completes.
- `--permission-mode dontAsk` — no interactive prompts; required for any unattended/scheduled run.
- `--system-prompt-file` — **replaces** Claude Code's default system prompt with the verbatim contents of `AGENTS.md`. Not append: a compiled agent isn't a coding assistant with extra rules bolted on, it's exactly and only what `AGENTS.md` says.
- `--mcp-config` + `--strict-mcp-config` — scopes this run to only the tools `AGENTS.md`'s `## Tools` table names, isolated from whatever else sits in the operator's global Claude Code config. `mcp-config.json` is not hand-authored: `compile_agent` writes it next to `AGENTS.md` every time it runs, by merging the `server/mcp.json` of every tool the agent's chain requires. An agent needing three tools and an agent needing one both get a single `mcp-config.json` — the merge happens at compile time, not at launch time.

The path to that agent's `AGENTS.md` and its compiler-generated `mcp-config.json` are the only per-agent variables. Everything else in the command is identical for every agent. If `compile_agent` reports a tool missing its `server/mcp.json`, the generated `mcp-config.json` will be incomplete for that tool until one is added and the agent is recompiled.

### Where the schedule lives

`AGENT.md`'s `metadata.schedule` field (a cron string) records *when* this command should run. *What* fires it at that time — cron, Windows Task Scheduler, a GitHub Actions workflow, a human at a keyboard — is host infrastructure and out of scope for OAA. Anything capable of running the command above on schedule satisfies the contract.

### What this is not

- **Not a retry policy.** A crashed or timed-out run is a host decision (retry next trigger, page on-call) — same as any other scheduled job.
- **Not multi-turn.** One trigger → one `AGENTS.md` payload → one autonomous run → exit.
- **Not where the schedule lives** (see above) — this section only covers what happens once the trigger fires.

---

## Contributing

The skill lives in `skills/org-agent-architecture/`. To propose changes:

1. Fork this repository
2. Edit `skills/org-agent-architecture/SKILL.md` or files in `references/`
3. Open a pull request with your rationale

Community examples welcome in `contrib/`.
