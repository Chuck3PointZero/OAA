# Slide 5 — The Authority Block

**Title:** Authority: The Unification That Matters

---

## The Four Fields

```yaml
authority:
  owns:      # domains this node is responsible for
  decides:   # actions taken autonomously, no escalation needed
  escalates: # actions requiring a human (or owning role) to decide
  never:     # actions forbidden regardless of who is asking
```

## The Composition Rules

| Field | How it composes down the chain | English |
|---|---|---|
| `never` | **Union** (deny wins everywhere) | If ANY layer forbids it, it's forbidden |
| `decides` | **Union** (grants accumulate) | ANY layer granting it makes it autonomous |
| `escalates` | **Union** | ANY layer can add an escalation trigger |
| unlisted | Defaults to **escalate** | Not forbidden, not permitted — asked about |

**Precedence:** `never` > `escalates` > `decides`

## Why This Matters

- **Conflict detection**: Two roles claiming `owns: [same-domain]` is a validation error, caught statically
- **Provable floor**: It is statically provable that no agent can be authorized to do what a `never` forbids
- **The third verdict**: `escalates` is the organizational primitive classical allow/deny systems lack — agents don't naturally escalate, the convention makes them

## Speaker Notes

- Place constraints at the ONE layer that owns them. Don't duplicate a tool's `never` in a skill "for safety" — it creates drift.
- An agent's `authority` block is typically empty or absent. The agent inherits everything from its roles.
- The `never` union means a tool can make a guarantee that no agent in the chain can override — this is the security primitive.
- "Unlisted defaults to escalate" is what prevents vacuum-filling while also preventing permission-waiting.
