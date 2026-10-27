# Slide 4 — The Reference Chain

**Title:** The Reference Chain

---

## The Chain

```
AGENT → ROLE(s) → SKILL(s) → TOOL(s) → implementation
```

Every layer is a **reference** to the next, not a container of it.

## How References Work

- The only edge type is `requires` (also spelled `fills` for agents, `allowed-tools` for skills)
- Edges flow **downward only**: tool → skill → role → agent is forbidden
- An agent filling multiple roles composes skills from ALL of them
- The same skill node can be required by multiple roles — the lockfile deduplicates it

## What Swappability Gives You

| Swap this... | ...and this changes |
|---|---|
| A role | The agent's skill set |
| A skill | The tool authorization |
| A tool implementation (MCP → REST API) | Nothing above it |

## Self-Similarity

Because all four kinds are the same primitive, a skill orchestrating sub-skills IS structurally identical to an agent orchestrating roles. One discovery mechanism, one manifest format, one authority algebra — at every level.

## Speaker Notes

- "Every layer is a reference, not a container" is the key architectural insight. An agent does not own its skills. A skill does not own its tools.
- The downward-only constraint prevents circular dependencies and makes the chain statically analyzable.
- Deduplication in the lockfile means the `performance-audit` skill required by three roles only runs once per compile pass.
- Remote agents are supported — a TOOL can point to a remote MCP server; an AGENT can be remote (OpenAI-compatible API).
