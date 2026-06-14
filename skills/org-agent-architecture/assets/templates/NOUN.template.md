---
kind: noun
name: {{noun-name}}                  # the canonical identifier used in authority blocks
description: {{One sentence: what this thing is.}}
system-of-record: {{where-it-actually-lives}}   # e.g., postgres://main/subscribers, or a SaaS object
states: [{{lifecycle-states}}]       # optional, e.g., [pending, confirmed, suppressed]
relationships:                       # nouns reference each other laterally, not via requires
  has-many: [{{child-noun}}]
  distinct-from: [{{lookalike-noun}}]   # the negative space: what this is explicitly NOT
classification: {{public | internal | restricted | secret}}   # RESERVED field; ignored by current tooling
---

# Noun: {{Noun Name}}

{{Definition prose: edge cases, what counts and what does not. When the noun layer
is adopted, every identifier in every authority block must resolve here.}}
