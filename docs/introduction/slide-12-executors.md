# Slide 12 — Executors: llm and remote

**Title:** Executors: llm and remote
**Tagline:** One compiled AGENTS.md. Two transport paths. Two non-negotiables for remote.

---

## Key Message

The `executor` field on an agent node switches its transport at dispatch time. The compile output is identical for both paths — same `AGENTS.md`, same `mcp-config.json`. Moving an agent between local and remote is a one-field change. But `executor: remote` carries two non-negotiables that do not apply to `executor: llm`, and getting either wrong breaks the agent silently.

---

## The Two Paths

### `executor: llm` (default — local)
- `compile_agent` walks the chain and writes `AGENTS.md`
- At run time, `--system-prompt-file` hands `AGENTS.md` to Claude Code as its complete system prompt
- `--strict-mcp-config` scopes the run to exactly the tools the chain declared
- The agent runs locally, exits when the run completes

### `executor: remote` (OpenAI-compatible endpoint)
- Same `AGENTS.md` is POSTed as the system prompt to an external endpoint
- Endpoint, model, and API key are referenced via env vars in `metadata.remote` — values are never in the file:
  ```yaml
  metadata:
    remote:
      endpoint_env: "ADS_AI_ENDPOINT"
      model_env:    "ADS_AI_MODEL"
      auth_env:     "ADS_AI_KEY"
  ```
- Any OpenAI-compatible endpoint works: hosted models, open-source, specialized, cost-optimized

---

## Two Non-Negotiables for `executor: remote`

These are not edge cases. Getting either wrong makes the agent unsafe or unreliable.

### 1. Authority is only as strong as the tool gateway

A remote model can disregard its system prompt. The `never` list in `AGENTS.md` is advisory to a remote LLM — it is not enforced by the runtime. **The tool gateway is the only hard boundary for remote agents.** If a `never` rule must hold, it must be enforced at the tool call level, not the prompt level. Treat the prompt as advisory and put the teeth in the tool layer.

This is the design of v0.4.0: making the boundary explicit rather than pretending the system prompt is a hard limit when it isn't.

### 2. Memory schema must be fully documented

The runner injects the role's `## Memory` section into the system prompt. If field names, types, and constraints are not documented in `ROLE.md`, the remote model invents them — and invented field names silently corrupt the entity store. Every field the agent reads or writes must be declared in the role's memory schema.

---

## Speaker Notes

- Emphasize: `compile_agent` output is identical for both executors. The executor field is read by the runner, not the compiler. This means the same compiled AGENTS.md can be tested locally first, then switched to remote with one field change.
- The two non-negotiables are the whole point of the v0.4.0 release. OAA now documents these constraints explicitly rather than leaving them as implicit gotchas.
- `models: [tiny]` + `executor: remote` is the pattern for compact prompts on small-context or cost-optimized models. Compile fires Pass 2 (compact rewrite) before dispatch, so the remote model receives the stripped `AGENTS.md`, not the full narrative version.
- For teams evaluating `executor: remote`: the gateway question should be the first evaluation criterion. If the tool infrastructure does not enforce `never` rules at the call level, `executor: remote` provides behavioral guidelines, not guarantees.
