---
name: create-node
oaa-version: 0.8.0
job: "Create one correct OAA node (agent, role, skill or tool) from its template"
inputs: ["what the user describes", "wrapper root"]
reads: [".oaa/INSTRUCTIONS.md", ".oaa/templates/", "existing roles", "skills and tools"]
writes: ["one new node: a typed file or directory under agents/ roles/ skills/ tools/"]
never: ["write frontmatter from memory", "leave a {{placeholder}}", "declare authority on an agent", "restate a tool's never in a role", "point a requires edge upward", "create a node whose requires target does not exist"]
---

# Create a Node

Read `.oaa/INSTRUCTIONS.md` first. Its rules are binding. This is the only definition of how a node
is created.

## Steps

1. **Pick the kind** with the guide below. If you are torn between two kinds, it is two nodes.

2. **Before creating a role, look at the roles that already exist.** Read the `owns`, `decides`,
   `escalates` and `never` of each. Many agents can fill one role: this is the right pattern for "the
   same job, another instance" (another territory, another book, another implementation of the same
   responsibility). Create a new role only when the accountability is genuinely different. Inventing a
   role whose authority an existing one already covers produces overlapping `owns` and restated
   `never` rules that drift from the original.

3. **Build bottom-up.** Tools before skills, skills before roles, roles before agents. Every
   `requires` edge points down and to a node that already exists. If the target does not exist, create
   it first, with this same prompt.

4. **Choose the file form.** Use a directory when the node needs sub-folders (`memory/`, `decisions/`,
   `server/`, `references/`), and a flat `<name>.<kind>.md` file when it does not.

5. **Copy the template** from `.oaa/templates/` (`AGENT.template.md`, `ROLE.template.md`,
   `SKILL.template.md`, `TOOL.template.md` or `TOOL-connector.template.md`). Never write frontmatter
   from memory. For a directory node, also copy `manifest.json`.

6. **Fill the frontmatter first, the body second.** The frontmatter is the contract and the body is
   operating prose. `.oaa/INSTRUCTIONS.md`, "Fields by kind", says what each field is, which kinds may
   use it and which are required: use only fields in that table. Resolve every `{{placeholder}}`: a placeholder left in a committed file is a
   validation failure. Omit an optional field rather than leaving it empty.
   - `type` is `oaa/<Kind>` and matches `kind`.
   - A **tool** has a `connector` (`mcp`, `api` or `local`), not a `type` of that name.
   - An **agent** declares **no authority**. Set its `executor` (see below).
   - Place each authority constraint at the one layer that owns it. A role's `never` states what the
     role must not do; it never restates a tool's `never`.

7. **Wire `requires`** (an agent's `fills`, a skill's `allowed-tools`) as relative paths to nodes that
   exist.

8. **Self-check before saving**, against the field table in `.oaa/INSTRUCTIONS.md`. Every one of these
   must be true:
   - the file name is the typed name (`AGENT.md`, `ROLE.md`, `SKILL.md`, `TOOL.md`), or the flat form;
   - `type` matches `kind`, and `name` matches the directory or file name;
   - no field is empty and no `{{` remains;
   - an agent has no `authority` block;
   - every `requires` path resolves, and none points upward or sideways;
   - every `never` on a tool has something that enforces it at call time (see `references/validation.md`).

9. **Do not add the node to `agents.lock` by hand.** The lock is generated. Run
   `node .oaa/oaa.mjs compile <agent>` once an agent uses the node, and
   `node .oaa/oaa.mjs validate` to confirm the graph is still valid.

## Kind decision guide

| The user is describing | Kind |
|---|---|
| A single callable capability (one API endpoint, one MCP function, one script) | **tool** |
| An MCP server or API with several functions | **tool** |
| A procedure: steps, a workflow, a how-to, a when-to | **skill** |
| An accountability: a domain someone owns, with decision rights and escalation thresholds | **role** |
| A runner: a schedule, memory, a model, the thing that executes | **agent** |
| An object acted upon (the subscriber list, the budget) | **noun**, or a consistently named string in authority fields before nouns are adopted |

## Executor, when the node is an agent

| `executor` | Meaning | Then |
|---|---|---|
| `llm` (the default) | A model runs it from its compiled `AGENTS.md`. | Nothing more. |
| `remote` | The same `AGENTS.md` is sent to an external endpoint. | Name the endpoint in `metadata.remote`. |
| `predicate` | A script runs it, with no model. | Its skill's steps must all be deterministic. Compiling also produces `predicate-<name>.py`. |
| `human` | A person fills the role. It is never run. | Declare no `metadata.schedule`. Its `AGENTS.md` is that person's handbook. |

## Never

- Write a node from memory instead of from its template.
- Create an agent, role, skill or tool with an empty authority block "to fill in later".
- Add an edge that points upward or sideways.
