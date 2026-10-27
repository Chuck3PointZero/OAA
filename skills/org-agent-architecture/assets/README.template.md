# {{company-name}}

{{domain}}

This folder is an OAA company: agents fill roles, roles require skills, skills use tools, and
authority composes down that chain. Read `.oaa/INSTRUCTIONS.md` before you create, edit or
validate any node here. Its rules are binding.

## Jobs

Each job has one prompt in `.oaa/prompts/`. Follow the prompt; do not work from memory.
Commands run from this folder.

| To do this | Follow | Command |
|---|---|---|
| Create a node | `.oaa/prompts/create-node.prompt.md` | |
| Compile an agent | `.oaa/prompts/compile-agent.prompt.md` | `node .oaa/oaa.mjs compile <agent>` (the prompt runs it) |
| Compile a predicate agent's script | `.oaa/prompts/predicate-codegen.prompt.md` (the compile prompt runs it for `executor: predicate`) | |
| Shrink an agent's prompt for a small model | `.oaa/prompts/compact-agent.prompt.md` (the compile prompt runs it for `models: [tiny]`) | |
| Compile the company map | `.oaa/prompts/compile-company-map.prompt.md` | |
| Validate the graph | `.oaa/prompts/validate.prompt.md` | `node .oaa/oaa.mjs validate` |
| Check whether an agent is current | | `node .oaa/oaa.mjs validate` (no `Lockfile` finding for its chain, and its `AGENTS.md` exists) |
| Run a compiled agent | `.oaa/references/runner.md` if present, else hand its `AGENTS.md` to a model as its full instructions | |
| Migrate an older company | `.oaa/prompts/migrate.prompt.md` | |

`agents.lock`, every `AGENTS.md`, `COMPANY.md` and every `predicate-<name>.py` are generated. Never
edit them by hand.

## Escalation

{{escalation-sink}}

## Agents

| Agent | Executor | Fills |
|---|---|---|
| {{agent}} | {{llm \| remote \| predicate \| human}} | {{roles}} |
