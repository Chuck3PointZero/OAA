---
type: oaa/Tool
kind: tool
name: site-probe
description: Fetches one fixed web page and reports its status code and response time.
connector: local
authority:
  never:
    - request-any-address-except-the-configured-site
    - send-any-method-except-get
---

# Tool: Site Probe

A local script. It reads the address to check from the environment of whatever runs it, so the
address is never written into a node.

## Declared Functions

| Function | Description |
|---|---|
| `probe_site` | One GET of the configured page. Returns `status` (the HTTP status code) and `ms` (the response time). |

## Enforcement

| never | Enforced by |
|---|---|
| request-any-address-except-the-configured-site | `scripts/probe.py` takes no address argument; it reads the one configured address and does not follow a redirect to another host. |
| send-any-method-except-get | `scripts/probe.py` makes a single GET and has no code path for any other method. |
