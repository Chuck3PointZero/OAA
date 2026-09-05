# Slide 3 — Roles, Skills, and Tools (oh my)

**Title:** Roles, Skills, and Tools (oh my)

---

## The Core Idea

Every node in an OAA system — whether it is an agent, a role, a skill, or a tool — shares **one frontmatter schema**. The `kind:` field is what distinguishes them.

```yaml
---
kind: agent | role | skill | tool
name: lowercase-hyphenated-name
description: One sentence. What this is and when to use it.
requires:
  - relative/path/to/required/node
authority:
  owns: [domain]
  decides: [bounded-action]
  escalates: [human-threshold]
  never: [forbidden-always]
---
```

## The Four Kinds

| Kind | What it is | Key extras |
|------|-----------|------------|
| **agent** | A runner — schedule, model, memory, the executor | `fills` (alias for `requires`), `memory/` folder, `metadata.schedule` |
| **role** | An accountability — a domain someone owns | `owns`, `watches`, `decisions/` folder |
| **skill** | A procedure — steps, workflow, how-to | `allowed-tools` (alias for `requires`), `scripts/`, `assets/` |
| **tool** | A single callable capability | `connector: api\|mcp\|local`, `env:`, `server/` folder |

## Speaker Notes

- Because all four kinds share one schema, the parser, discovery walk, manifest format, and validator are written once and apply to everything.
- A complex skill that grows sub-skills becomes an agent by editing one frontmatter field — they are the same type.
- The typed filename IS the identity: `SKILL.md` means skill. No path prefix needed.
- Two valid file forms: directory form (`SKILL.md` inside a named directory) and flat-file form (`name.skill.md`).
