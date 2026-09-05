---
type: oaa/Agent
kind: agent
name: {{agent-name}}
description: {{One sentence: what this runner does.}}
fills:                               # agent-kind spelling of `requires`
  - ../../roles/{{role-name}}        # one line per role; the agent inherits their skills
metadata:
  schedule: "{{cron-or-trigger}}"    # e.g., "0 8 * * *"; omit if event-driven
# NO authority block. The agent inherits the union of its chain's grants,
# bounded by every `never` declared anywhere in it.
# Declaring authority here is almost always a mistake — it belongs on a role.
---

# Agent: {{Agent Name}}

{{Only what's non-obvious from the frontmatter and chain — a known operational
constraint, a deliberate disabled-on-ship reason, an env var that has no obvious
default. If there's nothing to add, delete this section entirely.}}

{{Delete the Memory section below if this agent has no memory file.}}

## Memory

**Path:** `memory/state.json`

Schema and field definitions are in the role's `## Memory` section.
