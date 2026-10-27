# Slide 11 — The Agent Node: Agent-Only Concepts

**Title:** The Agent Node: Agent-Only Concepts
**Tagline:** The agent is the runner, not the decision-maker.

---

## Key Message

Every node shares one schema, but `kind: agent` has a set of top-level fields no other kind carries. Understanding these is what separates an agent that just runs from one that is schedulable, remotely dispatchable, compact-rewritable, and stateful.

---

## Agent-Only Fields

### `executor: llm | remote`
Switches the transport path at dispatch time. `llm` (default) = compiled `AGENTS.md` handed to a local LLM via `--system-prompt-file`. `remote` = same `AGENTS.md` POSTed to an OpenAI-compatible endpoint. `compile_agent` output is identical for both.

### `models: [tiny]`
Hints that this agent runs on a small-context model. When present, `compile_agent` also writes `AGENTS.orig.md` (the full narrative backup) and returns `compactNeeded: true` — the signal to run Pass 2 compact rewriting via `get_compact_prompt_template`, which strips rationale and prose while preserving every tool name, env var, and `never` rule verbatim.

### `fills` (alias for `requires`)
Agents use `fills` to reference their roles — semantically, agents *fill* roles rather than generically *requiring* them. The resolver treats `fills` and `requires` identically; the distinction is meaningful to humans reading the file.

### `metadata.schedule`
A cron string recording *when* this agent should run. OAA records the schedule here but does not fire it — the host infrastructure (cron, Windows Task Scheduler, GitHub Actions) is responsible for triggering the command.

### `metadata.remote`
Required when `executor: remote`. Names the environment variables that hold the endpoint URL, model identifier, and API key:
```yaml
metadata:
  remote:
    endpoint_env: "MY_AI_ENDPOINT"
    model_env:    "MY_AI_MODEL"
    auth_env:     "MY_AI_KEY"
```
Values are never in the file — only the env var names.

### `memory/` folder
State that persists between activations. Excluded from `agents.lock` hashes (runtime state is not identity). The ontology database (`memory/ontology.db`) lives here when the SQLite store is used.

### No `authority` block
An absent or empty agent authority block is not an omission — it is the design. It means: *"exactly what my roles permit, bounded by what the tools forbid."* Decision rights belong to roles; hard limits belong to tools. The agent is replaceable precisely because it carries none of the policy itself.

---

## The Full Agent Frontmatter (example)

```yaml
---
kind: agent
name: ads-manager
executor: remote
models: [tiny]
fills:
  - ../../roles/budget-steward
  - ../../roles/creative-manager
  - ../../roles/account-sentinel
metadata:
  remote:
    endpoint_env: "ADS_AI_ENDPOINT"
    model_env:    "ADS_AI_MODEL"
    auth_env:     "ADS_AI_KEY"
  schedule: "0 6 * * 1-5"
---
```

## Speaker Notes

- Emphasize: the agent has NO authority block. This is intentional — authority belongs to roles and tools, not to the runner. Splitting agents later (different schedules, different models, different reviewing humans) is trivially a one-line `fills` move.
- `models: [tiny]` is a hint to the compile step, not to the model itself. It triggers Pass 2 compact rewriting — the goal is a smaller prompt footprint without dropping any tool names, env vars, or never rules.
- `memory/` is where the SQLite entity store lives (`memory/ontology.db`). Skills write runtime values there; roles query derived concepts without re-calling external APIs.
- The `metadata.schedule` cron string is documentation — OAA records the intent but the host fires the trigger. This is an explicit out-of-scope boundary.
