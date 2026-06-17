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
<summary><strong>Claude Code</strong></summary>

```bash
# Install the skill
claude skills add Chuck3PointZero/OAA

# Optional: add the MCP servers (compile, validate, run, domain memory)
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#v0.3.0:harness
claude mcp add oaa-ontology -- node --experimental-sqlite $(npx -y @oaa/ontology)
```

Once installed, the skill is active in any Claude Code session. Mention OAA or ask to create an agent hierarchy and it activates automatically. The MCP servers are optional but unlock `compile_agent`, `validate_graph`, and the full ontology and memory toolchain.

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "oaa": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#v0.3.0:harness"]
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
      "args": ["-y", "github:Chuck3PointZero/OAA#v0.3.0:harness"]
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

## What You Get

Once the OAA skill is active, your agent understands the convention and can:

- **Create nodes** — author AGENT.md, ROLE.md, SKILL.md, TOOL.md files from templates with correct frontmatter
- **Wire the chain** — set `requires` edges bottom-up (tools first, then skills, then roles, then agents)
- **Author authority** — place `decides`, `escalates`, and `never` constraints at the right layer; understand the composition algebra
- **Validate** — check for ownership conflicts, upward edges, dead grants, and stale lock entries
- **Compile** — walk the full chain and produce a runtime `AGENTS.md` from source; update `agents.lock`
- **Decompose** — split roles, extract shared skills, apply the connector/capability split for MCP servers
- **Model the domain** — write `.rel` ontology files that define business concepts, derived rules, and tool vocabulary maps; compile to `ONTOLOGY.md` and a SQLite entity store that skills write to and roles query

### The Core Model

One primitive, four kinds. Every node shares the same frontmatter:

```yaml
---
kind: agent | role | skill | tool
name: lowercase-hyphenated-name
description: One sentence. What this is and when to use it.
requires:
  - relative/path/to/required/node
authority:
  owns: [domain]           # roles only
  decides: [bounded-action]
  escalates: [human-threshold]
  never: [forbidden-always]
---
```

Authority composes down the chain: `never` unions (deny wins), `decides` intersects (autonomous only if every layer agrees), `escalates` unions. Anything unlisted defaults to escalate.

---

## Team Distribution

To roll OAA out across a team or organization, add this to your Claude Code project settings (`.claude/settings.json`):

```json
{
  "extraKnownMarketplaces": [
    {
      "name": "OAA",
      "sourceURL": "https://raw.githubusercontent.com/Chuck3PointZero/OAA/main/.agents/marketplace.json"
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
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#v0.3.0:harness

# Any MCP-compatible host
npx -y github:Chuck3PointZero/OAA#v0.3.0:harness --root /path/to/company
```

Distributed from this repo via tagged git refs, not the npm registry — see [harness/README.md](harness/README.md#versioning-and-rollback) for how version pinning and rollback work.

| Tool | What it does |
|------|-------------|
| `compile_agent(name)` | Walks the chain, writes AGENTS.md, merges required tools' `server/mcp.json` into one `mcp-config.json`, updates agents.lock |
| `validate_graph()` | Returns errors, warnings, and gaps across the full graph |
| `get_status(name)` | Returns last run state and escalation log from memory/ |
| `get_ontology()` | Returns compiled ONTOLOGY.md if present |
| `run_agent(name)` | Returns AGENTS.md content, ready to hand to an LLM — see "Running a Compiled Agent" below for the launch command |

See [harness/README.md](harness/README.md) for the full reference.

### @oaa/ontology — domain vocabulary and memory store

Compiles `.rel` source files into a canonical `ONTOLOGY.md` and a SQLite entity store. Skills write runtime values after fetching from external APIs; roles query derived concepts without re-calling the API.

```bash
# Claude Code (Node 22.5+ required for built-in SQLite)
claude mcp add oaa-ontology -- node --experimental-sqlite $(npx -y @oaa/ontology)

# Any MCP-compatible host
node --experimental-sqlite node_modules/@oaa/ontology/dist/index.js --root /path/to/company
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
      "args": ["-y", "github:Chuck3PointZero/OAA#v0.3.0:harness", "--root", "/path/to/company"]
    },
    "oaa-ontology": {
      "command": "node",
      "args": ["--experimental-sqlite", "/path/to/node_modules/@oaa/ontology/dist/index.js"],
      "env": { "OAA_ROOT": "/path/to/company" }
    }
  }
}
```

---

## Running a Compiled Agent

`AGENTS.md` is not a record of the compile — it IS the payload. "Running" an agent means handing that file to an LLM as its complete operating instructions. There's no separate launch mechanism beyond that handoff, and this is the same regardless of what triggers it.

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
