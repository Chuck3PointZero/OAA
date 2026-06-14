---
kind: agent
name: {{agent-name}}
description: {{One sentence: what this runner does.}}
fills:                               # agent-kind spelling of `requires`
  - ../../roles/{{role-name}}        # one line per role; the agent inherits their skills
metadata:
  schedule: "{{cron-or-trigger}}"    # e.g., "0 8 * * *"; omit if event-driven
# NO authority block. The agent inherits the intersection of its chain.
# Declaring authority here is almost always a mistake — it belongs on a role.
---

# Agent: {{Agent Name}}

{{Runtime operating context: environment, dependencies, constraints. Model choice
is host configuration — record in prose here if useful, never as identity.}}

## Memory

`memory/{{state-file}}.json` persists between activations. Excluded from the
integrity hash (runtime state, mutable by design). Document the schema:

```json
{{state-schema-example}}
```
