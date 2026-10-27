# Golden examples

A small, complete company that validates clean: one filled example of every kind, and of every
`executor`. A filled example teaches shape better than `{{placeholders}}`. Copy a node from here
only to see the shape; create real nodes from the templates one folder up.

| Kind | Example | What it shows |
|---|---|---|
| tool | `tools/site-probe/` | A `local` tool with a declared function, a `never` that something enforces (`scripts/probe.py`), and no credentials. |
| skill | `skills/check-site/` | A skill that uses a tool, with deterministic steps and its own escalation. |
| skill | `skills/write-status-note/` | A skill with no tool, written for a model. |
| skill | `skills/decide-site-escalation/` | A skill a person follows. |
| role | `roles/site-watcher/` | A pure watcher: `decides: []`, an escalation table in the body. |
| role | `roles/status-reporter/` | A role with a bounded `decides`, and `never` naming another role's domain. |
| role | `roles/site-owner/` | A role a person fills. |
| agent | `agents/status-reporter/` | `executor: llm` with `models: [tiny]`, a schedule and a memory section. |
| agent | `agents/site-watcher/` | `executor: predicate`: no model at run time. |
| agent | `agents/site-owner/` | `executor: human`: no schedule, never run. |
| noun | `nouns/site/` | A domain object and where it lives. |

None of the agents declares authority. Each role owns something no other role owns.
