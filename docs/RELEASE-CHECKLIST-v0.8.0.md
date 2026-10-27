# OAA v0.8.0 Release Checklist

Status: nothing below is checked. Phases 0 to 5 are built and uncommitted on `master`. Phase 6 (release) has not started.
Source of truth for scope: `docs/PLAN-v0.8.0.md` (item numbers like "plan 17" refer to its section 10).
Written 2026-10-25. Plain ASCII only.

How to use: tick a box only after you have checked the file or run the command yourself. "Reviewed" means someone read the diff, not that a tool passed.

Rules for this release:
- Steps marked **[GATE]** publish to anyone installing from the repository. Do not run them without the owner's explicit go-ahead.
- Nothing in this release depends on downstream companies (oaa-template, EasyOtto, DoctorK, machincy, MaxCorp, cto-factory).

---

## 0. Before anything else

- [ ] Create a release branch (for example `release/v0.8.0`) from `master`. Do not commit to `master` directly.
- [ ] Confirm the working copy is the one you intend to release: `git status` shows the 130 entries covered by sections 2 to 8 below and nothing else.
- [ ] Decide what to do about line endings (plan 11). Many files will show "LF will be replaced by CRLF" warnings. The hash rule normalizes them, so this does not break locks, but decide whether to add a `.gitattributes` or leave it.
- [ ] Decide whether the files touched only by the ASCII sweep belong in this release (`contrib/` in 7b, `ontology/` in 6, `harness/dist/` in 5). If not, revert them with `git checkout -- <path>` before committing.

---

## 1. Release steps (plan Phase 6)

- [ ] 1.1 Bump `version` to `0.8.0` in `.claude-plugin/plugin.json`.
- [ ] 1.2 Bump `version` to `0.8.0` in `.claude-plugin/marketplace.json` (the plugin entry; it currently says 0.7.0).
- [ ] 1.3 Bump `version` to `0.8.0` in `harness/package.json` (and `harness/package-lock.json` to match).
- [ ] 1.4 Decide the `ontology/package.json` version. It is a separate package; bump only if its contents changed in a way that matters to users.
- [ ] 1.5 Turn "Unreleased (0.8.0)" in `CHANGELOG.md` into a dated `0.8.0` entry.
- [ ] 1.6 Add a **BREAKING** section to that entry. It must say: the `oaa-harness` MCP server is no longer started; `compile_agent`, `validate_graph` and the other harness tools are replaced by `oaa.mjs` and the prompts; locks written before 0.8 pin a different hash input and will show as changed once; run the `migrate` prompt to regenerate them.
- [ ] 1.7 Commit everything on the release branch (see section 13 for the commit plan).
- [ ] 1.8 Open a pull request into `master`; read the whole diff once.
- [ ] 1.9 **[GATE]** Merge the pull request.
- [ ] 1.10 **[GATE]** Tag `v0.8.0` on the merge commit.
- [ ] 1.11 **[GATE]** Push the tag.
- [ ] 1.12 **[GATE]** Move the `stable` tag/branch to `v0.8.0`.
- [ ] 1.13 Create the GitHub release notes from the CHANGELOG entry.

---

## 2. Plugin wiring (files)

Goal: a fresh plugin install starts no harness server and shows no hook error.

- [ ] `.claude-plugin/plugin.json` - harness server removed from `mcpServers`, description updated. Version still 0.7.0 (item 1.1).
- [ ] `.claude-plugin/marketplace.json` - descriptions updated. Version still 0.7.0 (item 1.2).
- [ ] `hooks/hooks.json` - harness hook entries removed. Check the file is valid JSON and has no leftover reference to `harness/dist/index.js`.
- [ ] Verify (plan 4): reinstall the plugin from the branch in a fresh Claude session. Expected: only the ontology server connects; no `oaa-harness` connection error; no hook error.
- [ ] Verify (plan 6): install the skill with `npx skills add` and confirm `assets/oaa.mjs`, `assets/prompts/`, `assets/templates/` and `references/` are copied. Confirm the path named in `bootstrap.prompt.md` (`.agents/skills/org-agent-architecture/assets/`) is real.

---

## 3. The official skill (`skills/org-agent-architecture/`)

Goal: SKILL.md is the one official skill file; everything it points to exists.

- [ ] `skills/org-agent-architecture/SKILL.md` - rewritten as the official skill. Check every path it names exists.
- [ ] Decide (plan 17): `allowed-tools` lists no shell tool, but every prompt tells the model to run `node .oaa/oaa.mjs`. Add a shell tool or document the limitation.
- [ ] `skills/org-agent-architecture/assets/INSTRUCTIONS.md` - the model, the "Fields by kind" table, executors.
- [ ] Fix (plan 28): the sentence saying templates, validation and the prompts all cite the field table. Only `create-node.prompt.md` does. Add citations or correct the sentence.
- [ ] `skills/org-agent-architecture/assets/README.template.md` - the README router copied into each company (NEW).
- [ ] `skills/org-agent-architecture/assets/oaa.mjs` - bundled utility (NEW, about 329 KB). See section 4 for the rebuild check.

### 3a. Prompts (`skills/org-agent-architecture/assets/prompts/`)

None of these has been followed by a model yet (plan 1 to 3).

- [ ] `README.md` (NEW) - index of the prompts.
- [ ] `bootstrap.prompt.md` (NEW) - sets up a company; copies the toolkit into `.oaa/`.
- [ ] `create-node.prompt.md` (NEW) - cites the field table.
- [ ] `compile-agent.prompt.md` (NEW) - the compile steps (reconciled from the CLAUDE.md copies).
- [ ] `predicate-codegen.prompt.md` (NEW) - reconciled from two copies; never run (plan 2).
- [ ] `compact-agent.prompt.md` (RENAMED from `compact-prompt-system-prompt.md`).
- [ ] `compile-company-map.prompt.md` (RENAMED from `company-map-system-prompt.md`).
- [ ] Fix (plan 30): `compile-company-map` writes no `compiled-with` stamp.
- [ ] Decide (plan 29): `compile-agent` does not carry oaa-template's "startup credential check".
- [ ] `validate.prompt.md` (NEW).
- [ ] `migrate.prompt.md` (NEW) - never run on an older company (plan 3).
- [ ] Cold run (plan 1): a different agent follows `compile-agent` using only the prompt and the repo, on Sonnet and on Haiku. Diff against the stand-in output.
- [ ] Cold run (plan 2): `predicate-codegen` on one real predicate agent; compare reads, writes and escalations with the existing script.
- [ ] Cold run (plan 3): `migrate` on a copy of a pre-0.8 company; read the report.
- [ ] Record each run (model, date, pass/fail, diff) in `docs/test-runs/v0.8.0.md` (new file; the plan's section 6 asks for it).

### 3b. Templates (`skills/org-agent-architecture/assets/templates/`)

- [ ] `AGENT.template.md` (modified)
- [ ] `ROLE.template.md` (modified)
- [ ] `SKILL.template.md` (modified)
- [ ] `TOOL.template.md` (modified)
- [ ] `TOOL-connector.template.md` (modified)
- [ ] `README.md` (modified) - add the field table citation if you choose that fix for plan 28.

### 3c. Golden mini-company (`assets/templates/examples/`, all NEW)

Must validate clean with the bundled utility.

- [ ] `README.md`
- [ ] `agents/site-owner/AGENT.md`
- [ ] `agents/site-watcher/AGENT.md`
- [ ] `agents/status-reporter/AGENT.md`
- [ ] `nouns/site/NOUN.md`
- [ ] `roles/site-owner/ROLE.md`
- [ ] `roles/site-watcher/ROLE.md`
- [ ] `roles/status-reporter/ROLE.md`
- [ ] `skills/check-site/SKILL.md`
- [ ] `skills/decide-site-escalation/SKILL.md`
- [ ] `skills/write-status-note/SKILL.md`
- [ ] `tools/site-probe/TOOL.md`
- [ ] `tools/site-probe/scripts/probe.py`
- [ ] Run: `node skills/org-agent-architecture/assets/oaa.mjs validate --root skills/org-agent-architecture/assets/templates/examples` reports no errors, warnings or gaps.

### 3d. References (`skills/org-agent-architecture/references/`)

- [ ] `authority-model.md` (modified)
- [ ] `example-meta-ads.md` (modified)
- [ ] `executor.md` (modified) - `llm | remote | predicate | human`.
- [ ] `runner.md` (modified)
- [ ] `validation.md` (modified)
- [ ] `ontology-memory.md` (NEW)

### 3e. Second skill

- [ ] `skills/oaa-ontology-design/SKILL.md` (modified) - check it does not tell a reader to call a harness tool.

---

## 4. The utility source (`harness/src/`)

Goal: `oaa.mjs` is exactly what this source produces.

- [ ] `harness/src/cli.ts` (NEW) - the `compile` and `validate` commands.
- [ ] `harness/src/compiler.ts` (modified) - hash rule D1, `writeLock`, executor checks, `doesNotOwn`, lock-format guard.
- [ ] `harness/src/types.ts` (modified)
- [ ] `harness/src/index.ts` (modified) - the MCP server entry; no longer started.
- [ ] `harness/src/prompts.ts` (modified)
- [ ] `harness/src/resources.ts` (modified)
- [ ] `harness/src/tools.ts` (modified)
- [ ] Run: `cd harness && npx tsc --noEmit` passes.
- [ ] Run: `cd harness && npm run bundle`, then confirm `git diff` on `assets/oaa.mjs` is empty (plan 15). If not, the checked-in bundle is stale.
- [ ] Run on Node 18 and on Linux (plan 5): `node oaa.mjs compile <agent>` on one fixture; hashes must match the Windows run.
- [ ] Decide (plan 10): `compile` prints `mcpConfig` and `missingMcpConfigs`. Keep or drop.
- [ ] Decide (plans 7, 8, 9): known utility gaps (validate misses type/kind and placeholder checks; lock never forgets a deleted node; lock written before AGENTS.md). Fix now or list as known issues in the release notes.

---

## 5. The harness package (leftovers)

Goal: nothing in `harness/` still advertises an MCP harness.

- [ ] `harness/package.json` (modified) - plan 13: still `@oaa/harness`, described as an "MCP harness", with a `bin` that starts the server. Rename/describe it as the utility, or remove the `bin`. Bump to 0.8.0 (item 1.3).
- [ ] `harness/package-lock.json` (modified, about 490 lines) - review; run `npm audit` and note the result.
- [ ] `harness/README.md` (modified) - plan 14: still documents the harness tools (nine mentions). Rewrite for the utility.
- [ ] `harness/CHANGELOG.md` (modified) - add a 0.8.0 note that points to the root `CHANGELOG.md`.
- [ ] `harness/dist/compiler.d.ts` (modified)
- [ ] `harness/dist/compiler.js` (modified)
- [ ] `harness/dist/index.d.ts` (modified)
- [ ] `harness/dist/index.js` (modified)
- [ ] `harness/dist/prompts.js` (modified)
- [ ] `harness/dist/tools.js` (modified)
- [ ] Decide (plan 12): `harness/dist/` is the old build with the old hash rule. Either rebuild it from `src/` (`npm run build`) or delete it. Do not ship it as-is: anything importing it computes different hashes from `oaa.mjs`.

---

## 6. Ontology package

These files were touched only by the ASCII sweep (and `package.json`/docs edits). Nothing here is part of the 0.8 design.

- [ ] `ontology/package.json` (modified) - confirm the one-line change is intended.
- [ ] `ontology/README.md` (modified)
- [ ] `ontology/CHANGELOG.md` (modified)
- [ ] `ontology/src/ast.ts`, `checker.ts`, `compiler.ts`, `index.ts`, `lexer.ts`, `parser.ts`, `sql.ts`, `store.ts` (all modified) - confirm each diff is punctuation only.
- [ ] `ontology/dist/checker.js`, `compiler.js`, `index.d.ts`, `index.js`, `lexer.js`, `parser.js`, `sql.js`, `store.js` (all modified) - these were edited by the sweep, not rebuilt. Rebuild from `src/` and confirm the ontology server still starts.

---

## 7. Examples

### 7a. `examples/performance-marketing/`

Must validate VALID with one acknowledged gap.

- [ ] `README.md` (modified)
- [ ] `agents.lock` (modified) - regenerated with the new hash rule.
- [ ] `agents/ads-manager/AGENT.md` (modified)
- [ ] `agents/ads-manager/AGENTS.md` (NEW, generated)
- [ ] `agents/ads-manager/mcp-config.json` (NEW, generated)
- [ ] `COMPANY.md` (NEW, generated)
- [ ] `ontology/ONTOLOGY.md` (modified)
- [ ] `ontology/customer-acquisition.rel` (modified)
- [ ] `roles/account-sentinel/ROLE.md` (modified)
- [ ] `roles/budget-steward/ROLE.md` (modified)
- [ ] `roles/creative-manager/ROLE.md` (modified)
- [ ] `skills/account-monitoring/SKILL.md` (modified)
- [ ] `skills/budget-pacing/SKILL.md` (modified)
- [ ] `skills/launch-campaign/SKILL.md` (modified)
- [ ] `skills/performance-audit/SKILL.md` (modified)
- [ ] `tools/meta-ads/TOOL.md` (modified)
- [ ] `tools/meta-ads/server/mcp.json` (NEW) - plan 18: the `npx -y meta-ads-mcp` command is unverified; the tool marks the example as illustrative.
- [ ] Replace the placeholder timestamp `2026-10-25T00:00:00Z` in `AGENTS.md` (plan 18) with a real one, or note it.
- [ ] Run: `node skills/org-agent-architecture/assets/oaa.mjs validate --root examples/performance-marketing` reports VALID.

### 7b. `contrib/` (touched by the ASCII sweep only)

- [ ] `contrib/example-ontology/ONTOLOGY.md`
- [ ] `contrib/example-ontology/concept-map-meta.yaml`
- [ ] `contrib/example-ontology/customer-acquisition.onto.yaml`
- [ ] `contrib/example-ontology/customer-acquisition.rel`
- [ ] `contrib/machincy-ops-manager/company/CLAUDE.md`
- [ ] `contrib/machincy-ops-manager/company/COMPANY.md`
- [ ] `contrib/machincy-ops-manager/company/INSTRUCTIONS.md`
- [ ] `contrib/machincy-ops-manager/company/agents/orbit/AGENTS.md`
- [ ] `contrib/machincy-ops-manager/company/skills/compose-ops-digest/SKILL.md`
- [ ] `contrib/machincy-ops-manager/company/skills/evaluate-and-flag-issues/SKILL.md`
- [ ] `contrib/machincy-ops-manager/company/skills/monitor-inbound-email/SKILL.md`
- [ ] `contrib/machincy-ops-manager/company/skills/monitor-platform-health/SKILL.md`
- [ ] `contrib/machincy-ops-manager/company/skills/monitor-signups/SKILL.md`
- [ ] `contrib/machincy-ops-manager/company/tools/machincy-grokbot/TOOL.md`
- [ ] Decide: this contrib company carries an old-format lock/CLAUDE.md. Leave as-is (downstream, plan 27) and say so in the notes, or run `migrate` on it as the real `migrate` test (plan 3).

---

## 8. Root documents

- [ ] `README.md` (modified) - plan 16: "The Core Model" section is still a 26-line copy of the model; `INSTRUCTIONS.md` now holds it. Replace with a pointer or accept the duplication.
- [ ] `CHANGELOG.md` (NEW, root) - becomes the 0.8.0 entry (items 1.5 and 1.6).
- [ ] `docs/PROPOSALv2.md` (modified)
- [ ] `docs/PLAN-v0.8.0.md` (NEW) - set the status line to "released" at the end; fix plan 20 to 22 (removed sections, statements that did not hold, dated section 9) or leave and note them.
- [ ] `docs/PLAN-v0.9.0.md` (NEW) - confirm it belongs in this release or move it out of the commit.
- [ ] `docs/RELEASE-CHECKLIST-v0.8.0.md` (NEW, this file).
- [ ] `docs/test-runs/v0.8.0.md` (to create) - cold-run results (section 3a).

### 8a. Archived v0.7 deck (`docs/archive/v0.7/`)

Moved with `git mv`; they are history, not current docs.

- [ ] `README.md` (NEW) - says the deck is archived and out of date.
- [ ] `OAA-Introduction.pptx` (RENAMED from `docs/OAA-Introduction.pptx`)
- [ ] `introduction/outline.md` (RENAMED)
- [ ] `introduction/slide-01-what-is-oaa.md` (RENAMED)
- [ ] `introduction/slide-02-structuring-your-business.md` (RENAMED)
- [ ] `introduction/slide-03-roles-skills-tools.md` (RENAMED)
- [ ] `introduction/slide-04-the-reference-chain.md` (RENAMED)
- [ ] `introduction/slide-05-authority-block.md` (RENAMED)
- [ ] `introduction/slide-06-directory-convention.md` (RENAMED)
- [ ] `introduction/slide-07-ontology.md` (RENAMED)
- [ ] `introduction/slide-08-system-prompts.md` (RENAMED)
- [ ] `introduction/slide-09-compilation.md` (RENAMED)
- [ ] `introduction/slide-10-worked-example.md` (RENAMED)
- [ ] `introduction/slide-11-the-agent-node.md` (RENAMED)
- [ ] `introduction/slide-12-executors.md` (RENAMED)
- [ ] `introduction/slide-13-install-and-run.md` (RENAMED)

---

## 9. Mechanical checks to run last (after all edits)

- [ ] Every text file in the repository is plain ASCII (excluding `node_modules`, `.git`, the `.pptx`).
- [ ] `grep` for `compile_agent`, `validate_graph`, `oaa-harness` finds no instruction telling a reader to call a harness tool in the live docs (the archive, plan files and CHANGELOG history may mention them).
- [ ] `agents.lock` hashes are identical when the same company is compiled from two different folders and with CRLF vs LF.
- [ ] `node assets/oaa.mjs validate` is clean on the golden examples and VALID on `examples/performance-marketing`.
- [ ] Prompt headers parse as YAML (no unquoted `: ` in values, no `{{ }}` in flow lists).
- [ ] No secrets, tokens or `.env` content anywhere in the diff.

---

## 10. Release notes must say (known issues)

Copy into the GitHub release notes unless fixed first:

- [ ] Prompts were written and mechanically checked but cold-run status is: (fill in after section 3a).
- [ ] Every existing `agents.lock` shows as changed once; run `migrate` to regenerate it (plan 24).
- [ ] Each company's `.oaa/` grows by about 329 KB plus prompts, references and templates (plan 26).
- [ ] `validate` does not check type/kind match, leftover placeholders, or unknown fields (plan 7).
- [ ] The lock never forgets a deleted node (plan 8).
- [ ] Downstream companies keep their own old compile steps until they adopt 0.8 (plan 27).

---

## 11. After the release

- [ ] Reinstall the released plugin on a clean machine/session and confirm section 2 again against `stable`.
- [ ] Mark `docs/PLAN-v0.8.0.md` complete and open the v0.9.0 work.
- [ ] Downstream pickup (separate work, not part of this release): oaa-template, EasyOtto, DoctorK, machincy, MaxCorp, cto-factory.

---

## 12. File count cross-check

`git status` at the time of writing: 130 entries (modified, renamed and new files, all named in sections 2 to 8). If `git status` shows a path that is not named in this document, add it here before committing.

## 13. Suggested commits (keeps the history readable)

1. Archive the v0.7 deck (renames only).
2. Utility: `harness/src/*`, `assets/oaa.mjs`, `harness/package*.json`, `harness/dist/*` decision.
3. Skill: `SKILL.md`, `INSTRUCTIONS.md`, prompts, templates (with golden examples), references.
4. Plugin wiring: `.claude-plugin/*`, `hooks/hooks.json`.
5. Examples and contrib (regenerated lock, AGENTS.md, COMPANY.md).
6. Docs: README, PROPOSALv2, plans, this checklist.
7. ASCII-only sweep of files outside 0.8 scope (`ontology/`, `contrib/`), if kept.
8. Release: version bumps and the CHANGELOG entry.
