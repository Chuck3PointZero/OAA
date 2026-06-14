---
kind: tool
name: {{tool-name}}                  # the connector for a multi-capability server
description: Connector to {{service}} via {{transport}}. Capabilities are the sibling
  sub-tool files; skills require those, never this connector directly.
type: {{api | mcp | local}}
provenance:                          # REQUIRED for type: api and type: mcp
  source: {{upstream-url-or-internal}}
  status: {{first-party | third-party}}   # third-party = anything we don't author
  vendored: server/vendor/{{package}}     # where the code lives below this node
  pinned-in: agents.lock
authority:
  never:
    - {{transport-wide-rule}}        # applies to EVERY capability of this server;
                                     # per-capability rules go on the capability files
---

# Tool: {{Tool Name}} (connector)

{{What the underlying service is; auth model (env var NAMES only — never values);
known quirks; rate limits.}}

## server/ — the implementation

- `server/mcp.json` (or client config) — transport configuration
- `server/proxy/` — enforcement layer applying every `never` in this directory
- `server/vendor/{{package}}/` — vendored upstream code, hash-pinned via agents.lock

## Undeclared capabilities

{{List functions the server exposes that deliberately have NO capability file.
Undeclared = unreachable from every chain — stronger than forbidden. Adding one
later is a reviewed commit; that friction is intentional.}}
