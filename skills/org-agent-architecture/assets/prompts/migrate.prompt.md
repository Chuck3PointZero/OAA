---
name: migrate
oaa-version: 0.8.0
job: "Bring an OAA company from before 0.7 up to 0.8: node fields, the .oaa/ toolkit, the README router, and a regenerated agents.lock"
inputs: ["wrapper root"]
reads: ["every node", "CLAUDE.md", "README.md", "agents.lock", "the installed skill's assets/"]
writes: ["node frontmatter (type, connector)", ".oaa/", "README.md", "CLAUDE.md", "agents.lock", "agents.lock.pre-0.8"]
never: ["delete a file", "overwrite README.md text", "guess at a non-schema field", "rewrite a node's body", "report a change you did not make"]
---

# Migrate a Company to 0.8

Run this on a company built with an OAA before 0.8. Report every change you make, and every field
you find and leave for the user to decide.

## Before you start

If the folder is under git and has uncommitted changes, stop and say so: the user should commit first,
so the migration is one reviewable change. If it is not under git, say that the migration edits files
in place and ask the user to copy the folder first.

## Steps

1. **Node fields.** For every `AGENT.md`, `ROLE.md`, `SKILL.md`, `TOOL.md` and `NOUN.md` (and the
   flat `<name>.<kind>.md` forms):
   - add `type: oaa/<Kind>` (`oaa/Agent`, `oaa/Role`, `oaa/Skill`, `oaa/Tool`, `oaa/Noun`) matching
     `kind`, if it is missing;
   - in a tool, rename `type: mcp`, `type: api` or `type: local` to `connector:` with the same value.

   Change only these lines. Do not touch a node's body.

2. **Flag, do not fix, fields that are not in the schema.** List each of these with its file and
   value, and leave it for the user: `manages` anywhere, and `auth` on a tool whose `connector` is not
   `api`. `concept-map` on a tool is valid (the ontology skill sets it): leave it. Also list any `executor` value that is not `llm`, `remote`, `predicate`
   or `human`.

3. **The `.oaa/` toolkit.** Follow `bootstrap.prompt.md` step 3 to find the skill's `assets/` folder,
   then:
   - if `.oaa/` is missing, create it with `INSTRUCTIONS.md`, `oaa.mjs`, `prompts/`, `references/` and
     `templates/` copied byte for byte, and a `VERSION` file holding `0.8.0`;
   - if it exists, compare each file with the skill's copy. List every file that differs, then replace
     it: these files are never edited locally, so a difference is drift.
   - If an `INSTRUCTIONS.md` sits at the wrapper root (the pre-0.8 location), list it as obsolete. Do
     not delete it.

4. **README and CLAUDE.md.**
   - If `CLAUDE.md` holds compile steps, a schema or authority rules, move the company-specific facts
     in it (the domain, the escalation sink, the list of agents) into `README.md`, then replace the
     whole file with one line: `Read README.md.`
   - `README.md` keeps all its existing text. If it has no `## Jobs`, `## Escalation` and `## Agents`
     sections, add them after the existing text, from `README.template.md`, filled from the facts you
     moved. Never remove or reword what is already there.

5. **Regenerate `agents.lock`.** The lock format and the hash rule changed in 0.8, so every old entry
   is out of date.
   - Copy `agents.lock` to `agents.lock.pre-0.8`.
   - Replace `agents.lock` with `{"lockfileVersion": 1, "nodes": {}}`.
   - For each agent, run `node .oaa/oaa.mjs compile <agent>`.

6. **Old `AGENTS.md` files.** List every agent whose `AGENTS.md` has no `compiled-with` stamp: it
   was compiled before 0.8. Tell the user to run `compile-agent.prompt.md` for each. Note that the
   compile prompt treats an agent with a clean lock and an existing `AGENTS.md` as current, so the old
   file must be moved aside first for the rebuild to happen. Do not do that for the user.

7. **Validate.** Run `node .oaa/oaa.mjs validate`.

8. **Report**, grouped: changes made (file and what changed), fields flagged for the user, files
   listed as obsolete, agents that need recompiling, and the validate verdict.

## Never

- Delete anything, or overwrite a file these steps do not name. The files they name are node
  frontmatter lines, the `.oaa/` files, `CLAUDE.md` and `agents.lock` (copied to `agents.lock.pre-0.8`
  first). List what is obsolete instead of removing it.
- Guess what a non-schema field meant.
- Say a change was made when it was only listed.
