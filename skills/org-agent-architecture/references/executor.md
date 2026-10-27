# Executor and Models as Additional Features

Both are top-level `AGENT.md` frontmatter fields. `executor` declares the agent type; `models` declares capability hints about the target LLM that affect how `compile-agent.prompt.md` builds the prompt.

---

## `executor`

```yaml
executor: llm | remote | predicate | human
```

| Value | Inference | How AGENTS.md is delivered |
|-------|-----------|---------------------------|
| `llm` | Local LLM (default; omit field to imply this) | `--system-prompt-file AGENTS.md` |
| `remote` | External OpenAI-compatible endpoint | POST body to `metadata.remote.endpoint_env` |
| `predicate` | None: a generated script runs with no model | `AGENTS.md` is the source the script is compiled from, not a runtime prompt |
| `human` | A person | `AGENTS.md` is that person's handbook; the agent is never run |

Compiling produces `AGENTS.md` in the same shape for every executor, and the runner, not the compiler, decides how each is launched. A `predicate` agent also gets a generated script, and a `human` agent is never launched.

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

**Before wiring `metadata.remote`, verify the target system's actual request contract - not
the pattern's implied one.** `executor: remote` assumes the endpoint receives the compiled
`AGENTS.md` as a system prompt. Confirm the specific entry point being pointed at actually
has a field for this (read the target's own request type/schema) before building the
integration around that assumption. A system can have a system-prompt override *somewhere*
in its code while the specific integration surface you're using doesn't expose it - those are
different facts, and only the second one determines whether this AGENT.md's authority is
actually delivered to the remote system or silently discarded.

**Memory schema:** the ROLE.md `## Memory` section must be fully populated for any remote agent - the runner injects it into the system prompt, and without documented field names the remote model invents them.

---

## `models`

A list of capability hints about the target LLM - not its name or endpoint (those are runtime config in `metadata.remote`).

```yaml
models: [tiny]
```

| Hint | Meaning | Compiler behavior |
|------|---------|-------------------|
| `tiny` | Target model needs a compact, terse prompt | Triggers Pass 2 (see below) |
| `no-tools` | Model unreliable at function-calling | Reserved - no behavior yet |
| `low-context` | Model has a small context window | Reserved - no behavior yet |
| `no-json` | Model unreliable at structured output | Reserved - no behavior yet |

Absent `models`, or no recognized hints: zero behavior change.

---

## Compiler Pass 2 (`models: [tiny]`)

When `models` includes `tiny`, `compile-agent.prompt.md` writes the narrative `AGENTS.md`, copies it to
`AGENTS.orig.md`, and then follows `compact-agent.prompt.md` to rewrite `AGENTS.md` compactly, keeping
every tool name, environment variable and `never`-list item verbatim. It checks fact retention before
writing, and puts a compaction marker on the first line. On any failure it leaves `AGENTS.md` as the
narrative version and reports what was missing; the next compile retries.

---

## `executor: predicate`

A predicate agent runs a **script**, with no model at run time. It is a normal node in every respect
except that its final compiled form is a script, not a system prompt.

- Author the chain as usual: the agent (`executor: predicate`), its role, skill and tools. The skill's
  steps are the specification, and the granted tools name the only capabilities the script may use.
- Every step of the skill must be **deterministic**. A step that needs judgement (interpreting text,
  weighing options, drafting prose) does not belong in a predicate agent: make it a model agent.
- Compile it as usual to get `AGENTS.md`, which is the script's source and not a runtime prompt. Then
  `predicate-codegen.prompt.md` turns it into `agents/<name>/predicate-<name>.py`.
- The script reaches only the tools in its chain, raises every escalation through a tool the chain
  grants, and keeps its state in the agent's own `memory/` folder or a granted tool's own store.
- Recompile the script whenever the chain changes. Like `AGENTS.md`, it is generated and is not
  pinned in `agents.lock`: the lock pins the source nodes it is compiled from.
- The runner launches it as a script and pays no model cost at run time.

---

## `executor: human`

A human agent is a person filling a role. It gives a person the same declared authority as an agent,
so the roles a person holds appear in the graph like any other.

- It is **never run**: it declares no `metadata.schedule`, and a runner must not launch it or wake it.
- Its compiled `AGENTS.md` is that person's handbook: the roles they fill, what they own and decide,
  and the procedures, written for a reader.
- Escalations from other roles can route to a role a human agent fills. Which human may approve what is
  a matter for the company's own process, not for OAA.
