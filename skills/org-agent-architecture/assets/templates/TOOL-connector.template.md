---
type: oaa/Tool
kind: tool
name: {{tool-name}}                  # the connector for a multi-capability server
description: Connector to {{service}} via {{transport}}. Capabilities are the sibling
  sub-tool files; skills require those, never this connector directly.
connector: {{api | mcp | local}}
provenance:                          # REQUIRED for connector: api and connector: mcp
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

{{Auth model, known quirks, rate limits, enforcement gaps. Omit anything already
captured in the frontmatter (type, env, provenance, never). If the tool is
straightforward, write only what would surprise a maintainer.}}

## server/ — the implementation

- `server/mcp.json` (or client config) — transport configuration
- `server/proxy/` — enforcement layer applying every `never` in this directory
- `server/vendor/{{package}}/` — vendored upstream code, hash-pinned via agents.lock

## Undeclared capabilities

{{List functions the server exposes that deliberately have NO capability file.
Undeclared = unreachable from every chain — stronger than forbidden. Adding one
later is a reviewed commit; that friction is intentional.}}
