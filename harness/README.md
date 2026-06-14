# @oaa/harness

MCP server for the [Organizational Agent Architecture](https://github.com/Chuck3PointZero/org-agent-architecture). Compiles an agent's full dependency chain into a runtime instruction file, validates the graph for structural errors, and reports agent state.

---

## Install

```bash
# Claude Code
claude mcp add oaa-harness -- node --experimental-sqlite $(npx -y @oaa/harness)

# Claude Desktop / Cursor / Windsurf — add to your MCP config
{
  "mcpServers": {
    "oaa-harness": {
      "command": "npx",
      "args": ["-y", "@oaa/harness"]
    }
  }
}
```

Point the server at your OAA workspace by setting `OAA_ROOT` or passing `--root <path>`:

```bash
OAA_ROOT=/path/to/company npx @oaa/harness
# or
npx @oaa/harness --root /path/to/company
```

---

## Tools

| Tool | Arguments | What it does |
|------|-----------|--------------|
| `compile_agent` | `name` (required), `rootDir` | Walks AGENT → ROLE → SKILL → TOOL chain, composes authority, writes `AGENTS.md`, updates `agents.lock` |
| `validate_graph` | `rootDir` | Runs the full validation checklist. Returns errors (must fix), warnings (should fix), gaps (decide). Verdict: `VALID \| VALID-WITH-WARNINGS \| INVALID` |
| `get_status` | `name`, `rootDir` | Returns compile state, last compile time, resolved chain, recent `memory/` entries |
| `get_ontology` | `rootDir` | Returns `ONTOLOGY.md` if present — the compiled vocabulary shared across all agents |
| `run_agent` | `name`, `rootDir`, `input` | (Stub) Returns the compiled `AGENTS.md` content for manual use; full runtime loop not yet implemented |

---

## The Three-Package Stack

OAA is split across three packages so each does one thing:

```
@oaa/harness          Graph compiler and runtime
@oaa/ontology         Domain vocabulary + SQLite entity store
OAA skill             Authoring procedure (SKILL.md, not a package)
```

A typical agent setup loads both MCP servers:

```json
{
  "mcpServers": {
    "oaa-harness": {
      "command": "npx",
      "args": ["-y", "@oaa/harness", "--root", "/path/to/company"]
    },
    "oaa-ontology": {
      "command": "node",
      "args": ["--experimental-sqlite", "-e", "require('@oaa/ontology')"],
      "env": { "OAA_ROOT": "/path/to/company" }
    }
  }
}
```

The harness handles the structural graph (what an agent is allowed to do). The ontology server handles the domain vocabulary and the runtime entity store (what values the agent is reasoning about right now).

---

## How Compilation Works

`compile_agent` does the following in order:

1. Read `AGENT.md` — collect `fills` and `metadata`
2. For each role: read `ROLE.md`, collect `owns / decides / escalates / never / requires`
3. For each skill: read `SKILL.md`, collect workflow steps and `authority.escalates`
4. For each tool: read `TOOL.md`, collect `authority.never`, `env`, declared functions
5. Check `agents.lock` — if all hashes match, `AGENTS.md` is current; stop
6. Validate the resolved chain; abort on errors
7. Write `AGENTS.md` with preamble, hard limits, memory schema, run order, escalation dispatch, env table
8. Update `agents.lock` with fresh hashes

The compiler never calls external tools or modifies source nodes. It is a pure read-then-write operation on the file graph.

---

## Workspace Layout Expected

```
company/               ← OAA_ROOT points here
├── CLAUDE.md
├── agents.lock
├── agents/
├── roles/
├── skills/
├── tools/
└── ontology/          ← .rel source files; managed by @oaa/ontology
    ├── *.rel
    ├── schema.sql     ← generated
    └── ONTOLOGY.md    ← generated
```

The harness reads `ONTOLOGY.md` via `get_ontology` but does not write to the `ontology/` directory. Use `@oaa/ontology`'s `compile_ontology` tool to regenerate it.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OAA_ROOT` | No | Absolute path to the OAA workspace root. Overrides `--root` and cwd. |

No secrets are ever stored in node files — see the OAA skill for the `env:` field convention.
