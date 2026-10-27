# Prompts

Each file here is the one definition of a job. A company gets a verbatim copy in `.oaa/prompts/`,
so a prompt is changed here, never downstream. Every prompt starts with a contract in its
frontmatter: `name`, `oaa-version`, `job`, `inputs`, `reads`, `writes` and `never`.

The compile and validate utility, `oaa.mjs`, does the deterministic work. The prompts do the
writing and the judgement.

| Job | Prompt | Inputs | Output |
|---|---|---|---|
| Set up an empty company | `bootstrap.prompt.md` | folder, domain, escalation sink | the layout, `.oaa/`, `README.md`, `CLAUDE.md`, an empty `agents.lock` |
| Create a node | `create-node.prompt.md` | what the user describes | one agent, role, skill or tool |
| Compile an agent | `compile-agent.prompt.md` | agent name | `AGENTS.md`, `mcp-config.json`, the lock |
| Compile a predicate agent's script | `predicate-codegen.prompt.md` | the agent's `AGENTS.md` | `predicate-<name>.py` |
| Shrink an agent's prompt for a small model | `compact-agent.prompt.md` | `AGENTS.orig.md` | a compact `AGENTS.md` |
| Compile the company map | `compile-company-map.prompt.md` | the graph and its gap findings | `COMPANY.md` |
| Validate the graph | `validate.prompt.md` | the graph | a report with a verdict |
| Migrate an older company | `migrate.prompt.md` | a company from before 0.8 | the company in 0.8 form, and a report |

Two jobs run other prompts for you: `compile-agent` runs `predicate-codegen` for an
`executor: predicate` agent and `compact-agent` for a `models: [tiny]` agent.

## The utility

```
node .oaa/oaa.mjs compile <agent>     the resolved chain as JSON, and an updated agents.lock
node .oaa/oaa.mjs validate [--json]   structural checks, each naming its check
```

## Rules for every prompt

- It reads and writes files only. It never calls a tool or runs an agent's workflow.
- It never modifies a source node, except `create-node` (which writes one) and `migrate` (which
  changes the fields it lists).
- It never computes or edits a hash. The utility owns `agents.lock`.
