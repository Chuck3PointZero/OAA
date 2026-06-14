# Templates


Copy a template to its TYPED filename (ROLE.template.md → ROLE.md) — the .template suffix exists only so this skill bundle does not itself contain typed root files.
Copy the matching template when creating a node; never write frontmatter from memory.
Resolve every {{placeholder}}; delete guidance comments; omit (do not empty) unused fields.

| Template | Use for |
|---|---|
| AGENT.template.md | A runner filling one or more roles |
| ROLE.template.md | An accountability with decision rights and escalation thresholds |
| SKILL.template.md | A procedure (agentskills.io-compatible) |
| TOOL-connector.template.md | The shared node for a multi-capability server; owns server/ |
| TOOL-capability.template.md | One callable capability; requires its connector |
| NOUN.template.md | A domain object (only after the noun layer is adopted) |
| manifest.json | Per-directory manifest; filename becomes <kind>.json |
| agents.lock.json | Shape of lockfile entries (generated file; entries shown for reference) |

Lockfile hash scope: typed root + manifest + references/ + scripts/ + assets/ + server/.
Excluded: README.md, memory/, decisions/ (narrative and runtime state are not identity).
