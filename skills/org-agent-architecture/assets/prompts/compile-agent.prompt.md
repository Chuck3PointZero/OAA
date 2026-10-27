---
name: compile-agent
oaa-version: 0.8.0
job: "Compile one agent's chain into AGENTS.md (and mcp-config.json, and a predicate script where needed); update agents.lock through the CLI"
inputs: ["agent name", "wrapper root"]
reads: ["AGENT.md", "ROLE.md", "SKILL.md", "TOOL.md", "agents.lock", "oaa.mjs compile output"]
writes: ["agents/<name>/AGENTS.md", "agents/<name>/AGENTS.orig.md (models: tiny)", "agents/<name>/mcp-config.json", "agents/<name>/predicate-<name>.py (executor: predicate)", "agents.lock (by the CLI only)"]
never: ["compute a hash or hand-edit agents.lock", "invent a rule, tool, function, threshold or value not in a source node", "modify a source node", "reshape or re-compose node bodies", "write AGENTS.md for an INVALID graph"]
---

# Compile an Agent

`AGENTS.md` is a generated artifact. It is a **mechanical dump of the chain's node bodies plus two
composed blocks** - nothing is re-worded or re-composed at compile time. Composition belongs in the
node bodies (authored with `create-node.prompt.md`); compile only assembles them. Regenerate
`AGENTS.md` whenever a node in the chain changes; never hand-edit it.

The utility `.oaa/oaa.mjs` does the whole assembly deterministically. **The normal path is to run it.**
You write the file by hand only as a fallback, following the exact structure below.

## The normal path

From the wrapper root:

1. `node .oaa/oaa.mjs validate` - if the verdict is `INVALID`, stop and report every error. Write
   nothing for an invalid graph.
2. `node .oaa/oaa.mjs compile <agent>` - this **writes `agents/<name>/AGENTS.md`**, writes
   `agents/<name>/mcp-config.json`, and updates `agents.lock`. The file's shape is the utility's (the
   structure in "The file" below); you are not composing it.
3. Then handle the executor extras (see "By executor").

That is the entire compile when the CLI runs. Do not hand-edit what it produced.

## If you cannot run the CLI

Produce the identical file by **reading** the chain and assembling it yourself. One hard rule:
**never compute a hash or write `agents.lock` by hand.** Leave `agents.lock` untouched, generate
`AGENTS.md` and `mcp-config.json`, and say the lock is stale - a later `validate` will flag it, which
is correct. A stale lock is fine; a fabricated hash is corruption.

To assemble by reading:

- Read `AGENT.md`; for each path in `fills`, read its `ROLE.md`; for each skill those roles
  `require`, read its `SKILL.md`; for each tool those skills reference, read its `TOOL.md`.
- Emit the structure in "The file" below. **Node bodies are copied verbatim** - the text below each
  node's frontmatter, unchanged. You compose nothing; you concatenate.

## The file

Emit exactly these sections, in this order. Sections in [brackets] appear only when the source has
them.

```
# <agent name>
> <agent description>

<!-- GENERATED - do not hand-edit -->
<!-- Source:    agents/<name>/AGENT.md -->
<!-- Generated: <iso timestamp> -->
<!-- compiled-with: compile-agent@0.8.0 -->

## Identity

**Agent:** <name>
**Description:** <description>
[**Fills:** <role names, comma-joined>]        # omit if the agent fills no roles

<the AGENT.md body, verbatim>                   # the "# Agent: <Title>" heading and any narrative,
                                                # including whatever sections the body author wrote:
                                                # [## Memory] [## Startup Credential Check]
                                                # [## Trigger Model] [## Named Exclusions] ...
                                                # Do NOT emit executor, models or schedule - those
                                                # live in AGENT.md and are read from there (run.ts
                                                # reads executor/models; compile_cron.py compiles
                                                # metadata.schedule into CRON.json). AGENTS.md is the
                                                # system prompt, not an orchestration record.

[## Roles]                                      # omit the whole section if the agent fills no roles
### <role-name>
<role description>

<the ROLE.md body, verbatim>                    # routing tables, "what this role does not own", etc.
                                                # (repeat ### block per role, in fills order)

[## Skills]                                     # omit if the chain has no skills
### <skill-name>
<skill description>

<the SKILL.md body, verbatim>                   # the ## Workflow / ## Procedures / ## Outputs
                                                # (repeat per skill)

[## Tools]                                      # omit if the chain has no tools
### <tool-name>
<tool description>
**Connector:** <api | mcp | local>
[**Env:** `<ENV_VAR>`]                          # omit if the tool declares no env
                                                # (repeat per tool)

## Authority

The following boundaries apply to this agent:

**Owns:** <union of every role's authority.owns>
**May decide autonomously:** <union of every role's authority.decides>
**Must escalate:** <union of every role's and skill's authority.escalates>
**Never:** <union of every tool's, skill's and role's authority.never>

_Unlisted actions default to escalate. `never` overrides all other grants._

## Required Environment

- `<ENV_VAR>`                                   # one per distinct tool env, names only, never values
```

### Rules for the two composed blocks

- `## Authority` is the **only** place authority is composed. It is four flat lists, each the union
  across the whole chain, de-duplicated, in chain order. Do not split `Never` by declaring node, and
  do not add `Hard Limits`, `Run Order`, `Escalation`, or `Does Not Own` sections - the anchor has
  none of these; the routing and limits already live in the dumped role and tool bodies.
- `## Required Environment` is the de-duplicated union of every tool's `env`, names only.
- Everything else is a verbatim copy of a node body. If a fact is not in a source node, it does not
  go in the file.

## By executor

The file above is the same shape for every executor. After it is written and checked:

- `llm`, `remote`, `human`: nothing more.
- `predicate`: follow `predicate-codegen.prompt.md` to (re)generate `agents/<name>/predicate-<name>.py`
  from this `AGENTS.md`.
- `models: [tiny]`: copy `AGENTS.md` to `AGENTS.orig.md`, then follow `compact-agent.prompt.md` to
  rewrite `AGENTS.md` compactly, keeping every tool name, env var and `never` verbatim.

## Verify

Whether the CLI wrote the file or you did, confirm (run `node .oaa/oaa.mjs validate`, or re-read):
every `never`, every env var, every `escalates` identifier, and every role and skill in the chain
appears in the file. If anything is missing, the file is wrong - regenerate it. Never ship a file
that fails this.

## Never

- Compute a hash or edit `agents.lock` (run the CLI for that, or leave it stale).
- Invent a rule, tool, function, threshold or value not in a source node.
- Re-word or re-compose a node body - copy it verbatim.
- Add sections the structure above does not list.
- Modify `AGENT.md`, `ROLE.md`, `SKILL.md` or `TOOL.md`.
- Write `AGENTS.md` for an `INVALID` graph.
