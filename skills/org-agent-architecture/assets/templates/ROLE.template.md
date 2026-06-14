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

{{Operating prose: what good performance looks like; definitions the authority
identifiers rely on ("stable volume means…"); contextual notes. Prose does NOT
grant or restrict anything — only the frontmatter composes.}}

## Decisions Log

Escalation outcomes accumulate in `decisions/` (one dated file per decision).
Every DEFAULT escalation logged there is a missing line in this file's authority block.
