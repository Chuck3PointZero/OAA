# Executor and Models as Additional Features

Both are top-level `AGENT.md` frontmatter fields. `executor` declares the agent type; `models` declares capability hints about the target LLM that affect how `compile_agent` builds the prompt.

---

## `executor`

```yaml
executor: llm || remote
```

| Value | Inference | How AGENTS.md is delivered |
|-------|-----------|---------------------------|
| `llm` | Local LLM (default; omit field to imply this) | `--system-prompt-file AGENTS.md` |
| `remote` | External OpenAI-compatible endpoint | POST body to `metadata.remote.endpoint_env` |

`compile_agent` produces the same `AGENTS.md` for every executor — the field is read by the runner at dispatch time, not by the compiler.

### `executor: remote`

Requires a `metadata.remote` block:

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
    endpoint_env: "INBOUND_AI_ENDPOINT"  # env var holding the OpenAI-compatible URL
    model_env:    "INBOUND_AI_MODEL"     # env var holding the model name
    auth_env:     "INBOUND_AI_KEY"       # env var holding the API key
  schedule: "*/5 * * * *"
---
```

**Authority enforcement:** for `executor: remote`, the compiled `AGENTS.md` is the system prompt but the remote endpoint is not bound by it. The gateway enforcing the composed `never` list at the tool-call level is the only hard boundary. See [authority-model.md](authority-model.md).

**Memory schema:** the ROLE.md `## Memory` section must be fully populated for any remote agent — the runner injects it into the system prompt, and without documented field names the remote model invents them.

---

## `models`

A list of capability hints about the target LLM — not its name or endpoint (those are runtime config in `metadata.remote`).

```yaml
models: [tiny]
```

| Hint | Meaning | Compiler behavior |
|------|---------|-------------------|
| `tiny` | Target model needs a compact, terse prompt | Triggers Pass 2 (see below) |
| `no-tools` | Model unreliable at function-calling | Reserved — no behavior yet |
| `low-context` | Model has a small context window | Reserved — no behavior yet |
| `no-json` | Model unreliable at structured output | Reserved — no behavior yet |

Absent `models`, or no recognized hints: zero behavior change.

---

## Compiler Pass 2 (`models: [tiny]`)

When `models` includes `tiny`, `compile_agent` (Pass 1) additionally:
- Copies `AGENTS.md` → `AGENTS.orig.md` alongside it
- Returns `compactNeeded: true`

Pass 2 is performed by the LLM after `compile_agent` returns. See **Workflow: Compile an Agent → Optional: Compact Prompt** in `SKILL.md` for the full procedure.

Summary: call `get_compact_prompt_template()`, rewrite `AGENTS.orig.md` keeping every tool name, env var, and `never`-list item verbatim, verify fact retention, then write the result to `AGENTS.md` with a compaction marker as the first line. On any failure, leave `AGENTS.md` as the Pass 1 narrative — the next compile retries automatically.
