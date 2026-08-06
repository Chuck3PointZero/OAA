# @oaa/harness

MCP server for the [Organizational Agent Architecture](https://github.com/Chuck3PointZero/OAA). Compiles an agent's full dependency chain into a runtime instruction file, validates the graph for structural errors, and reports agent state.

---

## Install

`@oaa/harness` is distributed from this GitHub repo, not the npm registry — `npx`/`npm` can install directly from a git ref using the `owner/repo#ref:subdirectory` shorthand, since the harness lives in the `harness/` folder of the `OAA` repo rather than at its root.

```bash
# Claude Code
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#master:harness

# Claude Desktop / Cursor / Windsurf — add to your MCP config
{
  "mcpServers": {
    "oaa-harness": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#master:harness"]
    }
  }
}
```

Point the server at your OAA workspace by setting `OAA_ROOT` or passing `--root <path>`:

```bash
OAA_ROOT=/path/to/company npx github:Chuck3PointZero/OAA#master:harness
# or
npx github:Chuck3PointZero/OAA#master:harness --root /path/to/company
```

`#master` tracks the default branch — you always get the latest release without editing your config. If you need a specific version (to reproduce a bug, or pin against an unexpected change), replace `#master` with a tagged release like `#v0.5.0` — see **Versioning and rollback** below.

Installing from a git ref triggers the package's `prepare` script, which runs `npm run build` automatically before the server starts. The first `npx` invocation of a given ref is slower than later ones while it builds; `npx` then caches the built output.

---

## Tools

| Tool | Arguments | What it does |
|------|-----------|--------------|
| `compile_agent` | `name` (required), `rootDir` | Walks AGENT → ROLE → SKILL → TOOL chain, composes authority, writes `AGENTS.md`, merges every required tool's `server/mcp.json` into one `mcp-config.json`, updates `agents.lock`. If the agent's `AGENT.md` declares `models: [tiny]`, also copies `AGENTS.md` → `AGENTS.orig.md` and returns `compactNeeded: true` — signal for Pass 2 compact rewriting |
| `validate_graph` | `rootDir` | Runs the full validation checklist, including `requires` resolution in ROLE.md and SKILL.md and stale-hash detection in `agents.lock`. Returns errors (must fix), warnings (should fix), gaps (decide). Verdict: `VALID \| VALID-WITH-WARNINGS \| INVALID` |
| `get_status` | `name`, `rootDir` | Returns compile state, last compile time, resolved chain, recent `memory/` entries |
| `get_ontology` | `rootDir` | Returns `ONTOLOGY.md` if present — the compiled vocabulary shared across all agents |
| `get_compact_prompt_template` | _(none)_ | Returns the Pass 2 rewriting template. Call after `compile_agent` when `compactNeeded: true`; follow its instructions to compact `AGENTS.orig.md` → `AGENTS.md` without dropping tool names, env vars, or `never` rules. Ships embedded in the server binary — no filesystem dependency |
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
      "args": ["-y", "github:Chuck3PointZero/OAA#master:harness", "--root", "/path/to/company"]
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

The default install refs use `#master` so users always get the latest release without editing their config. Every release is still tagged in git (`v0.2.0`, `v0.4.0`, `v0.5.0`, ...) with notes in `CHANGELOG.md` and a matching [GitHub Release](https://github.com/Chuck3PointZero/OAA/releases). If a release breaks something, or you need reproducibility across machines, **swap `#master` for a tag** in your MCP config — e.g. `#master:harness` → `#v0.5.0:harness` — and restart the MCP server. `npx` caches each distinct git ref separately, so switching back and forth doesn't require clearing anything.

Tags are immutable by convention; a branch ref is mutable and moves as new commits land, so pinning to a tag is what makes rollback and reproducibility real. `#master` is the right default for most users; a tag is the right choice when you need to hold a specific version.

Each tagged version corresponds to one `package.json` version bump and one `CHANGELOG.md` entry — if a release changes validator behavior (like 0.2.0's Tool Wiring generalization or 0.3.0's enforcement-gap acknowledgment), check the changelog before upgrading, since `validate_graph` findings on an existing workspace can change.

**Upgrading to 0.5.0 — breaking change:** Authority composition for `decides` (autonomous actions) has changed from **intersection** to **union**. An agent filling multiple roles now holds the combined autonomous authority of all its roles. Prohibitions (`never`) still union and still override all grants. Also, `node_modules` are now explicitly ignored during node discovery.

---

## How Compilation Works

`compile_agent` does the following in order:

1. Read `AGENT.md` — collect `fills`, `executor`, `models`, and `metadata`
2. For each role: read `ROLE.md`, collect `owns / decides / escalates / never / requires`
3. For each skill: read `SKILL.md`, collect workflow steps, `authority.escalates`, and `requires`
4. For each tool: read `TOOL.md`, collect `authority.never`, `env`, declared functions
5. Check `agents.lock` (keyed by resolved path, e.g. `file://./agents/foo/AGENT.md`) — if all SHA-256 hashes match, `AGENTS.md` is current; stop
6. Validate the resolved chain; abort on errors
7. Write `AGENTS.md` with preamble, hard limits, memory schema, run order, escalation dispatch, env table
8. Merge every required `type: mcp` tool's `server/mcp.json` into one `mcp-config.json`, written next to `AGENTS.md`. A tool missing its `server/mcp.json` is reported, not silently skipped — `--mcp-config` would otherwise fail at run time with no compile-time signal.
9. Update `agents.lock` with fresh hashes
10. _(Pass 2, only when `models: [tiny]`)_ Copy `AGENTS.md` → `AGENTS.orig.md` and return `compactNeeded: true`. The caller should then invoke `get_compact_prompt_template()` and rewrite `AGENTS.orig.md` → `AGENTS.md` compactly, preserving every tool name, env var, and `never` rule verbatim.

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
