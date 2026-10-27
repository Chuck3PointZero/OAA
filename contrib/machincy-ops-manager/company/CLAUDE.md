# Machincy Operations Manager - OAA Territory

This directory is an Organizational Agent Architecture (OAA) company. Read
`INSTRUCTIONS.md` before creating or editing any node.

## Domain

Machincy website and API operations: signup health, inbound email backlog,
platform health (uptime / security / app errors / write integrity), and daily
ops digest. No newsletter dispatch, no subscriber mutations, no infrastructure
changes.

## Graph Summary

| Agent | Role | Schedule |
|---|---|---|
| orbit | operations-manager | `0 9 * * *` |

One tool: `machincy-grokbot` (`connector: api`, HTTPS, `X-API-Key`). Used by
the three monitor skills. The local MCP tool `machincy-api` is separate and is
not used by Orbit.

## How to Compile

To regenerate `agents/orbit/AGENTS.md`:

1. Invoke the `organizational-agents:org-agent-architecture` skill.
2. Follow the **Compile an Agent** workflow.
3. Walk the chain: `agents/orbit/AGENT.md` -> `roles/operations-manager/ROLE.md`
   -> five skills -> `tools/machincy-grokbot/TOOL.md`.
4. Run validation; fix any errors before writing output.
5. Write `agents/orbit/AGENTS.md` and update `agents.lock`.

To regenerate `COMPANY.md` (one level up, at the project root):

1. Invoke the `organizational-agents:org-agent-architecture` skill.
2. Follow the **Compile Company Map** workflow.
3. Run validation first - gap findings populate the `## Gaps` section.
4. Write `../COMPANY.md`.

## Known Gaps (as of 2026-09-27)

- `operations-manager` role duplicates 7 `never` rules already declared on
  `machincy-grokbot`. Remove the duplicates from `ROLE.md`; the tool layer is
  the authoritative source.
