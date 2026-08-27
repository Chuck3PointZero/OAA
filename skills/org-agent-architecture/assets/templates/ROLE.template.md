---
kind: role
name: {{role-name}}                  # lowercase-hyphenated; must match directory name
description: {{One sentence: the accountability this role carries.}}
requires:
  - ../../skills/{{skill-name}}      # the procedures this job needs; one line per skill
watches:
  - {{signal-1}}                     # signals/events this role monitors (e.g., cpa-spikes)
authority:
  owns:
    - {{domain-noun}}                # MUST be disjoint with every other role's owns
  decides:
    - {{bounded-action}}             # autonomous actions, with bounds in the name where possible
                                     # e.g., budget-change-within-20pct-per-24h
                                     # decides: [] is legal — a pure watcher role
  escalates:
    - {{human-threshold}}            # the line where a human decides
  never:
    - {{other-roles-domain}}         # explicit non-ownership; omit field entirely if empty
---

# Role: {{Role Name}}

{{Operating prose — only write this if an authority identifier needs a definition
("stable volume means ≥ 3 consecutive hours"), or good performance has a shape
a maintainer couldn't derive from the frontmatter. Never restate owns/decides/
escalates/never in prose. If the frontmatter is self-explanatory, one line or nothing.

A ROLE.md with no body beyond frontmatter and this one-line mission is fully
valid. Section headings you might add below — Memory, Decisions Log, or
anything else — are examples of what operating prose CAN contain, not a
required-sections checklist. Add a section only because this specific role
needs it, never because a template or another role's ROLE.md has one.}}

## Memory

`memory/state.json` persists between activations — the runtime state for this role's owned domain.
Omit this section if the role makes no decisions based on prior state.

```json
{{state-schema-example}}
```

{{Field-by-field notes: what each field tracks, when it resets, what a human learns from it.}}

**For `executor: remote` agents:** the runner injects this schema into the system prompt. Without
documented field names, the model invents them. Every remote-executor agent filling this role must
have this section populated.

## Decisions Log

Escalation outcomes accumulate in `decisions/` (one dated file per decision).
Every DEFAULT escalation logged there is a missing line in this file's authority block.
