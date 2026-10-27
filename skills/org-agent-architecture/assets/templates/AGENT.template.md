---
type: oaa/Agent
kind: agent
name: {{agent-name}}
description: {{One sentence: what this runner does.}}
executor: {{llm | remote | predicate | human}}   # omit for llm. predicate: every skill step must be deterministic. human: never scheduled.
models: [{{tiny}}]                   # optional capability hints about the target model; omit unless needed
fills:                               # agent-kind spelling of `requires`
  - ../../roles/{{role-name}}        # one line per role; the agent inherits their skills
metadata:
  schedule: "{{cron-or-trigger}}"    # e.g., "0 8 * * *"; omit if event-driven
# NO authority block. The agent inherits the union of its chain's grants,
# bounded by every `never` declared anywhere in it.
# Declaring authority here is almost always a mistake - it belongs on a role.
---

# Agent: {{Agent Name}}

{{Only what's non-obvious from the frontmatter and chain - a known operational
constraint, a deliberate disabled-on-ship reason, an env var that has no obvious
default. If there's nothing to add, delete this section entirely.}}

{{Delete the Memory section below if this agent has no memory file.}}

## Memory

**Path:** `memory/state.json`

Schema and field definitions are in the role's `## Memory` section.

{{Delete the two sections below if they do not apply to this agent.}}

## Startup Credential Check

Required env vars: `{{VAR_A}}`, `{{VAR_B}}`.
If any is missing, escalate immediately and exit - do not run.

## Trigger Model

{{How this agent is woken: its `metadata.schedule`, a human force-run
(`python heartbeat.py --force {{agent-name}}`), a webhook, or an inbound event.
Omit if the schedule alone is the whole story.}}
