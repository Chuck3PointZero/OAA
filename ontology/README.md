# @oaa/ontology

MCP server and compiler for the OAA formal ontology language. Reads `.rel` source files, validates them, and compiles them into `ONTOLOGY.md` — the generated vocabulary reference that OAA agent roles, skills, and tool nodes cite.

Part of the [Organizational Agent Architecture](../README.md) toolkit. Companion to [`@oaa/harness`](../harness/).

---

## What It Does

Business domain ontologies are typed, validated, and compiled — not hand-written markdown. You author `.rel` files describing your business concepts; this package checks them for correctness and produces `ONTOLOGY.md` as a generated artifact, the same way `@oaa/harness` produces `AGENTS.md`.

```
company/ontology/my-domain.rel    ← you author this
        ↓  compile_ontology
company/ONTOLOGY.md               ← generated; agents read this; never hand-edited
```

---

## The `.rel` Language

`.rel` is a small declarative language for business domain modeling. It has four statement types:

**`type`** — scalar type aliases

```rel
type CampaignID : String
type Currency   : Currency
```

**`enum`** — enumerated value sets

```rel
enum CampaignStatus = Active | Paused | Completed | Archived
```

**`entity`** — typed business concepts with properties, relations, and integrity constraints

```rel
entity Campaign {
  identified-by: CampaignID
  property name           : String
  property status         : CampaignStatus
  property daily-budget   : Currency
  property rolling-3day-cpa : Currency

  relation assets : CreativeAsset [one-to-many]

  constraint daily-budget-cap : daily-budget <= 200
}
```

**`entity … extends`** — derived concepts defined by logical rule over a base entity

```rel
entity UnderachievingCampaign extends Campaign {
  where: rolling-3day-cpa > 35
}
```

**`map`** — tool vocabulary maps that translate business names to API field names

```rel
map meta-ads {
  Campaign              -> Campaign
  Campaign.daily-budget -> daily_budget
  Campaign.status       -> effective_status
  Campaign.rolling-3day-cpa -> implicit   // computed; no direct API field
}
```

Identifiers may be kebab-case (`daily-budget`, `one-to-many`). The full grammar is in [`SKILL.md`](../skills/oaa-ontology-design/SKILL.md).

---

## MCP Tools

The server exposes three tools, callable by any MCP-compatible agent:

| Tool | Description |
|------|-------------|
| `compile_ontology` | Parse, validate, and compile all `.rel` files in the workspace. Writes `ONTOLOGY.md`. |
| `validate_ontology` | Parse and validate without writing any output. Returns findings as JSON. |
| `get_concepts` | Query the compiled symbol table — list all entities, enums, types, or look up a specific concept. |

---

## Installation

```bash
npm install @oaa/ontology
```

Register with Claude Code (add to your `claude_mcp_config.json` or run via `claude mcp add`):

```json
{
  "mcpServers": {
    "oaa-ontology": {
      "command": "npx",
      "args": ["-y", "@oaa/ontology", "--root", "/path/to/your/workspace"]
    }
  }
}
```

The `--root` argument (or `OAA_ROOT` environment variable) must point to the directory that contains your `ontology/` folder.

---

## Validation

The checker runs two phases on every compile and validate call:

**Phase 1 — collect declarations**: Builds a symbol table of all types, enums, and entities across all `.rel` files in the workspace.

**Phase 2 — validate references**: Checks that every type reference resolves, every relation target is declared, every `extends` points to a base entity (not another derived entity), every constraint expression references declared properties, and every map entry references a declared concept.

Findings are classified as `error` (blocks compilation), `warning` (compiles with note), or `gap` (informational — e.g. an entity not covered by a tool map).

The verdict is one of: `VALID`, `VALID-WITH-WARNINGS`, or `INVALID`.

---

## Workflow

1. Create `ontology/` alongside your OAA `agents/`, `roles/`, `skills/`, `tools/` directories.
2. Write `.rel` source files in `ontology/`. One file per logical domain area is the recommended split.
3. Call `validate_ontology` to check for errors before committing.
4. Call `compile_ontology` to produce `ONTOLOGY.md`. Commit both the source `.rel` files and the compiled `ONTOLOGY.md`.
5. In your OAA roles and skills, cite concept names from `ONTOLOGY.md` in `owns`, `decides`, `escalates`, and `never` fields.
6. In your tool nodes, set `concept-map: <map-name>` to declare which map block in the ontology describes this tool's translation layer.

---

## Directory Layout

```
your-workspace/
├── ONTOLOGY.md              ← compiled; do not hand-edit
├── ontology/
│   ├── core.rel             ← base concepts
│   └── acquisition.rel      ← domain-specific concepts
├── agents/
├── roles/
├── skills/
└── tools/
```

---

## Relationship to `@oaa/harness`

`@oaa/harness` compiles the agent graph (`AGENT.md` → `AGENTS.md`). `@oaa/ontology` compiles the vocabulary (`*.rel` → `ONTOLOGY.md`). They are independent packages with complementary jobs:

- The ontology defines **what concepts exist** and **what API names mean**.
- The harness resolves **who has authority over those concepts** and **what they can decide**.

Tool nodes bridge the two: a TOOL.md declares `concept-map: meta-ads`, which tells the harness to link the tool's capability declarations to the `map meta-ads { }` block in the ontology.

---

## License

MIT
