# Instructions

These rules are binding, not reference material. If you are about to create,
edit, or validate a node in this repository, read this file first.

## The Model

- One primitive, four kinds: `agent`, `role`, `skill`, `tool`. Same frontmatter
  schema everywhere: `kind`, `name`, `description`, `requires`, `authority`.
- `requires` is the only edge, and it points down only: agent → role → skill →
  tool. Aliases: `fills` (agent), `allowed-tools` (skill).
- Authority composes by union — `never`, `decides`, `escalates` all accumulate
  down the chain. Precedence: `never` > `escalates` > `decides`. Anything named
  nowhere defaults to escalate.
- `agents.lock` pins every node by content hash. Generated, never hand-edited.

## Before You Write Anything

1. Copy the matching template from `assets/templates/` — never write frontmatter
   from memory.
2. Fill frontmatter first, body second. Resolve every `{{placeholder}}`.
3. Place each authority constraint at the one layer that owns it (see
   `references/authority-model.md`, Placement Discipline). Do not restate a
   constraint at a second layer "for safety."
4. Optional body sections (Memory, Decisions Log, or anything a template
   mentions) are examples of what prose MIGHT contain, not a required-sections
   checklist. A node with only frontmatter and a one-line mission is fully
   valid. Add a section only because this node needs it, never because a
   template mentions it.

## Before You Call a Structure Valid

Run `references/validation.md` top to bottom. Every finding you report must
quote the specific rule it violates. If you cannot point to a line in
`validation.md`, `authority-model.md`, or `SKILL.md` that a node violates, it is
not a finding — do not invent one.

## Kind Cheat Sheet

| Kind | Owns the... | Never... |
|---|---|---|
| agent | schedule, model, memory | declares authority itself |
| role | accountability: owns/decides/escalates | restates a tool's never in prose |
| skill | procedure: workflow steps | contains organizational judgment (a role's line) |
| tool | hard ceilings: never | is called directly by a role or agent (always through a skill) |

For the full model, read `SKILL.md` in this skill's directory. For authority
composition, read `references/authority-model.md`. For validation, read
`references/validation.md`.
