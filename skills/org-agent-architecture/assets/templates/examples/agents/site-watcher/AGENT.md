---
type: oaa/Agent
kind: agent
name: site-watcher
description: Checks the site every five minutes with no model, and escalates when it has failed twice in a row.
executor: predicate
fills:
  - ../../roles/site-watcher
metadata:
  schedule: "*/5 * * * *"
---

# Agent: Site Watcher

A predicate agent: its skill is compiled into a script, so nothing here runs a model. It keeps the
previous check's result in `memory/predicate-state.json`.
