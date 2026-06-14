---
kind: tool
name: {{tool-name}}
description: {{One sentence: what this tool does and why it exists.}}
type: {{api | mcp | local}}
env: {{ENV_VAR_NAME}}                # the primary credential env var; name only, never the value
provenance:                          # required for type: api and type: mcp
  source: {{upstream-url-or-internal}}
  status: {{first-party | third-party}}
  vendored: server/vendor/{{package}}
  pinned-in: agents.lock
authority:
  never:
    - {{hard-ceiling-or-safety-rule}} # what this tool must never do, regardless of who calls it
---

# Tool: {{Tool Name}}

{{What the underlying service is; auth model (env var NAMES only — never values);
known quirks; rate limits.}}

## Declared Functions

| Function | Description |
|---|---|
| `{{function_name}}` | {{what it does}} |

## server/ — the implementation

- `server/mcp.json` (or client config) — transport configuration
- `server/proxy/` — enforcement layer applying every `never`
- `server/vendor/{{package}}/` — vendored upstream code, hash-pinned via agents.lock
