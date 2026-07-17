# OAA Introduction — Presentation Outline

**Title:** Organizational Agent Architecture (OAA)
**Subtitle:** Structure your agents like you structure your company
**Audience:** Developers and architects building multi-agent systems
**Format:** 13 slides, ~30–40 minutes with Q&A
**Version:** v0.4.0

---

## Narrative Arc

The presentation moves through three acts:

1. **Why** (slides 1–2) — Establish the problem space. What is OAA, and what gap does it fill that MCP and Agent Skills leave open?
2. **What** (slides 3–9) — Build up the model: the four kinds, the chain, authority, directory layout, ontology, system prompts, and compilation.
3. **How** (slides 10–13) — Make it concrete. A worked example with every pattern, the agent node, executor choices, and a three-step install.

---

## Slide-by-Slide Outline

### Slide 1 — What Is OAA?
**Key message:** OAA is a file-and-directory convention, not a protocol. It gives multi-agent systems the organizational layer they are missing — roles, ownership, and bounded authority that compose automatically down the chain.
**Notes file:** [slide-01-what-is-oaa.md](slide-01-what-is-oaa.md)

---

### Slide 2 — Structuring Your Business
**Key message:** Workers fill roles, roles require skills, skills use tools — your organization already works this way. OAA applies the same model to agents. Without it, agents vacuum-fill or permission-wait; OAA's third disposition (escalate) is what a new employee does on day one.
**Notes file:** [slide-02-structuring-your-business.md](slide-02-structuring-your-business.md)

---

### Slide 3 — Roles, Skills, and Tools (oh my)
**Key message:** Agent, role, skill, and tool share one frontmatter schema. Only the `kind:` field changes. Because the shape is the same, the parser, validator, and authority algebra are written once and apply everywhere.
**Notes file:** [slide-03-roles-skills-tools.md](slide-03-roles-skills-tools.md)

---

### Slide 4 — The Reference Chain
**Key message:** `AGENT → ROLE(s) → SKILL(s) → TOOL(s) → implementation`. Every layer is a reference to the next. `requires` is the only edge, and it always flows downward.
**Notes file:** [slide-04-the-reference-chain.md](slide-04-the-reference-chain.md)

---

### Slide 5 — The Authority Block
**Key message:** `owns`, `decides`, `escalates`, `never` — the same four fields at every layer, with fixed composition rules: `never` unions, `decides` intersects, `escalates` unions, unlisted defaults to escalate.
**Notes file:** [slide-05-authority-block.md](slide-05-authority-block.md)

---

### Slide 6 — Directory & Path Convention
**Key message:** Paths organize the hierarchy; the typed filename declares the kind. `requires` fields use relative paths — those paths matter. The compiler walks them; the lockfile pins them.
**Notes file:** [slide-06-directory-convention.md](slide-06-directory-convention.md)

---

### Slide 7 — The Ontology: Domain Vocabulary in `.rel`
**Key message:** `.rel` source files declare entities, properties, and derived concept rules. `compile_ontology` compiles them into `ONTOLOGY.md` and a SQLite entity store. Skills write runtime values; roles query derived concepts without re-calling external APIs.
**Notes file:** [slide-07-ontology.md](slide-07-ontology.md)

---

### Slide 8 — The System Prompts
**Key message:** You author node files. The skill and compilers generate all the prompts. `CLAUDE.md` IS the OAA skill — installed, not authored. Everything else is generated: `AGENTS.md` and `mcp-config.json` per compile, `ONTOLOGY.md` from `.rel` source, `COMPANY.md` from the node graph, and `AGENTS.orig.md` when `models: [tiny]` triggers a Pass 2 compact rewrite. Never hand-edit the generated files.
**Notes file:** [slide-08-system-prompts.md](slide-08-system-prompts.md)

---

### Slide 9 — Compilation: compile_agent, validate_graph, and agents.lock
**Key message:** `compile_agent` walks the full chain, composes authority, writes `AGENTS.md` + `mcp-config.json`, updates `agents.lock`. `validate_graph` audits the whole graph. `agents.lock` pins every resolved node by path and hash — `git log agents.lock` is the org chart history. `run_agent` executes the compiled result.
**Notes file:** [slide-09-compilation.md](slide-09-compilation.md)

---

### Slide 10 — Worked Example: Meta Ads Manager
**Key message:** One agent, three roles, four skills (one shared), one tool — every OAA pattern in a single graph. The authority verdict table shows what the composition rules produce in practice.
**Notes file:** [slide-10-worked-example.md](slide-10-worked-example.md)

---

### Slide 11 — The Agent Node: Agent-Only Concepts
**Key message:** `kind: agent` carries fields no other kind has: `executor`, `models`, `fills`, `metadata.schedule`, `metadata.remote`, and a `memory/` folder. Agents declare no authority block — that is the design. Decision rights belong to roles; hard limits belong to tools.
**Notes file:** [slide-11-the-agent-node.md](slide-11-the-agent-node.md)

---

### Slide 12 — Executors: llm and remote
**Key message:** `executor: llm` hands `AGENTS.md` to a local LLM. `executor: remote` POSTs it to an OpenAI-compatible endpoint. The compile output is identical. Two non-negotiables for remote: authority is only as strong as the tool gateway (the `never` list means nothing if the gateway doesn't enforce it), and the memory schema must be fully documented or the remote model invents field names.
**Notes file:** [slide-12-executors.md](slide-12-executors.md)

---

### Slide 13 — Install and Run
**Key message:** Three steps: install the skill, add the MCP servers, compile and run. `AGENTS.md` is the payload — hand it to any LLM via `--system-prompt-file`. `executor: remote` sends the same payload to an OpenAI-compatible endpoint instead.
**Notes file:** [slide-13-install-and-run.md](slide-13-install-and-run.md)

---

## What Was Left Out

| Topic | Where to find it |
|---|---|
| NOUN / entity layer (Addendum A of proposal) | `docs/PROPOSALv2.md` |
| Allow / Deny / Secret clearance model (Addendum B) | `docs/PROPOSALv2.md` |
| Connector/capability split for multi-function MCP tools | `skills/org-agent-architecture/SKILL.md` |
| v0.4.0 lockfile key format migration | `README.md` |
| Team distribution via `extraKnownMarketplaces` | `README.md` |
