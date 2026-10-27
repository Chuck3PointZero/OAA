---
type: oaa/Agent
kind: agent
name: status-reporter
description: Writes the daily account of how the site did, using a model.
executor: llm
models: [tiny]
fills:
  - ../../roles/status-reporter
metadata:
  schedule: "0 8 * * *"
---

# Agent: Status Reporter

Runs on a small model, so compiling it also produces a compact `AGENTS.md`.

## Memory

**Path:** `memory/state.json`. It holds the last 24 hours of check results, as written by the
site watcher.
