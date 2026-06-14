---
kind: skill
name: {{skill-name}}
description: {{One sentence: the procedure. Written for catalog-level discovery (~100 tokens).}}
allowed-tools:                       # skill-kind spelling of `requires` (agentskills.io compat)
  - ../../tools/{{tool-name}}        # the tool(s) this skill calls
authority:                           # ONLY if this procedure adds its own constraint;
  escalates:                         # otherwise omit the whole block
    - {{procedure-specific-trigger}} # e.g., repeated-tool-failure
---

# Skill: {{Skill Name}}

{{What this procedure accomplishes and when a role should reach for it.}}

## Workflow

1. {{Step — name the tool function used}}
2. {{Decision point — thresholds as numbers; note which verdicts belong to the
    ROLE (the skill detects the threshold; the role owns it)}}
3. {{Output/handoff — what is written to memory, dispatched, or escalated}}

## Supporting Files

- `scripts/` — deterministic helpers (optional)
- `references/` — loaded on demand
- `assets/` — output templates this procedure fills
