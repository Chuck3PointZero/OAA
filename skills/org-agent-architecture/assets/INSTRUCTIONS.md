# Instructions

These rules are binding, not reference material. If you are about to create, edit or validate a
node in this company, read this file first.

This file lives at `.oaa/INSTRUCTIONS.md`, and every path in it is relative to `.oaa/`:

| Path | What it holds |
|---|---|
| `templates/` | The template for each kind. Copy one; never write frontmatter from memory. |
| `prompts/` | One prompt per job. `prompts/README.md` lists them. |
| `references/` | `authority-model.md`, `validation.md`, `executor.md`, `runner.md`. |
| `oaa.mjs` | The utility: `node .oaa/oaa.mjs compile <agent>` and `node .oaa/oaa.mjs validate`. |

## The Model

- One primitive, four kinds: `agent`, `role`, `skill`, `tool`. A fifth, `noun`, is optional. Every
  node has the same core frontmatter: `type`, `kind`, `name`, `description`, `requires`, `authority`.
- `requires` is the only edge, and it points down only: agent -> role -> skill -> tool. The agent's
  spelling is `fills`; the skill's is `allowed-tools`.
- Authority composes by union: `never`, `decides` and `escalates` all accumulate down the chain.
  Precedence: `never` > `escalates` > `decides`. Anything named nowhere defaults to escalate.
- `agents.lock` pins every node by content hash. It is generated and never hand-edited.
- The typed filename (`AGENT.md`, `ROLE.md`, `SKILL.md`, `TOOL.md`) is the node's identity, never the
  directory name alone. A node has one of two forms and no third: a **directory** (the default, for a node
  with sub-folders such as `memory/`, `server/` or `references/`) or a **flat file**, `<name>.<kind>.md`.

## Fields by kind

This table is the single source for what a node may declare. Templates, validation and the prompts
all cite it. A field not in it is a finding.

| Field | Kind | Required | Meaning |
|---|---|---|---|
| `type` | all | yes | `oaa/Agent`, `oaa/Role`, `oaa/Skill`, `oaa/Tool` or `oaa/Noun`. Matches `kind`. |
| `kind` | all | yes | `agent`, `role`, `skill`, `tool` or `noun`. |
| `name` | all | yes | Lowercase, hyphenated. Matches the directory name, or the file name before `.<kind>.md`. |
| `description` | all | yes | One sentence. |
| `fills` | agent | yes | Paths to the roles it fills. This is the agent's `requires`. |
| `requires` | role | yes | Paths to the skills the role needs. |
| `allowed-tools` | skill | when it uses a tool | Paths to the tools it calls. This is the skill's `requires`. |
| `executor` | agent | no | `llm` (the default), `remote`, `predicate` or `human`. See below. |
| `models` | agent | no | Capability hints about the target model. `tiny` triggers a compact rewrite. |
| `models` | tool (`local`) | no | The data model names the tool works on. |
| `metadata` | agent | no | `schedule` (a cron expression or trigger; omit if event-driven; **never** on a `human` agent) and, for `executor: remote`, a `remote` block. |
| `watches` | role | no | Signals the role monitors. |
| `authority` | role, skill, tool | see below | What each kind may put in it is below. **An agent declares none.** |
| `connector` | tool | yes | `api` (a direct HTTP call to an external service), `mcp` (a function exposed by an MCP server) or `local` (an operation on the organization's own systems, such as a database or the filesystem). |
| `env` | tool | no | The primary credential's variable **name**, never its value. |
| `auth` | tool (`api`) | no | `api-key`, `oauth` or `bearer`. |
| `layer` | tool (`local`) | no | `sqlalchemy`, `filesystem` or `internal-service`. |
| `concept-map` | tool | no | The name of the ontology `map` block that translates this tool's vocabulary (set by the ontology skill). |
| `provenance` | tool | for `api` and `mcp` | `source`, `status` (`first-party` or `third-party`), `vendored`, `pinned-in`, and an optional acknowledged `enforcement-gap`. |
| `system-of-record`, `states`, `relationships`, `classification` | noun | `system-of-record` | What the noun is and where it lives. `classification` is reserved. |

Authority by kind: a **role** has `owns`, `decides`, `escalates` and `never`; a **skill** has only
`escalates`, and only when the procedure adds its own trigger; a **tool** has only `never`. Place each
constraint at the one layer that owns it, as `references/authority-model.md` explains (Placement
Discipline). Do not restate a constraint at a second layer "for safety".

**Executor:** `llm` is run by a model from its compiled `AGENTS.md`. `remote` sends that same file to
an external endpoint. `predicate` is run as a generated script with no model, so every step of its
skill must be deterministic. `human` is a person filling a role: it is never run or scheduled, and
its `AGENTS.md` is that person's handbook. See `references/executor.md`.

## Creating a node from scratch

Follow `prompts/create-node.prompt.md`. In five steps:

1. Pick the kind. If you are torn between two kinds, it is two nodes.
2. Copy the template for it from `templates/`.
3. Fill the frontmatter first and the body second. Resolve every `{{placeholder}}`, and omit an
   optional field rather than leaving it empty.
4. Wire `requires` as relative paths to nodes that already exist. Build bottom-up: tools, then
   skills, then roles, then agents.
5. Before saving, confirm: `type` matches `kind`; no field is empty and no `{{` is left; an agent
   has no authority; every `requires` path resolves and points down; no constraint is restated at a
   second layer.

Optional body sections (Memory, Decisions Log, or anything a template mentions) are examples of what
prose might contain, not a checklist. A node with only frontmatter and a one-line mission is fully
valid. Add a section only because this node needs it.

## Before you call a structure valid

Follow `prompts/validate.prompt.md`. Every finding you report must quote the specific rule it
violates, from this file, `references/validation.md` or `references/authority-model.md`. If you
cannot point to a line, it is not a finding: do not invent one.

## Generated files: never hand-edit

| File | Generated by |
|---|---|
| `agents.lock` | `node .oaa/oaa.mjs compile <agent>` |
| `AGENTS.md`, `AGENTS.orig.md`, `mcp-config.json` | `prompts/compile-agent.prompt.md` |
| `predicate-<name>.py` | `prompts/predicate-codegen.prompt.md` |
| `COMPANY.md` | `prompts/compile-company-map.prompt.md` |
| `ONTOLOGY.md` | the ontology compiler |

To change one, change its source and regenerate. `README.md` and `CLAUDE.md` are not generated.

## Kind cheat sheet

| Kind | Owns the... | Never... |
|---|---|---|
| agent | schedule, model, memory | declares authority itself |
| role | accountability: owns/decides/escalates | restates a tool's never in prose |
| skill | procedure: workflow steps | contains organizational judgment (a role's line) |
| tool | hard ceilings: never | is called directly by a role or agent (always through a skill) |
