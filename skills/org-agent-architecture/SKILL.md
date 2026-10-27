---
kind: skill
name: org-agent-architecture
aliases: [oaa]
description: Scaffold, decompose, validate, and maintain organizational agent hierarchies under the AGENT -> ROLE -> SKILL -> TOOL convention (one primitive, four kinds, authority blocks, agents.lock). Use this skill whenever the user wants to create or edit an AGENT.md, ROLE.md, SKILL.md, TOOL.md; define what an agent owns, decides, escalates, or must never do; set up or reorganize a repository of agents, roles, skills, or tools; wrap an MCP server or API as a tool; split a role into sub-roles or extract a shared skill; review an agent architecture for ownership conflicts or authority gaps; or generate or update agents.lock entries - even if they don't name the convention explicitly and just say things like "give this agent a job description," "what is this agent allowed to do on its own," or "add a new tool for X."
allowed-tools:
  - read
  - write
  - edit
  - glob
  - grep
triggers:
  - give this agent a job description
  - what is this agent allowed to do on its own
  - what can this agent do without asking
  - create an AGENT.md
  - create a ROLE.md
  - create a SKILL.md
  - create a TOOL.md
  - add a new role
  - add a new agent
  - authority block
  - who decides
  - who owns this
  - escalation threshold
  - what is this agent never allowed to do
  - agents.lock
  - compile agent
  - compile the agent
  - agent hierarchy
  - wrap an MCP server
  - wrap an API as a tool
  - split a role
  - extract a shared skill
  - agent architecture
  - organizational agent
  - OAA
  - AGENT.md
  - ROLE.md
  - agent permission
  - agent authority
  - agent ownership
  - what does this agent own
  - decision rights
  - escalation rules
  - never rules
  - node validation
  - agents dot lock
  - lockfile
  - COMPANY.md
  - company map
  - ontology
  - compile schema
  - write entity
  - query concept
---

# Organizational Agent Architecture

This is the **official OAA skill file**. OAA structures multi-agent systems the way companies are
structured: agents fill roles, roles require skills, skills require tools, and bounded authority
composes down the chain. This file says which prompt does which job and holds the judgement that is
not procedure. It repeats nothing that lives elsewhere.

In a company, everything below lives in `.oaa/` and the company's `README.md` is the entry point. In
the OAA repository it lives in this skill's folder.

## Where things are

| Path | What it is |
|---|---|
| `assets/INSTRUCTIONS.md` | The binding rules: the model, the fields by kind, the generated files. Read it before you touch any node. |
| `assets/prompts/` | One prompt per job (the table below). `prompts/README.md` is the index. |
| `assets/oaa.mjs` | The utility. `node oaa.mjs compile <agent>` resolves a chain and pins it in `agents.lock`; `node oaa.mjs validate` checks structure. It does the deterministic work, and never a model. |
| `assets/templates/` | A template for each kind, and `examples/`, a small company that validates clean. |
| `references/` | `authority-model.md`, `validation.md`, `executor.md`, `runner.md`, `ontology-memory.md`, `example-meta-ads.md`. Read when the job needs one. |

## Which prompt for which job

| The user wants to | Run |
|---|---|
| Set up OAA in an empty folder | `bootstrap.prompt.md` |
| Create an agent, role, skill or tool | `create-node.prompt.md` |
| Compile an agent | `compile-agent.prompt.md` (it runs `predicate-codegen.prompt.md` for a predicate agent and `compact-agent.prompt.md` for `models: [tiny]`) |
| Compile the company map | `compile-company-map.prompt.md` |
| Check a structure, or an agent's authority | `validate.prompt.md` |
| Bring a company from before 0.8 up to date | `migrate.prompt.md` |

Common sequences: a **new system** is bootstrap, then create-node bottom-up (tools, skills, roles,
agents), then compile each agent, then validate. **Adding an agent** is create-node for what is
missing, a check that its roles' `owns` do not overlap existing roles, then compile and validate.

## Decomposing

Split only when a trigger fires. Do not decompose speculatively.

- **Split a role** when its `owns` mixes accountabilities whose escalations different humans should
  review (spending money, making creative work, watching the account). Afterwards the `owns` lists
  are disjoint across the whole graph, and every affected agent is recompiled.
- **Extract a shared skill** when two roles would compute or define the same thing (a metric, a
  parsing rule). The definition then exists in exactly one place.
- **A tool is one `TOOL.md`** per MCP server or API, holding its provenance, transport and every
  `never`. Server code, vendored packages, a proxy and `mcp.json` go in the tool's `server/` folder.
  Use the connector/capability split only when different functions on one server need different
  `never` rules that would wrongly constrain skills that never call them: one connector file for the
  transport-wide `never`, one capability file per function, and skills require the capability files.
- **Keep the agent singular** until roles need different schedules, models or reviewers. Then the
  split is a one-line move of a `fills` entry.

## Many agents, one role

When one accountability needs many isolated instances (territories, accounts, books, parallel
implementations), fill the role with many agents. Do not fork the role per instance. Each agent's own
memory carries what is specific to it. The role's `owns`, `decides`, `escalates` and `never` are the
shared contract every instance inherits identically.

## Authority audit

When something went wrong, a role feels too broad, or someone asks "what can this agent do?": run
`node oaa.mjs compile <agent>` and read `authority`, which gives the composed `never`, `decides` and
`escalates` for the whole chain. Report what the agent can do autonomously, what triggers an
escalation and what is forbidden. Flag any action discussed in prose but absent from every authority
field (a gap), any `never` repeated at a second layer (drift), and any identifier spelled two ways
across layers (an error). `references/authority-model.md` has the composition rules.

## Common mistakes

- MUST NOT restate a tool's `never` in a skill or role "for safety". It creates drift and adds no
  safety. Delete the copy.
- MUST NOT put decision thresholds on the agent. They belong to the role: the agent is replaceable,
  the role is not.
- MUST NOT put organizational judgement in a skill body ("escalate purchases over $500"). A threshold
  or an ownership decision is a role's line.
- MUST NOT hardcode a model name in agent frontmatter. Model choice is host configuration, recorded in
  the body prose only.
- MUST NOT point a `requires` edge upward or sideways.
- MUST NOT store a credential value in any node file. Env var names only.
- MUST NOT treat `README.md` as the spec. It is narrative and is not hashed; the typed root file is the
  node.
- MUST NOT leave a `{{placeholder}}` in a committed node.
- MUST NOT hand-edit a generated file (`AGENTS.md`, `COMPANY.md`, `agents.lock`, `mcp-config.json`,
  `predicate-<name>.py`). Edit the source node and recompile.
- MUST NOT hand-author run order, memory schema tables or env-var tables in `AGENT.md`. They are
  generated, and a hand copy goes stale.
- MUST NOT flag a missing example-only body section as a finding of any severity.
- MUST NOT model an external autonomous system as a tool because it is "just an API". If it makes its
  own model calls, plans its own steps or has its own persona, it is an agent with `executor: remote`,
  filling the role its output accountability matches. A tool is dumb by convention.

## Ontology and memory

A role that needs shared domain vocabulary or a memory store uses the ontology server and the
`oaa-ontology-design` skill. How to open the store, write entities and query derived concepts is in
`references/ontology-memory.md`.
