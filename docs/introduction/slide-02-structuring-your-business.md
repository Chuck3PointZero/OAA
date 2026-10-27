# Slide 2 — Structuring Your Business

**Title:** Structuring Your Business
**Tagline:** Workers fill roles. Roles require skills. You already know this model.

---

## The Business Model You Already Use

Every organization already structures work this way:

- **Workers** are assigned to **Roles** — a role defines what someone is responsible for, what they own, and what decisions they can make autonomously
- **Roles** require **Skills** — a skill defines how something gets done, what tools are needed, and what the procedure is
- **Skills** use **Tools** — specific capabilities, APIs, or systems that do the actual work

A new employee doesn't get handed a blank list of everything they could possibly do. They get a role. The role tells them what they own, what they decide, and when to escalate.

---

## Your Agents Should Work the Same Way

| Business | OAA |
|---|---|
| Worker | Agent |
| Role | Role node (`ROLE.md`) |
| Skill | Skill node (`SKILL.md`) |
| Tool / System | Tool node (`TOOL.md`) |
| Job description | `authority` block |
| Org chart | `agents.lock` |

The hierarchy is the same. The composition rules are the same. OAA just writes it down in a way that the agent — and the compiler — can read.

---

## What's Missing Without This Structure

Without an explicit org structure, agents either:
- **Vacuum-fill** — act on anything they can reach because nothing says they shouldn't
- **Permission-wait** — refuse to act without approval that never arrives

OAA's default disposition is neither: **unlisted actions escalate**. Not forbidden, not permitted — asked about. Exactly what a new employee does on their first day.

---

## Speaker Notes

- The business analogy is the entry point for non-technical stakeholders. Most people in the room have hired someone — they already understand that a job description isn't just a list of tasks, it's a boundary.
- The escalation default is the key insight: classical allow/deny systems have two states. OAA has three — permitted, forbidden, and *escalate*. That third state is what makes the model work for real organizations.
- `agents.lock` as org chart: when someone asks "who is responsible for campaign budgets?", `git log agents.lock` answers it with a timestamp.
