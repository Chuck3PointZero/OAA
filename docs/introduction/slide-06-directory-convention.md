# Slide 6 — Directory & Path Convention

**Title:** Directory & Path Convention
**Tagline:** Paths organize the hierarchy. Filenames declare the kind.

---

## Key Message

The `agents/`, `roles/`, `skills/`, `tools/` directory structure is the OAA convention for organizing the node hierarchy. The typed filename (`ROLE.md`, `SKILL.md`, etc.) declares what a node is. The `requires` fields inside each node use **relative paths** to link to the next layer — and those paths matter. They are what the compiler walks and what the lockfile pins.

---

## The Repository Layout

```
company/
├── CLAUDE.md                      ← OAA entry point (authored, hand-written once)
├── agents.lock                    ← integrity pins (compiler output)
├── agents/
│   └── ads-manager/
│       └── AGENT.md
├── roles/
│   └── budget-steward/
│       └── ROLE.md
├── skills/
│   └── meta-ads/
│       └── SKILL.md
└── tools/
    └── meta-ads-api/
        ├── TOOL.md
        └── server/                ← MCP code, mcp.json, vendored packages
            ├── mcp.json
            └── index.js
```

## Every Node Uses the Same Shape

```
[node-name]/
├── [KIND].md          ← typed root file; the node's identity and frontmatter
├── references/        ← supporting content, loaded on demand
└── [kind-specific]/   ← decisions/ for roles
                          memory/ for agents (runtime state, ontology.db)
                          server/ for tools (MCP code, mcp.json)
```

## Two File Forms

| Form | When to use |
|---|---|
| **Directory node** (default) | Node needs sub-folders (tool server, decisions/, etc.) |
| **Flat file** `name.role.md` | Simple, self-contained, no sub-folders needed |

## How Paths Work in `requires`

```yaml
# agents/ads-manager/AGENT.md
---
kind: agent
name: ads-manager
fills:
  - ../../roles/budget-steward    # relative path — must resolve
  - ../../roles/creative-manager
---
```

- `requires` (and its alias `fills`) use relative paths to link one node to the next
- The compiler resolves each path and walks the chain: AGENT → ROLE → SKILL → TOOL
- The resolved absolute path becomes the key in `agents.lock`
- Reorganizing a node's directory location means updating every `requires` that points to it

## Speaker Notes

- The common mistake: assuming you can move nodes around freely because the filename declares the kind. You cannot — every `requires` that points to the moved node must also be updated. The lockfile will catch stale paths immediately.
- The `server/` folder inside a tool node is the only place where non-OAA code lives: MCP server code, vendored packages, `mcp.json`. The chain's final hop (TOOL → implementation) lands there.
- `CLAUDE.md` at the company root is not a node — it is the OAA entry point for AI assistants working in this repository. It is the one file you write by hand that explains the whole convention.
- `README.md` files are narrative only — not hashed, not compiled. Agents may regenerate them without changing any node's identity or the lockfile.
- `agents.lock` keys look like `file://./agents/ads-manager/AGENT.md` — full resolved paths from the project root.
