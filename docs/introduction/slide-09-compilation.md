# Slide 9 — Compilation: compile_agent, validate_graph, and agents.lock

**Title:** Compilation: From Source Nodes to Running Agent
**Tagline:** `compile_agent` builds the prompt. `validate_graph` checks the whole org. `agents.lock` is the receipts.

---

## Key Message

Compilation is what turns a directory of Markdown files into a running agent. `compile_agent` walks the chain for one agent and emits its runtime system prompt. `validate_graph` audits the entire graph for structural violations. `agents.lock` records the result — a pinned snapshot of every node by path and content hash. All three belong together: they are the build step, not an optional utility.

---

## `compile_agent`

Triggered by calling the `@oaa/harness` MCP tool `compile_agent(agentPath)`.

**What it does:**
1. Walks AGENT → ROLE(s) → SKILL(s) → TOOL(s) following every `requires`/`fills` edge
2. Composes authority at each layer (never unions, decides unions, escalates unions)
3. Writes `AGENTS.md` — the agent's complete runtime system prompt
4. Writes `mcp-config.json` — the tool server configuration for this agent's run
5. Updates `agents.lock` — adds or refreshes every resolved node entry
6. If `models: [tiny]` is set: writes `AGENTS.orig.md` backup and returns `compactNeeded: true`

**Inputs:** the path to the agent's `AGENT.md`
**Outputs:** `AGENTS.md`, `mcp-config.json`, updated `agents.lock`

---

## `validate_graph`

Triggered by calling `validate_graph()` (no argument — walks the whole graph).

**What it checks:**
- Ownership conflicts: two nodes claiming `owns` over the same resource
- Upward edges: a skill or tool requiring a role or agent (forbidden)
- Stale hashes: a node file has changed but `agents.lock` has not been updated
- Missing nodes: a `requires` path that does not resolve to an existing file

**Use before shipping:** run `validate_graph` in CI to catch structural violations before they reach production.

---

## `agents.lock`

`agents.lock` is a generated file at the project root. It is not configuration — it is the output of a successful `compile_agent` run.

**Format:** one entry per resolved node, keyed by the resolved file URI:

```json
{
  "file://./agents/ads-manager/AGENT.md": {
    "sha256": "e3b0c44298fc1c149afb...",
    "compiled": "2025-04-01T14:23:00Z"
  },
  "file://./roles/budget-steward/ROLE.md": {
    "sha256": "a87ff679a2f3e71d9181...",
    "compiled": "2025-04-01T14:23:00Z"
  }
}
```

**Why commit it:**
- `git log agents.lock` is the org chart's change history
- `git diff agents.lock` tells you exactly what changed after a role edit
- `validate_graph` uses the hashes to detect any node that was edited without recompiling

---

## The `@oaa/harness` MCP Server

The harness exposes all compile and run operations as MCP tools:

| Tool | Purpose |
|---|---|
| `compile_agent` | Walk chain, write AGENTS.md + mcp-config.json, update lockfile |
| `validate_graph` | Full structural audit of the whole OAA graph |
| `get_status` | Current agent status and last compile metadata |
| `get_ontology` | Read ONTOLOGY.md for the current agent |
| `run_agent` | Execute a compiled agent (reads AGENTS.md as system prompt) |
| `get_compact_prompt_template` | Pass 2 compact rewriting template for `models: [tiny]` agents |

---

## Speaker Notes

- Emphasize the sequence: write source nodes → `compile_agent` → `agents.lock` updated → commit. The lockfile is not optional boilerplate; it is what proves the graph was valid at the time it was compiled.
- `agents.lock` was changed in v0.5.0 — lockfile keys are now resolved URI paths (`file://./agents/...`), not short names. Existing lockfiles need a one-time migration: `compile_agent` on each agent rewrites the keys automatically.
- If a developer edits a ROLE.md and forgets to recompile, `validate_graph` catches the stale hash and fails. CI should gate on `validate_graph` passing.
- `run_agent` reads `AGENTS.md` and passes it as the system prompt — so you can test a compiled agent immediately without leaving the MCP interface.
- The compact rewrite flow (Pass 2) is separate from compilation: `compile_agent` writes `AGENTS.orig.md` and returns `compactNeeded: true`; the caller then calls `get_compact_prompt_template` and re-runs the rewriting step to produce the final slim `AGENTS.md`.
