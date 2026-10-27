# OAA v0.8.0 - Prompts, Not Programs

**Status:** In progress: Phases 0 to 5 built and uncommitted (markers below); Phase 6 not started; open items in section 10 - **Date:** 2026-10-25 - **Base:** `652cd03` (v0.7.0)

**Inline status markers (added 2026-10-25).** Each statement below carries a marker saying what it became: **[DONE]**, **[DONE, DEVIATION]**, **[DONE, UNTESTED]**, **[DONE, WITH EXCEPTIONS]**, **[PARTLY]**, **[NOT DONE]** or **[OUT OF SCOPE]**. "Untested" means checked mechanically, with no model run. Open items are numbered in section 10. Everything is uncommitted.

## 1. Summary

OAA becomes what it actually is: **a convention, two skills, a prompt library,
templates, and one small command-line utility.** Nothing else.

Five changes carry the release:

1. **Replace the `oaa-harness` MCP server with a small command-line utility.** The two
   jobs that must be deterministic stay in code: resolving a chain and computing the
   lock, and checking structure. Every job that only returned text (the `get_*` tools,
   the six MCP prompts, the `oaa://` resources) becomes a prompt file. The MCP server is no
   longer wired into the plugin, and the utility needs no `npm install`. Nothing is
   deleted.
   > **[DONE, DEVIATION]** `assets/oaa.mjs` is built from `harness/src/cli.ts` (about 329 KB) and runs with no `npm install`. The plugin no longer starts the server. Nothing was deleted, so the harness source stays in `harness/`. The `get_*` tools, MCP prompts and resources are served by nothing. Open: section 10 items 4, 5, 12 to 15.
2. **Make the compiler a prompt.** `compile-agent.prompt.md` joins the existing
   company-map and compact prompts as the single definition of what `AGENTS.md`
   contains. CLAUDE.md stops being a compiler. Until now the company-level CLAUDE.md
   stood in for the compiler, and the copies in use have diverged, so writing the prompt
   means **reconciling all of them into one**, not picking one. The versions to reconcile:
   OAA's own ("Compile an Agent" in `skills/org-agent-architecture/SKILL.md`),
   `DoctorK/virtual-hedge-fund/company/CLAUDE.md` (it adds a predicate-agent compile
   step), line 28 of `cto-factory/sites/cyberplex/CLAUDE.md` (its predicate-agent
   note), and possibly `oaa-template/company/CLAUDE.md`. Anything one version does that
   the others lack is carried into the prompt, or dropped on purpose. The predicate step
   is required and is carried (item 5).
   > **[PARTLY]** `compile-agent.prompt.md` reconciles SKILL.md's "Compile an Agent", DoctorK's predicate step (now in the predicate prompt) and the Cyberplex note, in the D2 section order, with a fact-retention check. Not carried, and not dropped on purpose: oaa-template's startup credential check (section 10 item 29). No model has run it (section 10 item 1).
3. **Put the routing in a new README.md, and make CLAUDE.md point to it.** The
   company-level README.md says what the territory is, sends the reader to
   INSTRUCTIONS.md first, explains how to use each prompt, and maps each job to its
   prompt and template. That includes the jobs the harness used to do (compile,
   validate, status and run), so the README is where a reader finds out how to do them
   now. It holds no schema. CLAUDE.md shrinks to a single instruction: use README.md.
   > **[DONE, UNTESTED]** `assets/README.template.md` (jobs table, escalation sink, agents table) and `bootstrap.prompt.md`, which writes the one-line `CLAUDE.md`. A hand-simulated bootstrap validates. The repository README is rewritten too. Open: section 10 items 1 and 6.
4. **Clarify the official skill file, and keep each instruction in one place.**
   `skills/org-agent-architecture/SKILL.md` is the official skill. Its current text was
   built by applying two documents, OAA-REPAIRS and SKILL-UPGRADE-PLAN (commit
   `d2c78a4`, 2026-08-27). The repairs document is not in this repo (the only copy is
   `DoctorK/OAA-REPAIRS.md`), yet SKILL.md still cites it ("Addendum B1"). The installed
   plugin copies (`~/.claude/plugins/cache/oaa/organizational-agents/0.7.0/` and
   `marketplaces/oaa/`) are the same text as the repo's SKILL.md, apart from line
   endings. 0.8.0 states which file is official, removes every reference to a document
   that is not in the repo, and makes SKILL.md point to each prompt instead of repeating
   its steps. In particular, SKILL.md's "Bootstrap a Repository" workflow and the new
   `bootstrap.prompt.md` would say the same thing twice, and drift apart. The procedure
   lives in the prompt only, and SKILL.md links to it. The same rule applies to
   "Create a Node", "Validate" and "Compile an Agent": one definition each. SKILL.md
   also carries three copies of text whose canonical home is elsewhere, each a place
   where stale instructions can survive: its "Core Model" restates the rules in
   `assets/INSTRUCTIONS.md`; its "Validation Checklist" is a session-end summary of
   `references/validation.md`, which says it is the canonical checklist; and its
   "Quick Template (inline fallback)" copies `assets/templates/` (R4 finds it stale).
   Each becomes a pointer, or is kept only with a check that it matches its source.
   > **[DONE, WITH EXCEPTIONS]** `SKILL.md` is the official file at 8,115 bytes (was 33,377). Its Bootstrap, Create a Node, Compile an Agent, Compile Company Map and Validate workflows, Core Model, Validation Checklist, Quick Template and Tool Types are removed or are pointers, and references to documents not in the repo are gone. Exceptions: the README keeps a 26-line copy of the model (section 10 item 16), `INSTRUCTIONS.md` overstates who cites its field table (item 28), and the "kept only with a check" option is unbuilt.
5. **Add two executor values, `predicate` and `human`.** `references/executor.md` knows
   only `llm` and `remote` today. Both new values are required parts of the model, not
   extras. `executor: predicate` is an agent whose skill is compiled into a deterministic
   script, `predicate-<name>.py`, that runs with no model at runtime and reaches only the
   tools its chain grants. It already exists in DoctorK's virtual-hedge-fund (four agents)
   and in the cto-factory Cyberplex site (two agents), each with its own copy of
   `predicate-codegen.prompt.md`. `executor: human` is a person filling roles: it is never
   run or scheduled, and its compiled AGENTS.md is that person's handbook. Both are added
   to `references/executor.md`, the INSTRUCTIONS field table, the AGENT template, the
   validation rules and the prompt library (a new `predicate-codegen.prompt.md`).
   > **[DONE, WITH EXCEPTIONS]** Added to `INSTRUCTIONS.md`'s field table, `executor.md`, the agent template (with golden predicate and human agents), `validation.md`, the utility's `validate` (valid value; no schedule on a human agent) and the new `predicate-codegen.prompt.md`. Exceptions: "a predicate skill's steps are deterministic" is a judgement check only (section 10 item 7), and the predicate prompt has never produced a script (item 2).

INSTRUCTIONS.md and the templates are rebuilt so that a **cold session can create a
correct node from scratch.** Today it can't.
> **[DONE, UNTESTED]** `INSTRUCTIONS.md` (110 lines) and the templates are rebuilt. Whether a cold session now creates a correct node has not been tested (section 10 item 1).

---

## 2. Why Nodes Are Being Created Wrong (Root Causes)

| # | Cause | Evidence |
|---|---|---|
| R1 | The binding rules omit `type:`. INSTRUCTIONS.md lists the schema as `kind, name, description, requires, authority`, and SKILL.md's Core Model repeats it, so a model that follows the rules faithfully writes pre-v0.7.0 nodes. | `skills/org-agent-architecture/assets/INSTRUCTIONS.md:8-9`, `SKILL.md:64` **[DONE]** `INSTRUCTIONS.md` names `type` in the core schema and the field table; `SKILL.md`'s copy of the schema is gone. |
| R2 | INSTRUCTIONS.md points at files that don't exist in a company. A copy in `company/` sends readers to `assets/templates/`, `references/authority-model.md`, and `references/validation.md`, which exist only inside the skill bundle. The model falls back to memory or to stale local copies. | `INSTRUCTIONS.md:19,23,33,47-49` **[DONE]** All 13 paths `INSTRUCTIONS.md` names exist inside `.oaa/`; `references/` is copied into `.oaa/` (section 4.2 amended). |
| R3 | There's a stale template fork downstream. `oaa-template/templates/TOOL.template.md` still has `type: mcp`, plus `authority.manages` and `auth`, neither of which is in the schema (`concept-map` is: the ontology skill sets it on tools). EasyOtto was seeded from it. | `oaa-template/templates/*`, `EasyOtto/company/tools/easyotto-api/TOOL.md:5` **[OUT OF SCOPE]** The downstream fork was not touched; OAA's own templates were audited. |
| R4 | The inline fallback is stale. SKILL.md's "Quick Template" has no `type:`, and its "Tool Types" section still says "the `type:` field identifies the kind". | `SKILL.md:442-465` **[DONE]** The Quick Template and Tool Types sections are replaced by a pointer. |
| R5 | Generators write the wrong shape. The MCP `oaa_bootstrap` and `oaa_create_node` prompts emit nodes with no `type:`, with `never: []` (forbidden by SKILL.md), with authority blocks on agents (forbidden), and with `requires: roles/primary` (not relative). | `harness/src/prompts.ts:149-202` **[DONE, OAA SIDE]** `bootstrap` and `create-node` prompts replace the MCP prompts; the old prompts remain in unserved harness source. |
| R6 | There are several competing compile instructions, and they disagree on sections and order: the TS `renderAgentsMd`, SKILL.md step 5, `DoctorK/virtual-hedge-fund/company/CLAUDE.md` (it adds a predicate-agent step the others lack), line 28 of `cto-factory/sites/cyberplex/CLAUDE.md`, and `oaa-template/company/CLAUDE.md` (EasyOtto has the same file). | `harness/src/compiler.ts:277`, `SKILL.md:207`, the CLAUDE.md files named **[PARTLY]** One prompt and one section order (D2). The DoctorK, Cyberplex and oaa-template copies remain downstream. |
| R7 | Docs reference tools that never existed: `get_instructions()`, `get_company_map_prompt()`, and an "Addendum B1 in OAA-REPAIRS.md" that isn't in this repo. | `SKILL.md:92,234` **[DONE, LIVE DOCS]** Gone from `SKILL.md`, the references, the prompts and the README. Remains in the archived deck, `harness/README.md`, the plan files and CHANGELOG history. |
| R8 | Contradictions about COMPANY.md. The skill treats it as a generated org chart. `oaa-template/company/CLAUDE.md` calls it "company identity and product description". | `oaa-template/company/CLAUDE.md:13` **[DONE, OAA SIDE]** `bootstrap`, the README and `INSTRUCTIONS.md` say `COMPANY.md` is generated; oaa-template's `CLAUDE.md` is downstream. |
| R9 | The README's framing is inverted. It says "`CLAUDE.md` - the OAA skill ... it is what generates everything else." | `README.md:234,245,255` **[DONE]** README "System Prompts & Generated Files" is rewritten. |

R1 and R2 alone explain the field report ("OKF is not there"). R3 to R6 explain why
fixing the skill didn't fix the companies.

---

## 3. Decisions (settled)

Settled 2026-10-24: the owner accepted the recommendation on every one. Each row records
the decision; the alternatives were dropped.

| # | Decision | Settled as |
|---|---|---|
| D1 | **Lockfile and hashing.** | Keep `agents.lock` with content hashes, computed by the utility and never by a model. **One format**, the one the harness already writes (`integrity: sha256-<base64>`, `file://./` keys, `kind`, `resolved`, `requires`). **One written hash rule:** the node's root file, then its `references/`, `scripts/`, `assets/` and `server/` files in sorted order, each by **relative** path and bytes, with line endings normalized to LF. `README.md` is **not hashed**: it is metadata, not part of the OAA company model, even though it is important. Every company's lock is regenerated once by `migrate`. **[DONE, WITH EXCEPTIONS]** Format, hash rule and utility-computed hash are built. Same lock from two folders and same hashes for CRLF and LF checkouts were tested. `README.md` is not hashed. `migrate` has the regeneration step. Untested: Linux, Node 18, and `migrate` on a real company (section 10 items 3 and 5). |
| D2 | **Canonical AGENTS.md shape.** | The SKILL.md step 5 shape: Identity -> Hard Limits -> Memory -> Run Order -> Escalation -> Env -> Does Not Own. It's the shape runners consume. The model writes it (`compile-agent.prompt.md`) from the utility's chain report. **[DONE]** `compile-agent.prompt.md` and the example's `AGENTS.md` use this order. |
| D3 | **Version and breaking change.** | `0.8.0`, with an explicit BREAKING note that the harness MCP server is no longer wired in. **[NOT DONE]** Phase 6. The prompts carry `oaa-version: 0.8.0` and `bootstrap` writes `.oaa/VERSION`; `plugin.json`, `marketplace.json` and `harness/package.json` still say 0.7.0. |

Not decisions: copying the prompts, templates and utility into a company is part of the
skill's bootstrap, so it needs no separate decision; and downstream companies are not part
of publishing v0.8.0.

---

## 4. Target Shape

### 4.1 Skill bundle

```
skills/org-agent-architecture/
|-- SKILL.md                      <- the official skill file; trimmed: model, workflows -> "run prompt X"; no copies (item 4)   [DONE: 8 KB official file]
|-- assets/
|   |-- INSTRUCTIONS.md           <- rewritten; self-contained; includes type:   [DONE: 110 lines]
|   |-- oaa.mjs                   <- NEW: the command-line utility (compile, validate); one file   [DONE]
|   |-- README.template.md        <- NEW: the router (README.md) a company gets   [DONE]
|   |-- prompts/
|   |   |-- README.md             <- index: prompt -> job -> inputs -> outputs   [DONE]
|   |   |-- bootstrap.prompt.md         NEW   [DONE, UNTESTED]
|   |   |-- create-node.prompt.md       NEW   [DONE, UNTESTED]
|   |   |-- compile-agent.prompt.md     NEW  (the compiler)   [DONE, UNTESTED]
|   |   |-- predicate-codegen.prompt.md NEW  (executor: predicate; reconciles two copies)   [DONE, UNTESTED: has never produced a script]
|   |   |-- compile-company-map.prompt.md   (renamed from company-map-system-prompt.md)   [DONE: renamed, workflow steps moved in]
|   |   |-- compact-agent.prompt.md         (renamed from compact-prompt-system-prompt.md)   [DONE: renamed, workflow steps moved in]
|   |   |-- validate.prompt.md          NEW  (wraps references/validation.md)   [DONE, UNTESTED]
|   |   `-- migrate.prompt.md           NEW  (pre-0.7 -> 0.8)   [DONE, UNTESTED]
|   `-- templates/                <- fixed; + one golden filled example per kind   [DONE: examples/ is a new small company that validates clean]
`-- references/                   <- authority-model, validation, executor, runner, example   [DONE: executor, runner, validation updated; ontology-memory added]
```

### 4.2 A company after bootstrap

```
company/
|-- CLAUDE.md          <- one line: "Read README.md."
|-- README.md          <- router (company-specific: domain, escalation sink, roster)
|-- .oaa/              <- verbatim from the skill, never edited, version-stamped
|   |-- VERSION
|   |-- INSTRUCTIONS.md
|   |-- oaa.mjs
|   |-- prompts/
|   |-- references/        <- authority-model, validation, executor, runner (INSTRUCTIONS.md points here)
|   `-- templates/
|-- COMPANY.md         <- generated by compile-company-map
|-- agents.lock        <- generated by compile-agent
`-- agents/ roles/ skills/ tools/
```
> **[DONE, SIMULATED]** `bootstrap.prompt.md` creates this layout, including `.oaa/references/`. A hand-built copy validates with only the "no agents" warning.

### 4.3 What README.md contains, and what it no longer contains

**Contains:** a one-paragraph domain statement; "read `.oaa/INSTRUCTIONS.md` before
touching any node"; a job -> prompt table (create a node, compile an agent, compile the
company map, validate, migrate, compact, and the jobs the harness used to do: compile,
validate, status and run); the escalation sink; and the agent roster. CLAUDE.md contains
only the instruction to read README.md.
> **[DONE]** `README.template.md` has all of these, including the check-current and run jobs.

**Never contains:** compile steps, AGENTS.md structure, frontmatter schema, or
authority rules. Each of those has exactly one home in `.oaa/`.
> **[DONE]** The template holds no schema, compile step or authority rule.

### 4.4 Prompt file contract

Every `*.prompt.md` has this frontmatter:

```yaml
---
name: compile-agent
oaa-version: 0.8.0
job: Compile one agent's chain into AGENTS.md and update agents.lock
inputs: [agent name, wrapper root]
reads: [AGENT.md, ROLE.md, SKILL.md, TOOL.md, agents.lock]
writes: [agents/<name>/AGENTS.md, agents/<name>/mcp-config.json, agents.lock]
never: [modify source nodes, call tools, run the workflow]
---
```
> **[DONE]** All eight prompts carry this frontmatter.

Every generated artifact is stamped with `<!-- compiled-with: compile-agent@0.8.0 -->`,
so a stale artifact can be detected.
> **[PARTLY]** `AGENTS.md` and the predicate script header carry the stamp. `COMPANY.md` has a "generated" line but no `compiled-with` stamp (section 10 item 30); JSON files cannot carry one.

---

## 5. Phases

### Phase 0: Replace the harness MCP server with a command-line utility

**Nothing is deleted.** The harness source stays where it is. The utility is added to it,
and the MCP server is switched off by changing two configuration entries.
> **[DONE]** Nothing was deleted.

| Task | Files |
|---|---|
| Copy `harness/CHANGELOG.md` to a root `CHANGELOG.md`. The harness copy stays; the root one is where release history lives from now on. | `CHANGELOG.md` **[DONE]** |
| Add a small `cli.ts` to `harness/src/` with two commands: `compile <agent>` prints the resolved chain and composed authority as JSON and updates `agents.lock` (it does not write AGENTS.md; `compile-agent.prompt.md` writes that from the JSON), and `validate` runs the structural checks, accepts the four `executor` values (`llm`, `remote`, `predicate`, `human`), and cites the rule for each finding. They call the existing chain-resolution, authority, hash and validation code in `compiler.ts`. Apply the D1 hash rule. | `harness/src/cli.ts` **[DONE]** `compile` prints chain, authority and `mcpConfig` and updates the lock without writing `AGENTS.md`. `validate` accepts the four executors. Also fixed: `doesNotOwn` was never filled in, and `validate` crashed on a lock in the wrong format. |
| Leave `renderAgentsMd`, `index.ts`, `tools.ts`, `prompts.ts` and `resources.ts` in place, unused by the utility. `renderAgentsMd` stays runnable as the comparison oracle for the compile prompt. | `harness/src/**` (unchanged) **[DONE]** Unchanged; `renderAgentsMd` served as the comparison oracle. |
| Bundle the utility to one file with its dependencies (`gray-matter`, `glob`) included, so a plugin cache needs no `npm install`. Ship it as `skills/org-agent-architecture/assets/oaa.mjs`. | `assets/oaa.mjs` **[DONE]** `assets/oaa.mjs`, about 329 KB, runs with no `node_modules`. |
| In `hooks/hooks.json`, stop the harness `npm install` hook from running. | `hooks/hooks.json` **[DONE]** Hook entry removed. |
| In `plugin.json`, stop starting the `oaa-harness` MCP server. Update the plugin `description` (it says the harness compiles and validates) and the `mcp` keyword to match. Mirror in `marketplace.json`. | `.claude-plugin/*` **[DONE]** Entry removed; descriptions updated; the `mcp` keyword stays because the ontology server remains; `marketplace.json` mirrored. |

**Do not change:** `connector: mcp` and "MCP server" wording that describes a
*company's own tools* (meta-ads, machincy-grokbot), and the `.gitignore` exception for
`harness/dist/` (the harness build stays in the repo). Companies can still wrap MCP
servers; only OAA's own harness server stops being started.
> **[DONE]** Left unchanged.

**Acceptance:**
- A fresh plugin session starts with no `oaa-harness` connection and no harness hook errors.
  > **[NOT DONE]** Not tested. The plugin cached on this machine still starts the server (section 10 item 4).
- `node assets/oaa.mjs validate` runs on `examples/performance-marketing` with no `npm install` first, and `compile` there prints the same chain the harness resolved before the change.
  > **[DONE]** Runs on the example with no `npm install`, and `compile` prints the same chain and authority as the old build. The example was INVALID then and is VALID now.
- The lock hashes are identical on Windows and on Linux, for a node with sub-folders and for files with CRLF line endings, and no machine path appears in the lock.
  > **[PARTLY]** Same lock from two different folders and same hashes for CRLF and LF checkouts, with no machine path. Linux was not tested (section 10 item 5).
- No document tells a reader to call a harness tool (`compile_agent`, `validate_graph`, `get_status`, `run_agent`, `get_compact_prompt_template`, `get_instructions`, `get_company_map_prompt`, `get_ontology`). Each is replaced by the utility command or a prompt file. The source files under `harness/` are exempt.
  > **[PARTLY]** True of the live docs. Not true of `harness/README.md`, the archived deck, the plan files and the CHANGELOG history (section 10 items 14 and 21).

### Phase 1: Prompt library

| Task | Notes |
|---|---|
| Write `compile-agent.prompt.md`. | Reconciles every version listed in section 1 item 2 (SKILL.md "Compile an Agent" steps 1-7, DoctorK's company CLAUDE.md including its predicate-agent compile step (for an `executor: predicate` agent the compile ends by running `predicate-codegen.prompt.md`), the cto-factory site's predicate note, and oaa-template's if it adds anything) into one. Absorbs the D2 section order, the memory-schema subsection (SKILL.md:300-313), mcp-config merge rules, its use of the utility for the chain and the lock (D1), and a **fact-retention check** before writing: every `never`, every env var, and every function name in the chain must appear verbatim. Same discipline as the compact prompt. **[DONE, PARTLY RECONCILED, UNTESTED]** See section 1 item 2. The section spec was checked on `ads-manager`: no fact lost against the old output. |
| Write `predicate-codegen.prompt.md`. | Reconciles DoctorK's `company/predicate-codegen.prompt.md` and the cto-factory copy. They differ in how a script raises an escalation, which is two different escalation sinks (DoctorK: `heartbeat.py --trigger`; cto-factory: the `wake-queue` tool). The contract is the same: the input is the agent's compiled AGENTS.md, the output is only `predicate-<name>.py`, deterministic, least privilege, a JSON report on stdout, and a refusal when a node needs judgement. The prompt keeps a `<hints>` block: hints for the model that writes the script, mapping phrases in the contract to code. It is part of the prompt, not company configuration. Raising an escalation follows OAA's existing escalation model (`runner.md`, "Escalation routing"): the skill and the contract's `escalates:` say what escalates, and a tool in the agent's chain is how it gets there, so the same skill works with a different sink. The prompt names no mechanism itself. DoctorK's copy shells out to `heartbeat.py --trigger`, which is not a granted tool; the reconciled prompt requires the escalation to go through a tool in the chain, as the cto-factory copy does with `wake-queue`. **[DONE, UNTESTED]** Escalation goes through a granted tool; the hints name no tool; DoctorK's shell-out is dropped. It has never produced a script (section 10 item 2). |
| Rename the two existing prompts to `*.prompt.md` and add the contract frontmatter. | Remove the "see Addendum B1" and `get_company_map_prompt()` references. **[DONE]** `compact-agent.prompt.md` and `compile-company-map.prompt.md`, with the contract and the workflow steps moved in from `SKILL.md`. |
| Write `bootstrap.prompt.md`. | Creates the 4.2 layout, copies `.oaa/` verbatim, writes README.md from `README.template.md`, and writes the one-line CLAUDE.md. Asks for domain and escalation sink. Writes **no** starter role with empty authority (R5). This is the only definition of bootstrap: SKILL.md's "Bootstrap a Repository" workflow is removed and points here (item 4). **[DONE, UNTESTED]** The only definition of bootstrap. |
| Write `create-node.prompt.md`. | Kind decision -> read the template from `.oaa/templates/` -> fill -> wire `requires` with relative paths -> self-check against the INSTRUCTIONS frontmatter table. Bottom-up order enforced. **[DONE, UNTESTED]** Includes the kind guide and the executor table. |
| Write `validate.prompt.md`. | Runs the utility's `validate` first, then the judgement checks in `references/validation.md` (stays canonical), with an output format and the "cite the rule or don't report it" gate. **[DONE, UNTESTED]** |
| Write `migrate.prompt.md`. | Pre-0.7 -> 0.8: `type: mcp\|api\|local` -> `connector:`; add `type: oaa/<Kind>`; flag non-schema fields (`manages`, `auth` outside api tools; `concept-map` is valid); replace compile instructions in CLAUDE.md with the one-line pointer to README.md, moving company-specific facts into README.md. Reports every change. Then runs the utility's `compile` for each agent to regenerate `agents.lock` in the D1 format. **[DONE, UNTESTED]** Backs up the lock, regenerates it, deletes nothing. Never run on a real older company (section 10 item 3). |
| Write `prompts/README.md`. | The job -> prompt table. README.template.md copies it. **[DONE]** |

### Phase 2: INSTRUCTIONS.md rewrite

- Add `type:` to the schema line. Add a **per-kind required/optional field table**
  (the single source; templates and validation cite it).
  > **[DONE, WITH EXCEPTION]** The "Fields by kind" table covers every key in the 25 templates and examples. It says templates, validation and the prompts cite it, but only `create-node` does (section 10 item 28).
- Add `executor` to the field table with its four values, `llm`, `remote`, `predicate` and `human`, and what each means for compile and run: a `human` agent is never run, and a `predicate` agent has a generated script beside its AGENTS.md.
  > **[DONE]**
- Make every path relative to `.oaa/` and existing inside a company (fixes R2).
  > **[DONE]** All 13 paths resolve inside `.oaa/`.
- Add "Creating a node from scratch," a five-step procedure that ends in a self-check
  ("before saving, confirm: `type` matches `kind`; no empty fields; no authority on
  agents; `requires` paths resolve").
  > **[DONE]**
- Add a "Generated files - never hand-edit" list: AGENTS.md, COMPANY.md, agents.lock,
  mcp-config.json, ONTOLOGY.md.
  > **[DONE]** Also lists `AGENTS.orig.md` and `predicate-<name>.py`.
- Stay under ~120 lines. It's read by weaker models first.
  > **[DONE]** 110 lines.

### Phase 3: Templates

- Audit every template against the Phase 2 field table.
  > **[DONE]** The agent template gained `executor` and `models`; the tool template gained `auth`, `layer` and `concept-map`; the field table gained the tool fields `SKILL.md` carried.
- The AGENT template lists all four `executor` values, with a golden example of a `predicate` agent and of a `human` agent.
  > **[DONE]**
- Add a **golden filled example per kind** (`templates/examples/`), taken from `examples/performance-marketing`,
  because a filled example teaches shape better than `{{placeholders}}`.
  > **[DONE, DEVIATION]** A new small company in `templates/examples/` (validates clean; three agents compile), not taken from `performance-marketing`, which did not validate.
- Add `README.template.md`, and define the one-line CLAUDE.md that `bootstrap.prompt.md` writes.
  > **[DONE]** The one line is defined in `bootstrap.prompt.md`.
- Delete SKILL.md's Quick Template now that `.oaa/templates/` is always local, and fix
  its Tool Types section (R4).
  > **[DONE, DEVIATION]** Replaced by a short "Templates" pointer, not deleted outright.
- Make `templates/README.md` say where templates live in a company (`.oaa/templates/`).
  > **[DONE]**

### Phase 4: SKILL.md and references

- Replace each workflow body with "run `<prompt>`" plus the decision guidance that
  isn't procedure. Target <= 12 KB (currently 33 KB, and it loads every time).
  > **[DONE]** `SKILL.md` is 8,115 bytes.
- Remove the harness tool tables and `get_*` calls, and every reference to a document
  that is not in this repo ("Addendum B1", OAA-REPAIRS; R7).
  > **[DONE]**
- Item 4: state in SKILL.md that it is the official skill file. Replace its "Bootstrap a
  Repository" workflow, its "Core Model" copy of INSTRUCTIONS.md, and its "Validation
  Checklist" copy of `references/validation.md` with pointers to their one home.
  > **[DONE]** The ontology workflow moved to `references/ontology-memory.md`.
- Update `executor.md` and `runner.md`, which reference harness tools. `executor.md` also gains `predicate` and `human` (item 5): what each is; that the compiled AGENTS.md has the same shape for every executor, and a `predicate` agent also gets its generated script; and that the runner, not OAA, decides how to launch them. Add the validation rules: a `predicate` agent's skill has only deterministic steps, and a `human` agent has no schedule.
  > **[DONE]** `runner.md`, `executor.md` and `validation.md` are updated, including `predicate`, `human` and the executor rules.

### Phase 5: Repo content

- Run `migrate.prompt.md` and then `compile-agent.prompt.md` on
  `examples/performance-marketing`. Commit the regenerated AGENTS.md and COMPANY.md.
  > **[DONE, DEVIATIONS]** Lock regenerated; `AGENTS.md`, `mcp-config.json` and `COMPANY.md` written; validates with one acknowledged gap. The example's tool was edited to validate, `.oaa/` was not copied into it, nothing is committed, and the output came from a stand-in script, not a model run.
- README: rewrite "System Prompts & Generated Files" and delete the harness half of
  "MCP Packages". Delete "Team Distribution"
  (that section points at a nonexistent `.agents/marketplace.json`).
  > **[DONE]** The removed Team Distribution text is kept outside the repository; the MCP Packages change was made in Phase 0.
- `docs/introduction/` slides 07-13 and `PROPOSALv2.md` reference the harness. Update
  them, or mark the deck as v0.7 and archive it.
  > **[DONE, DEVIATION]** The deck is archived to `docs/archive/v0.7/`. `PROPOSALv2.md` was left alone: it does not reference the harness.

### Phase 6: Release

Bump `plugin.json` / `marketplace.json` to `0.8.0`, write the CHANGELOG with a BREAKING
section, tag `v0.8.0`, and move `stable`.
> **[NOT DONE]** Versions still read 0.7.0; no BREAKING entry; nothing tagged; `stable` not moved.

**Not part of v0.8.0:** downstream companies (oaa-template, EasyOtto, DoctorK, machincy,
MaxCorp, cto-factory) pick up the released skill separately. Publishing v0.8.0 does not
depend on them.
> **[OUT OF SCOPE]** Unchanged.

---

## 6. Testing Notes

The repo has **no test suite**: no test script in either package.json and no test
files. The product is prompts and documents, so testing is **evaluation by fixture and
fresh session**. Record each run's model, date, pass/fail, and the diff in
`docs/test-runs/v0.8.0.md`.

---

## 7. Optional Refactoring Ideas

None of these are required for 0.8.0. Each is independent. Pick any.

**Schema simplification**

1. **Drop `kind:` and derive it from `type: oaa/Role`.** One field instead of two that
   must agree. Breaking.
2. **One edge name.** Retire the `fills` and `allowed-tools` aliases, or make them the
   *only* spelling per kind. Three spellings for one edge is a frequent error source.
3. **Retire the flat-file form** (`<name>.role.md`). Two forms per kind double the
   surface that validation and prompts have to cover.
4. **Drop per-directory `manifest.json`.** It restates frontmatter and only exists to
   be checked for contradiction.
5. **Decide on the noun layer.** Finish it, or remove `NOUN.template.md` and the
   references to it.
6. **Formalize or remove `watches`.** It's in the role template but not in
   INSTRUCTIONS or validation.
7. **Resolve `models:` / `executor:` against "MUST NOT hardcode a model name in
   frontmatter."** They currently read as a contradiction.

**Single sources of truth**

8. **Publish JSON Schemas** (`schemas/oaa-agent.schema.json` and so on) for
   frontmatter, so any YAML linter or editor validates fields without code from us.
   This is also the natural OKF conformance artifact.
9. **One field table** in INSTRUCTIONS.md that templates, validation.md, and prompts
   cite instead of restating.
    > **[DONE, SIDE EFFECT]** `INSTRUCTIONS.md` "Fields by kind".
10. **Merge `references/example-meta-ads.md` with `examples/performance-marketing/`.**
    The same example is maintained twice.
11. *(Withdrawn.)*
12. **Consolidate `contrib/` and `examples/`.** The distinction isn't explained
    anywhere.

**Drift detection**

13. **Version stamp `.oaa/`** and have the validate prompt warn when a company's
    `.oaa/VERSION` is behind the installed skill.
    > **[PARTLY]** `bootstrap` writes `.oaa/VERSION`; `validate` does not warn when it is behind.
14. **Stamp generated files** with the prompt version (4.4) and warn on stale ones.
    > **[PARTLY]** `AGENTS.md` and the predicate script are stamped (section 10 item 30).
15. **Unknown-field lint.** Anything not in the per-kind table becomes a warning that
    names the field. This would have caught `manages`.

**Skill ergonomics**

16. **Split SKILL.md.** Keep the core model and the job -> prompt table in SKILL.md,
    and move scenarios and the common-mistakes list into references loaded on demand.
17. **An "explain" prompt** that turns a compiled chain into a plain-English authority
    answer ("what can the ads-manager do without asking?"). This is the authority-audit
    scenario, packaged.
18. **A "decompose" prompt.** The scenario exists in SKILL.md; promote it to the
    library for symmetry.

**Runtime boundary**

19. **State the boundary in the README:** OAA compiles; runners (oaa-template's
    heartbeat, gateway, and run.ts, or Grok Bot, or anything else) execute. OAA ships
    no runtime. This settles the "OAA is not a harness" point in the docs themselves.
20. **Make the escalation sink a declared field** (in CLAUDE.md or a small
    `company.yaml`) rather than prose. runner.md already says to document it in
    CLAUDE.md.
    > **[PARTLY]** `README.template.md` has an Escalation section; it is prose, not a declared field.
21. **Emit targets as prompts.** `emit-grokbot.prompt.md` (role -> Bot job description,
    `escalates` -> approval gates, tool allowlist -> connector grants) would test the
    "any runtime is just an emit target" claim from the newsletter.

**Repo hygiene**

22. Archive `docs/PROPOSALv2.md` and the v0.7 slide deck under `docs/archive/` once
    they're superseded.
    > **[PARTLY]** The deck is archived; `PROPOSALv2.md` is not.
23. Add a root `CONTRIBUTING.md` explaining that assets are copied verbatim into
    companies, so edits to `.oaa/` content must happen here, never downstream.

---


## 9. Red-team review (2026-10-24)

**Method.** The plan was re-read end to end after the edits to items 2 to 4, then its claims were checked against the repo and the downstream companies (DoctorK, EasyOtto, oaa-template, machincy, MaxCorp, cto-factory). Nothing was run: no prompt was executed, so every finding below is from reading files. Each finding says how serious it is: **Blocker** (the plan can't be executed as written), **Fix** (wrong or contradictory, easy to correct), or **Gap** (missing, needs a decision or a task).


### Blockers

1. **D1 misdescribes the lockfile hash, so T9 can't pass as written.** D1 says the hash scope is unchanged and offers `Get-FileHash` / `sha256sum`. The harness does something different: one running SHA-256 over the node's root file bytes, then, for each of `references/`, `scripts/`, `assets/` and `server/` (files sorted), the file's **path string and then its bytes**, written as `sha256-<base64>`. A per-file command cannot reproduce that, and T9's "independent `Get-FileHash`" only matches a node with no sub-folders. The path string comes from a glob over an absolute directory, so the pinned value probably contains the machine's path and would differ between machines (check this before relying on it). The harness also hashes raw bytes, so Windows and Unix line endings give different hashes, and the two SKILL.md copies above are a real example. D1 needs a new, written hash rule, with a line-ending rule, instead of "unchanged".
2. **Several lockfile shapes already exist, and the plan plans for none of the migration.** The harness writes `integrity: sha256-<base64>` under `file://./...` keys with `kind`, `resolved` and `requires` (cto-factory, 64 entries). DoctorK uses a hex `sha256` with file-path keys, and also pins `CLAUDE.md` and `COMPANY.md` themselves. EasyOtto has a few hex `hash` entries, and MaxCorp and oaa-template have empty locks. All say `lockfileVersion: 1`. The plan must pick one format, say what happens to the others, and give `migrate.prompt.md` a step that regenerates the lock. Without it, every migrated company reports drift. The harness's drift check on `agents.lock` goes with the harness, so `validate.prompt.md` has to take it over, and the plan doesn't say so.



### Gaps

8. **README.md is outside the lock's hash scope, and it is now the router.** SKILL.md (lines 80 and 197) and `validation.md` (line 137) exclude `README.md` from hashes because it was narrative. Item 3 makes it functional, so a stale router can't be detected by the lock, and section 7 items 13 and 14 only cover `.oaa/` and generated files. Decide: hash the router, or keep the instructions in `.oaa/` and leave README.md to company facts only. Also state whether `.oaa/` itself is hashed.
9. **Three hops for a weak model.** CLAUDE.md, then README.md, then INSTRUCTIONS.md, then a prompt. The plan's target reader is Haiku. T11 tests this, but the design could let the one-line CLAUDE.md name INSTRUCTIONS.md as well.
10. **The predicate-agent step has no home.** Item 2 says carry it into the prompt or drop it on purpose, but section 4.1 has no predicate prompt, `executor.md` is updated only for harness references, and INSTRUCTIONS.md has no `executor: predicate` field. Two diverged copies of `predicate-codegen.prompt.md` exist (DoctorK and cto-factory). This needs a decision in section 3 (a new D6) and, if kept, a prompt, a field-table entry and a test.
11. **Downstream consumers are under-listed.** D5 names oaa-template and EasyOtto. Also affected: DoctorK, machincy, MaxCorp, and cto-factory, whose compile and validate steps run on the harness's built code and the plugin's servers. Add an inventory (what each has: CLAUDE.md, INSTRUCTIONS.md, lock format, nodes) and a migration line for each.
12. **Setup guides outside the repo will be stale.** The `OAA-BOOTSTRAP.md` copies in EasyOtto and oaa-template tell a company to call `compile_agent()` and to hand-fill COMPANY.md. They were deliberately removed from this plan's scope, so after release they will instruct people to use tools that no longer exist. This is a recorded consequence, not a request to reinstate them: someone must own it.
13. **Item 4's "kept only with a check" has no check.** No test confirms that SKILL.md holds no copy of INSTRUCTIONS.md, `validation.md` or the templates.
14. **No test for item 2's reconciliation.** Nothing checks that `compile-agent` preserves what each source did.
15. **No deterministic validator remains.** Compile and validate become model output, and tests run on Sonnet and Haiku only. Say so as a risk, and decide whether other runners (such as a Grok-based bot) are in scope.

### Suggested changes, in order

1. Rewrite D1: one lock format, a written hash rule with a line-ending rule, and a lock-regeneration step in `migrate`. Fix T9 to match. (Blockers 1 and 2.)
2. Fix the phase order, T7's node count, and the stale CLAUDE.md wording in section 7. (Fixes 3 to 5.)
3. Decide the README hashing question. (Gap 8.)
4. Add decision D6 on predicate agents. (Gap 10.)
5. Add the downstream inventory to Phase 6, and the two missing files to Phase 5. (Fix 7, Gap 11, Gap 12.)
6. Add T12 (no duplicated text in SKILL.md) and T13 (compile one agent from each source company and confirm no fact is lost against its existing `AGENTS.md`). (Gaps 13 and 14.)

### Not checked

I did not read `INSTRUCTIONS.md`, `validation.md`, `executor.md` or `runner.md` in full, the README beyond the three quoted lines, or the contents of the downstream `CLAUDE.md` files beyond their predicate steps. I did not run any prompt or compare the five company-level `CLAUDE.md` files line by line.

**Update (2026-10-24, after the review).** Blockers 1 and 2 are addressed: D1 now fixes one lock format and one written hash rule, run by the utility, and Phase 0 and the `migrate` step follow from it. The testing table (T1 to T11) and the Risks section were removed from the plan before this update, so findings that cite T7, T9, T12, T13 or section 8 refer to text that is no longer there. Downstream companies (gaps 11 and 12) are out of scope for v0.8.0. Gap 8 (the README router and the hash scope) changes nothing: README.md is metadata, not part of the OAA company model, so it stays outside the hash scope, as today. Gap 10 (the predicate-agent step) is settled: the `predicate` and `human` executors are required (item 5), with a `predicate-codegen.prompt.md` in the library.

---

## 10. Dangling after Phases 0 to 5 (2026-10-25)

What Phases 0 to 5 left unfinished, untested or inconsistent. Each item was checked against the repository when this list was written. Nothing here has been fixed unless it says so. "Closes it" says what would finish the item.

### A. Never run by a model

1. **No prompt has been followed by a model.** `compile-agent`, `predicate-codegen`, `compact-agent`, `compile-company-map`, `bootstrap`, `create-node`, `validate` and `migrate` were written and checked mechanically (headers parse, paths exist, fact retention against a stand-in script). The compiled files in `examples/performance-marketing` came from the author following the prompts with a script. *Closes it:* a cold run by a different agent, with only the prompt and the repository, on Sonnet and on Haiku, then a diff against the stand-in output.
2. **`predicate-codegen` has never produced a script.** It was reconciled from two copies but not run on a real predicate agent. *Closes it:* compile one existing predicate agent (DoctorK's or the Cyberplex site's) and compare its reads, writes and escalations with the existing script.
3. **`migrate` has never run on an older company.** It was only exercised as a hand walk-through on the example. *Closes it:* run it on a copy of a pre-0.8 company and read the report.
4. **A fresh plugin session has not been started.** The config no longer starts `oaa-harness`, but the plugin cached on this machine (`0.7.0`) still does. *Closes it:* reinstall from the branch and check there is no harness connection and no hook error.
5. **The utility has not run on Linux or on Node 18.** It was built for Node 18 and tested on Node 22 on Windows. Different folders and CRLF against LF were tested; Linux was not. *Closes it:* run `compile` on one fixture on Linux, and on Node 18.
6. **The skills CLI install is untested.** It is unknown whether `npx skills add` copies `assets/oaa.mjs` and `references/` into the installed skill, and the path `.agents/skills/org-agent-architecture/assets/` named in `bootstrap` comes from the README's Copilot guide, not from a check.

### B. Defects and gaps in the utility

7. **`validate` does not check what `INSTRUCTIONS.md` says a finding is.** It does not check that `type` matches `kind`, that no `{{placeholder}}` remains, or that a field is in the field table. Those exist only as judgement checks in the prompts, so a graph can pass `validate` and still break the rules. *Closes it:* add the three checks (the plan's section 7 idea 15 covers unknown fields).
8. **The lock never forgets a node.** `compile` merges into the existing lock, so an entry for a deleted node stays forever.
9. **The lock is updated before `AGENTS.md` is written.** If a write fails afterwards, the next run can wrongly see the agent as current. The compile prompt works around it (step 9: delete the partial file). *Closes it:* a `--no-lock` flag, or a separate `lock` command.
10. **`compile` prints `mcpConfig` and `missingMcpConfigs`**, which the plan did not ask for. Harmless, but undecided.
11. **Not every writer protects the CRLF rule.** The hash normalizes line endings, but new files in the repository have mixed endings (the prompts and docs are CRLF, `harness/src/cli.ts` is LF). Git's `autocrlf` hides it from diffs.

### C. Left in the repository, out of step

12. **`harness/dist/` is the old build.** It still has the old hash rule, no `executor` check and the old crash on a bad lock. Anything that imports it (including a driver outside this repository) gets different hashes from `oaa.mjs`.
13. **`harness/package.json` is still `@oaa/harness` 0.7.0**, described as an "MCP harness", with a `bin` that starts the server. `npm audit` reports issues after the `esbuild` install, and `package-lock.json` changed by about 490 lines.
14. **`harness/README.md` still documents the harness tools** (nine mentions). The Phase 0 acceptance bullet exempts the source files but not this README.
15. **`oaa.mjs` is a checked-in build (329 KB)** with no check that it matches `harness/src/`. It has to be rebuilt by hand (`npm run bundle`) whenever the source changes, and a copy goes into every company's `.oaa/`.
16. **The README's "The Core Model" section is still a 26-line copy of the model**, which is the duplication item 4 removes elsewhere. `INSTRUCTIONS.md` now holds the model.
17. **`SKILL.md`'s `allowed-tools` lists no shell tool**, yet every prompt tells the model to run `node .oaa/oaa.mjs`. Whether that blocks the call depends on the host. A host with no Node, or no shell, cannot compile or validate at all.
18. **The example's `server/mcp.json` launch command** (`npx -y meta-ads-mcp`) is unverified; the tool's frontmatter marks the example as illustrative. The compiled files carry a placeholder timestamp (`2026-10-25T00:00:00Z`) from the stand-in script.
19. **The commit state is untidy.** The two prompt renames and the deck move are staged (`git mv`); everything else is unstaged or untracked, on `master`. Nothing is committed, and the plan files are untracked.

### D. The plan is out of step with what was built

20. **section 6 Testing Notes and section 8 Risks were removed**, so the plan no longer says how Phases 1 to 5 are tested. Findings in section 9 that cite T7, T9, T12, T13 or section 8 point at text that is gone.
21. **Statements in the plan that did not hold:** Phase 3 says the golden examples come from `examples/performance-marketing` (they are a new small company, because that example did not validate); Phase 5 says `PROPOSALv2.md` references the harness (it does not) and to commit the regenerated files (not done); Phase 0's last acceptance bullet ("no document tells a reader to call a harness tool") is true of the live docs but not of `harness/README.md`, the archived deck, the two plan files or the CHANGELOG history.
22. **section 9's review is a dated record**, not current: several of its findings (the lock format, the `concept-map` field, the README router) were addressed afterwards.

### E. For Phase 6 (release)

23. **Versions are unchanged:** `plugin.json`, `marketplace.json` and `harness/package.json` all say `0.7.0`. The root CHANGELOG needs its "Unreleased" section turned into a `0.8.0` entry with a BREAKING note (the harness server is no longer started; locks written before 0.8 pin a different hash input).
24. **Every existing `agents.lock` will show as changed once**, because the hash rule changed. `migrate` regenerates it; nothing else does.
25. **`stable` and the `v0.8.0` tag are not touched.** Tagging and moving `stable` publish to anyone installing from the repository.
26. **A copy in every company grows.** `bootstrap` copies `oaa.mjs` (329 KB), the prompts, the references and the templates with their examples into each company's `.oaa/`.

### F. Downstream, known and out of scope for 0.8.0

27. DoctorK, the Cyberplex site, machincy, MaxCorp, EasyOtto and `oaa-template` still hold their own `CLAUDE.md` compile steps, two diverged copies of the predicate prompt, old locks, and (EasyOtto, `oaa-template`) an `OAA-BOOTSTRAP.md` that tells a company to call `compile_agent()`. None of this blocks publishing 0.8.0.

### G. Found while writing the inline completion statuses

28. **`INSTRUCTIONS.md` overstates who cites its field table.** It says templates, validation and the prompts all cite it; only `create-node.prompt.md` does. `validation.md`, the templates README and `validate.prompt.md` do not. *Closes it:* add the citations, or correct the sentence.
29. **`compile-agent` does not carry oaa-template's "startup credential check"** in the environment section, and no decision was made to drop it.
30. **`compile-company-map` writes no `compiled-with` stamp**, which section 4.4 asks of every generated artifact; the example's `COMPANY.md` says "generated" only.
