---
name: compile-company-map
oaa-version: 0.8.0
job: "Generate COMPANY.md, the plain-English map of every agent, role, skill and authority boundary, from the node graph"
inputs: ["wrapper root"]
reads: ["AGENT.md", "ROLE.md", "SKILL.md and TOOL.md frontmatter", "role bodies", "the gap-severity findings of a validate run"]
writes: ["COMPANY.md at the wrapper root"]
never: ["invent an authority rule", "threshold or tool name", "write a gap that no finding backs", "modify a source node"]
---

# Compile the Company Map

`COMPANY.md` is a **generated artifact**: the plain-English reference that maps every role to its
agent, schedule and authority boundaries without making a reader open the node tree. Never
hand-edit it. Regenerate it whenever any `AGENT.md`, `ROLE.md` or `SKILL.md` changes.

## Steps

1. **Validate first.** Run `node .oaa/oaa.mjs validate --json` from the wrapper root and collect
   every finding of severity `gap`. This is a precondition, not optional: the `## Gaps` section
   comes only from this run's findings, never from your own judgement.
2. **Read every node in the graph.** For each agent: `AGENT.md` frontmatter (name, `fills`,
   `metadata.schedule`). For each role those agents fill: `ROLE.md` frontmatter (`owns`,
   `decides`, `escalates`, `never`) and body prose. For each skill those roles require: `SKILL.md`
   frontmatter (`name`, `description`, `allowed-tools`). For each tool those skills reference:
   `TOOL.md` frontmatter (`name`). Do not read upward or sideways.
3. **Synthesise `COMPANY.md`** from that data and the gap findings, following the instructions
   below.
4. **Verify before writing.** Every role in the graph appears in the Roles section. Every agent
   appears in the mapping table. No authority rule, threshold or tool name in the output is absent
   from the source nodes. Every line in `## Gaps` matches exactly one gap finding from step 1, no
   more and no fewer; if step 1 found none, the section still appears with one line saying so.
   If you find invented content, abort and report what was invented.
5. **Write `COMPANY.md`** at the wrapper root (the folder that holds `agents/`, `roles/`,
   `skills/` and `tools/`), with the generated-file comment shown in the structure below.

## Synthesis instructions

You generate COMPANY.md - the plain-English reference document that maps an OAA
agent graph to its human-readable structure: roles, agents, schedules, authority
boundaries, and skills. You will be given the raw content of every AGENT.md,
ROLE.md, SKILL.md, and TOOL.md in the graph. Produce a COMPANY.md that a
non-technical reader can use to understand who owns what without opening any
node file.

## Source data to use

For each agent: name, schedule (from metadata.schedule in frontmatter), and which
roles it fills.
For each role: name, description, owns, decides, escalates, never, required skills,
and which agent fills it.
For each skill: name, description, and which tools it is allowed to use (by name).
For gaps: the full list of gap-severity findings from the validation run that
was required as a precondition to compiling this document - each finding as
given, with its node path and the rule text it cites. Do not use error- or
warning-severity findings; those belong in a validation report, not here.

Do not invent authority rules, thresholds, or tool names that do not appear in the
source files. Do not copy skill workflow steps into COMPANY.md - workflow prose
belongs in SKILL.md, not here. Do not invent a gap, alter a gap's severity, or
add detail to a gap that was not present in the finding you were given - the
`## Gaps` section is a direct restatement of the validation run's actual output,
not an independent judgment call.

## Rules

- Sort the Agent-to-Role Mapping table alphabetically by agent name, then by role name within the same agent.
- Sort role entries alphabetically. Sort skill entries alphabetically.
- Use `###` (h3) for role headings, `####` (h4) for skill headings, `##` (h2) for
  section headings.
- Cron schedules: quote the expression in backticks exactly as it appears in
  `metadata.schedule`. If an agent has no schedule field, write `(none)`.
- Never fabricate authority items, thresholds, or tool names.
- Never include skill workflow steps - COMPANY.md is a reference map, not an SOP.
- Never fabricate a gap. If you were given zero gap-severity findings, the
  `## Gaps` section still appears, containing exactly one line: "No gaps were
  found in the most recent validation run."
- Output only the Markdown content. No preamble. No explanation of what you did.

## Structure to produce

```markdown
# {Company Name} Company Map

<!-- GENERATED - do not hand-edit. Regenerate by running compile-company-map.prompt.md. -->

{One short paragraph: state that this document maps the OAA agent graph for human
 readers without requiring them to open node files, and that authority and
 accountability live at the role level.}

## Role to Agent Mapping

| Agent | Role | Schedule |
|---|---|---|
| {agent-name} | {role-name} | `{cron}` |

## Roles

### {role-name}

{One paragraph. State: what the role owns, what it decides autonomously, what
 triggers escalation to a human, and what it is never permitted to do. End with:
 "It is implemented by the [{skill}](#{skill}) skill[s], and is filled by the
 {agent} agent."}

## Skills

{One paragraph of context: skills are the only place tools are invoked; no role
 or agent calls a tool directly.}

#### {skill-name}

{One or two sentences from the skill's description field.} Tools: {tool1}, {tool2}.

## Gaps

{One paragraph of context: this section lists every gap-severity finding from
 the validation run that produced this document - undeclared territory the
 convention flags but does not forbid. Absence from this section is not a
 guarantee of completeness beyond what validation actually checked.}

- {One line per gap: the finding, the node path, and the rule text it cites,
  exactly as given.} If none: "No gaps were found in the most recent validation
  run."
```