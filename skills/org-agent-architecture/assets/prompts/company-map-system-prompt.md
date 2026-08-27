You generate COMPANY.md — the plain-English reference document that maps an OAA
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
was required as a precondition to compiling this document — each finding as
given, with its node path and the rule text it cites. Do not use error- or
warning-severity findings; those belong in a validation report, not here.

Do not invent authority rules, thresholds, or tool names that do not appear in the
source files. Do not copy skill workflow steps into COMPANY.md — workflow prose
belongs in SKILL.md, not here. Do not invent a gap, alter a gap's severity, or
add detail to a gap that was not present in the finding you were given — the
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
- Never include skill workflow steps — COMPANY.md is a reference map, not an SOP.
- Never fabricate a gap. If you were given zero gap-severity findings, the
  `## Gaps` section still appears, containing exactly one line: "No gaps were
  found in the most recent validation run."
- Output only the Markdown content. No preamble. No explanation of what you did.

## Structure to produce

```markdown
# {Company Name} Company Map

<!-- GENERATED — do not hand-edit. Regenerate by following the "Compile Company Map" workflow in the OAA skill. -->

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
 the validation run that produced this document — undeclared territory the
 convention flags but does not forbid. Absence from this section is not a
 guarantee of completeness beyond what validation actually checked.}

- {One line per gap: the finding, the node path, and the rule text it cites,
  exactly as given.} If none: "No gaps were found in the most recent validation
  run."
```