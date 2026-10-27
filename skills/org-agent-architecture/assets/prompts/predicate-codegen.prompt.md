---
name: predicate-codegen
oaa-version: 0.8.0
job: "Compile an executor:predicate agent's AGENTS.md into predicate-<name>.py, a deterministic script that runs with no model"
inputs: ["agent name", "wrapper root"]
reads: ["agents/<name>/AGENTS.md", "each TOOL.md in the agent's chain", "each tool's server/ entry"]
writes: ["agents/<name>/predicate-<name>.py"]
never: ["modify a source node", "call a tool", "run the script", "write any file except the script"]
---

# Compile a Predicate Agent

An agent whose `AGENT.md` declares `executor: predicate` runs a **script** at run time, with no
model. The script is a compiled artifact: it is generated from the agent's compiled `AGENTS.md`,
the same way `AGENTS.md` is generated from the chain. You are doing that second compile.

- **IN:** `agents/<name>/AGENTS.md` (the agent's full contract), plus the `TOOL.md` of every tool
  in its chain, for the tool's declared functions and how it is reached.
- **OUT:** the complete text of `agents/<name>/predicate-<name>.py`, and nothing else.

You are compiling judgement *out*. The skill's deterministic steps become code. If a step needs
open-ended judgement (interpreting text, weighing options, drafting prose), it does **not** belong
in a predicate agent. Stop and report that the node is mis-classified. Do not invent a heuristic.

Recompile the script whenever the agent's chain changes, the same trigger as an `AGENTS.md`
recompile. Like `AGENTS.md`, the script is generated and is **not** pinned in `agents.lock`: the
lock pins the source nodes the script is compiled from.

## Hard constraints (a violation is a failed compile)

1. **Deterministic only.** No model calls. No randomness. The same inputs give the same calls and
   the same writes. Network and storage are reached only through the agent's granted tools.
2. **Least privilege.** Use only the tools in the agent's chain, and only the functions their
   `TOOL.md` declares and the skill's steps name. Reach each tool the way its own `server/` entry
   says. Do not import another client, open another connection, run a shell command, or read a file
   the contract did not grant. Never do what a role's `never` forbids, and never widen authority
   the `## Hard Limits` section sets.
3. **Filename and entry point.** Emit exactly `predicate-<name>.py` (`<name>` is the agent's
   directory name), in Python, with a `main()` and `if __name__ == "__main__": sys.exit(main())`.
4. **Event argument.** Accept `--trigger-context <json>`. It is present when the agent was woken
   by an event and absent on a clock tick. Act on the event first when it is present, and tolerate
   its absence.
5. **Escalate through a tool.** For each identifier the contract lists under `escalates`, raise the
   escalation through a tool in the chain that is granted for it, as the `## Escalation` section
   says. Never start another agent yourself, never shell out to a scheduler, and never write to a
   place the chain does not grant. If the chain grants no tool for an escalation, do not invent
   one: list that escalation as unraised in the report and stop treating it as handled.
6. **Untrusted text stays out of escalations.** Build every message from identifiers, counts and
   fixed words. Never copy text that came from outside, such as a title, a sender or a body, into
   an escalation or a log line that another agent will read.
7. **Resilience.** One failed call or one bad item skips that item, with a logged reason, and the
   run continues. It never aborts the whole run for one item.
8. **Report.** Print one JSON object to stdout summarising the run: the agent, when it ran, the
   checks made, the escalations raised and their results, and anything skipped with its reason.
   Log lines go to stderr. Exit 0 on a clean run, including "nothing to do". Exit non-zero only on
   an unrecoverable error.
9. **State.** Keep state only in the agent's own `memory/` folder
   (`agents/<name>/memory/predicate-state.json`) or in a granted tool's own store. Running the
   same tick twice must change nothing the second time: never raise the same escalation twice for
   the same item.
10. **Header.** Start the file with a comment that says it is generated from
    `agents/<name>/AGENTS.md` by `predicate-codegen@0.8.0`, must not be edited by hand, and that
    the fix for a wrong script is to change the skill and recompile.

## `<hints>`: contract phrase to code

These hints are for you, the model writing the script. They turn common phrases in a contract into
code. They are a lookup, not a script, and they name no tool: how to call a tool comes from its
`TOOL.md`.

```
<hint contract="schedule: <cron>">              one pass per invocation; the scheduler repeats it. Do not loop or sleep. </hint>
<hint contract="skill step: monitor <things> where <condition>">  list through the tool's list function, then filter in code. </hint>
<hint contract="skill step: seen / new / not yet handled">        persist the handled ids in predicate-state.json; write the file at the end of a successful run. </hint>
<hint contract="first run, no state yet">       record what exists as handled and raise nothing, unless the skill says otherwise. </hint>
<hint contract="escalates: <identifier>">       raise it through the granted tool, with the identifier, the item id and a count. </hint>
<hint contract="a step that needs judgement">   stop and report the node as mis-classified (see above). </hint>
```

When a contract phrase has no hint, follow the skill's steps literally under the hard constraints.

## Conformance

The first compile of an agent that already has a hand-written `predicate-<name>.py` must reproduce
its observable behaviour: the same reads, the same writes and the same escalations. Use the
existing file as a reference for behaviour, not as text to copy.

## Never

- Modify `AGENT.md`, `ROLE.md`, `SKILL.md`, `TOOL.md` or `AGENTS.md`.
- Call a tool or run the script while compiling it.
- Write any file other than `predicate-<name>.py`.
