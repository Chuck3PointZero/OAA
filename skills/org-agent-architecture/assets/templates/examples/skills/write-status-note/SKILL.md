---
type: oaa/Skill
kind: skill
name: write-status-note
description: Writes a short plain-language note on how the site did over the last day, from the stored check results.
---

# Skill: Write Status Note

## Workflow

1. Read the last 24 hours of check results from memory.
2. Write at most five sentences: how many checks failed, when, and for how long. Say nothing about a
   cause you do not have evidence for.
3. If the results do not show whether an outage was one event or several, say so in the note instead
   of choosing.
