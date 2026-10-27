# Proposal: fix the compile-agent path (utility + templates + prompt)

Status: proposed 2026-10-26. Decides: the owner. Nothing is built; no files are changed by this
document. Plain ASCII only.

Anchor: the compiled `AGENTS.md` shape is the machincy **company** examples -
`C:\Users\Chuck\Documents\src\machincy\company\agents\*\AGENTS.md`. The `orbit` example
(`contrib/machincy-ops-manager/`) is NOT a reference; it is a known mistake and is ignored here.

## 1. The problem, in one paragraph

Compiled `AGENTS.md` has never had one owner. The harness `compiler.ts` emitted one shape (a dump of
node bodies plus a composed Authority block); the written CLAUDE.md spec described another; and the
0.8 `compile-agent.prompt.md` + its golden example invented a third (Identity / Hard Limits / Run
Order / Escalation / Env / Does Not Own). Because no tool reliably ran, every composed file was
produced by a model following whichever spec it happened to read, so the shapes drifted. The 0.8
rewrite was the latest drift: it reorganized a mechanical dump into hand-composed sections and split
the `never` list, which is why the 2026-10-25 cyberplex recompile changed all nine files
(+1026/-1487) when it should have barely touched them.

## 2. What the anchor actually is

Derived from `machincy/company/agents/ads-manager/AGENTS.md` (multi-role llm) and
`finance-expense-monitor/AGENTS.md` (the trigger/credential-check surface). The compiled file is a
**mechanical dump of node bodies plus two computed blocks** - there is no compile-time prose
composition at all:

```
# <name>
> <one-line description>

<!-- GENERATED comment: source + timestamp (+ compiled-with stamp - see decision D3) -->

## Identity
**Agent:** <name>
**Description:** <description>
**Fills:** <roles, comma-joined>        # omit if the agent fills no roles

<agent's own AGENT.md body, verbatim>    # the "# Agent: <Title>" heading and any narrative

   # agent-body sections, included verbatim when the AGENT.md body has them:
   ## Memory                 - the memory/state.json path + JSON schema + field notes
   ## Startup Credential Check   - "required env vars; if missing, escalate and exit"
   ## Trigger Model          - how the agent is woken (schedule, --force, webhook, event)
   ## Named Exclusions       - agent-specific carve-outs

## Roles                                 # one block per role in fills order
### <role-name>
<role.description>
<role's own ROLE.md body, verbatim>      # routing tables, "what this role does not own", etc.

## Skills                                # one block per skill
### <skill-name>
<skill.description>
<skill's own SKILL.md body, verbatim>    # the ## Workflow / ## Procedures / ## Outputs

## Tools                                 # one block per tool
### <tool-name>
<tool.description>
**Connector:** <api|mcp|local>           # (machincy shows "Type:"; OKF makes this "Connector:")
**Env:** `<VAR>`                         # omit if the tool needs no credential

## Authority                             # COMPOSED - the one computed narrative block
**Owns:** <union of every role's owns>
**May decide autonomously:** <union of every role's decides>
**Must escalate:** <union of role + skill escalates>
**Never:** <union of every tool, skill and role never>

_Unlisted actions default to escalate. `never` overrides all other grants._

## Required Environment                  # COMPOSED - union of every tool's env, names only
- `<VAR>`
```

Two things follow from this and resolve the whole thread:

- There is **no `Hard Limits` / `Run Order` / `Escalation` / `Does Not Own`** section, and the
  `never` list is **not split** by declaring node. Those were the orbit/0.8 invention. The anchor
  dumps the bodies (which already carry the routing and the procedures) and composes one `Authority`
  block.
- The only non-mechanical parts are the three labeled Identity fields and the two composed blocks
  (`Authority`, `Required Environment`). Everything else is node bodies, concatenated. **So the
  "composition" a model should do happens when it authors the node bodies (create-node), not at
  compile time.** Compile is a dump.

## 3. The design: where completeness lives, where composition lives

| Concern | Owner | Why |
|---|---|---|
| Completeness (never drop a `never`, env var, role, skill; compose the `Authority` union correctly) | **the utility (`oaa.mjs`)** - code | enumerable and deterministic; code never forgets a loop iteration |
| Composition (readable Identity line, good Memory notes, clear Workflow prose) | **the node bodies**, authored by a model via `create-node.prompt.md` | this is where judgement belongs - once, in the source, not re-derived every compile |
| Executor extras | **separate model prompts** | `predicate` -> `predicate-codegen.prompt.md` (a script); `models: [tiny]` -> `compact-agent.prompt.md` |

This is why "AGENTS.md should not have changed much": compile concatenates bodies and composes two
blocks. The genuinely new 0.8 work (triggers, predicates) shows up as **agent-body sections**
(`## Trigger Model`, `## Startup Credential Check`) and, for `executor: predicate`, a **separate
script** - not as a reshape of the whole file.

## 4. The fix, in three parts

### 4a. Utility (`harness/src/compiler.ts` -> `oaa.mjs`)

The emitter that produces exactly the Section-2 shape **already exists** in `compiler.ts` (it is what
wrote every machincy `AGENTS.md`). In 0.8 it was disconnected - `cli.ts` says the utility "does NOT
write AGENTS.md." The fix:

1. **Reconnect it:** `node .oaa/oaa.mjs compile <agent>` writes `agents/<name>/AGENTS.md` (the dump +
   `Authority` + `Required Environment`) **and** `agents.lock`, in one deterministic pass. Completeness
   comes free - the composed `Authority` and `Required Environment` are unions the code already builds.
2. **OKF touch-ups only** (structure unchanged): emit `**Connector:**` not `**Type:**`; carry the
   current executor set; keep the `compiled-with` stamp in the header (D3).
3. Keep `mcp-config.json` generation and the lock exactly as they are.

Net: the utility owns the whole compiled file for `llm`/`remote`/`human`. No model step is needed to
produce a correct `AGENTS.md` when the utility can run.

### 4b. Templates (`assets/templates/*.template.md`)

The four node templates are close; the gap is the **agent body**, which is where the new surface
lives. Changes:

- `AGENT.template.md`: add two **optional** body sections with guidance to keep or delete:
  `## Startup Credential Check` (required env vars; escalate-and-exit if missing) and `## Trigger
  Model` (schedule / `--force` / webhook / event - how this agent is woken). These dump straight into
  the compiled file. Leave `## Memory` as is.
- `ROLE.template.md`, `SKILL.template.md`, `TOOL.template.md`: no structural change. They already
  produce the bodies the dump needs. (Confirm `TOOL`'s `connector:` is what the Tools dump reads, per
  4a.2.)

### 4c. Prompt (`assets/prompts/compile-agent.prompt.md`)

Rewrite it thin, to **orchestrate the utility** rather than redefine the format (this is the
"keep the CLI, tell the prompt when and why" shape we agreed):

1. **Validate**, then **run `node .oaa/oaa.mjs compile <agent>`** - it writes `AGENTS.md` and the
   lock. State plainly: this is the normal path; the file's shape is the utility's, not yours.
2. **If you cannot run the CLI:** produce the same file by **reading** the chain and following the
   Section-2 skeleton (reproduced in the prompt as the read-fallback spec). **Never compute a hash or
   write `agents.lock` by hand** - leave the lock stale and say so; a later `validate` flags it, which
   is correct.
3. **Verify** (run `validate`, or re-read): every `never`, env var, escalation, role and skill from
   the chain appears. (Belt-and-suspenders; the utility already guarantees this when it ran.)
4. **Executor extras:** `predicate` -> then run `predicate-codegen.prompt.md`; `models: [tiny]` ->
   copy to `AGENTS.orig.md`, then `compact-agent.prompt.md`.

Delete the invented Identity/Hard-Limits/Run-Order/Escalation/Does-Not-Own structure from the prompt
and from the golden example; the golden example should be **minted by running the fixed utility**,
not hand-drafted.

## 5. Open decisions (owner)

- **D1 - reconnect the emitter?** Recommended: yes - the utility writes `AGENTS.md`; the model only
  authors node bodies and the executor extras. (Alternative: keep it prompt-authored, but then the
  prompt must carry the exact skeleton and we lose the free completeness guarantee.)
- **D2 - Tools dump field:** `**Connector:**` (OKF) replacing machincy's `**Type:**`. Recommended: yes.
- **D3 - header:** keep machincy's `> blockquote` description and add the `compiled-with:
  compile-agent@0.8.0` stamp line (needed for "is this current?" detection). Recommended: yes.
- **D4 - the dead builder:** once reconnected and OKF-updated, there is no stale/competing emitter to
  delete - it becomes the live one. (This supersedes yesterday's "delete the dead builder" note.)

## 6. Rollout

1. Apply 4a/4b/4c in OAA.
2. **Re-evaluate one agent:** run the fixed utility on one cyberplex agent, compare its `AGENTS.md`
   to the machincy shape (not to yesterday's output).
3. On the owner's OK, recompile all nine cyberplex agents - which should now be a **light** change
   from the pre-0.8 files, confined to OKF frontmatter and the predicate/trigger agents, not a
   reshape.
4. Mint the golden example from the fixed utility; record the first real cold run.
