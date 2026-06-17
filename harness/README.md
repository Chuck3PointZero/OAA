# @oaa/harness

MCP server for the [Organizational Agent Architecture](https://github.com/Chuck3PointZero/OAA). Compiles an agent's full dependency chain into a runtime instruction file, validates the graph for structural errors, and reports agent state.

---

## Install

`@oaa/harness` is distributed from this GitHub repo, not the npm registry — `npx`/`npm` can install directly from a git ref using the `owner/repo#ref:subdirectory` shorthand, since the harness lives in the `harness/` folder of the `OAA` repo rather than at its root.

```bash
# Claude Code
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#v0.3.0:harness

# Claude Desktop / Cursor / Windsurf — add to your MCP config
{
  "mcpServers": {
    "oaa-harness": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#v0.3.0:harness"]
    }
  }
}
```

Point the server at your OAA workspace by setting `OAA_ROOT` or passing `--root <path>`:

```bash
OAA_ROOT=/path/to/company npx github:Chuck3PointZero/OAA#v0.3.0:harness
# or
npx github:Chuck3PointZero/OAA#v0.3.0:harness --root /path/to/company
```

The `#v0.3.0` pins to a tagged release rather than floating on the default branch — see **Versioning and rollback** below for why that matters and how to step down to an older release if one causes problems.

There's no published build artifact in git (`dist/` is gitignored) — installing from a git ref triggers the package's `prepare` script, which runs `npm run build` automatically before the server starts. The first `npx` invocation of a given version will be slower than later ones while it builds and npx caches the result.

---

## Tools

| Tool | Arguments | What it does |
|------|-----------|--------------|
| `compile_agent` | `name` (required), `rootDir` | Walks AGENT → ROLE → SKILL → TOOL chain, composes authority, writes `AGENTS.md`, merges every required tool's `server/mcp.json` into one `mcp-config.json`, updates `agents.lock` |
| `validate_graph` | `rootDir` | Runs the full validation checklist. Returns errors (must fix), warnings (should fix), gaps (decide). Verdict: `VALID \| VALID-WITH-WARNINGS \| INVALID` |
| `get_status` | `name`, `rootDir` | Returns compile state, last compile time, resolved chain, recent `memory/` entries |
| `get_ontology` | `rootDir` | Returns `ONTOLOGY.md` if present — the compiled vocabulary shared across all agents |
| `run_agent` | `name`, `rootDir`, `input` | Returns the compiled `AGENTS.md` content, ready to hand to an LLM as its full operating instructions. Execution is intentionally out of scope — see the OAA README's "Running a Compiled Agent" section for the concrete launch command |

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
      "args": ["-y", "github:Chuck3PointZero/OAA#v0.3.0:harness", "--root", "/path/to/company"]
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

## Versioning and Rollback

Every release is tagged in git (`v0.2.0`, `v0.3.0`, ...) with notes in `CHANGELOG.md` and a matching [GitHub Release](https://github.com/Chuck3PointZero/OAA/releases). Tags are what make rollback possible: an install pinned to `#v0.3.0` keeps working exactly as it does today even if `main` moves on or a later release has a bug.

**To step down to an earlier release**, change the pinned ref in your MCP config (or `claude mcp add` command) from the current tag to the one you want, e.g. `#v0.3.0:harness` → `#v0.2.0:harness`, then restart the MCP server. `npx` caches each distinct git ref separately, so switching back and forth doesn't require clearing anything.

**Avoid pinning to a branch** (`#main`) for anything other than local testing — a branch ref is mutable, so "rollback" wouldn't mean anything and a force-push upstream could change what you're running without your config changing at all. Tags are immutable by convention; don't reuse or move one after it's released.

Each tagged version corresponds to one `package.json` version bump and one `CHANGELOG.md` entry — if a release changes validator behavior (like 0.2.0's Tool Wiring generalization or 0.3.0's enforcement-gap acknowledgment), check the changelog before upgrading, since `validate_graph` findings on an existing workspace can change.

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
8. Merge every required `type: mcp` tool's `server/mcp.json` into one `mcp-config.json`, written next to `AGENTS.md`. A tool missing its `server/mcp.json` is reported, not silently skipped — `--mcp-config` would otherwise fail at run time with no compile-time signal.
9. Update `agents.lock` with fresh hashes

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
