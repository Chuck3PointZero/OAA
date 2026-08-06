# @oaa/harness

MCP server for the [Organizational Agent Architecture](https://github.com/Chuck3PointZero/OAA). Compiles an agent's full dependency chain into a runtime instruction file, validates the graph for structural errors, and reports agent state.

---

## Install

`@oaa/harness` is distributed from this GitHub repo, not the npm registry — `npx`/`npm` can install directly from a git ref using the `owner/repo#ref:subdirectory` shorthand, since the harness lives in the `harness/` folder of the `OAA` repo rather than at its root.

```bash
# Claude Code
claude mcp add oaa-harness -- npx -y github:Chuck3PointZero/OAA#stable:harness

# Claude Desktop / Cursor / Windsurf — add to your MCP config
{
  "mcpServers": {
    "oaa-harness": {
      "command": "npx",
      "args": ["-y", "github:Chuck3PointZero/OAA#stable:harness"]
    }
  }
}
```

Point the server at your OAA workspace by setting `OAA_ROOT` or passing `--root <path>`:

```bash
OAA_ROOT=/path/to/company npx github:Chuck3PointZero/OAA#stable:harness
# or
npx github:Chuck3PointZero/OAA#stable:harness --root /path/to/company
```

`#stable` is a moving tag pointing at the latest release that has been deliberately blessed for use. You always get the current stable release without editing your config; you never get half-finished work sitting on `master`. If you need to hold a specific version (to reproduce a bug, or pin against an upgrade), replace `#stable` with a numbered tag like `#v0.5.0` — see **Versioning and rollback** below.

Installing from a git ref triggers the package's `prepare` script, which runs `npm run build` automatically before the server starts. The first `npx` invocation of a given ref is slower than later ones while it builds; `npx` then caches the built output — so a `stable` move only reaches users on their next `npx` cache miss for that ref.

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
      "args": ["-y", "github:Chuck3PointZero/OAA#stable:harness", "--root", "/path/to/company"]
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

Three kinds of ref, each with a specific job:

- **`#stable`** — moving tag pointing at the currently-blessed release. Default install refs use this; users get the latest release without editing their config. Landing a commit on `master` does not move `stable`; only an explicit `git tag -f stable <version> && git push -f origin stable` does. If a release turns out to be broken, moving `stable` back to a prior tag rolls every user forward on their next `npx` cache miss.
- **`#vX.Y.Z`** — numbered release tags (`v0.2.0`, `v0.4.0`, `v0.5.0`, ...), immutable by convention. Each corresponds to one `package.json` version bump and one `CHANGELOG.md` entry. Pin to one of these when you need reproducibility across machines or to hold a version you've validated.
- **`#master`** — the default branch. Every commit lands here, including work in progress. Not intended as an install ref.

If a release breaks something, **swap `#stable` for a numbered tag** in your MCP config — e.g. `#stable:harness` → `#v0.5.0:harness` — and restart the MCP server. `npx` caches each distinct git ref separately, so switching back and forth doesn't require clearing anything.

If a release changes validator behavior (like 0.2.0's Tool Wiring generalization, 0.3.0's enforcement-gap acknowledgment, or 0.5.0's `decides` union), check `CHANGELOG.md` before upgrading — `validate_graph` findings on an existing workspace can change.

**Maintainer note.** Each blessed release moves `stable` with `git tag -f stable vX.Y.Z && git push -f origin stable`. The `-f` is intentional for `stable` only; numbered tags are immutable once pushed.

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
