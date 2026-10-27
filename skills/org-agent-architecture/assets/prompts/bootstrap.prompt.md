---
name: bootstrap
oaa-version: 0.8.0
job: "Set up an empty OAA company: the folder layout, the copied .oaa/ toolkit, the lock, the README router and the one-line CLAUDE.md"
inputs: ["target folder", "company name", "domain", "escalation sink", "wrapper folder name or none"]
reads: ["the installed skill's assets/ folder", "assets/README.template.md"]
writes: ["<wrapper>/agents/ roles/ skills/ tools/", "<wrapper>/agents.lock", "<wrapper>/.oaa/", "<wrapper>/README.md", "<wrapper>/CLAUDE.md"]
never: ["overwrite an existing file", "write a starter role", "agent or any node with empty authority", "edit anything under .oaa/ after copying it"]
---

# Bootstrap a Company

This is the **only** definition of how a company is set up. Create exactly the layout below and
nothing more.

## Steps

1. **Ask three things, and wait for the answers.**
   - *What is the company's domain?* One paragraph: what it does and who it serves.
   - *Where do escalations go?* The place `escalates:` writes land: a database table, a channel, an
     inbox, a file. Every agent's runtime needs this address. If there is none yet, write
     "none yet", and say so.
   - *Is there a wrapper folder?* Use `company/` when the repository also holds other code, so the
     agentic rules stay apart from it. Otherwise use the repository root.

2. **Stop if anything exists.** If the wrapper already contains `agents/`, `roles/`, `skills/`,
   `tools/`, `agents.lock`, `README.md`, `CLAUDE.md` or `.oaa/`, list what is there and stop. This
   prompt only sets up an empty company. To bring an older company up to date, use
   `migrate.prompt.md`.

3. **Find the skill's `assets/` folder.** It is `skills/org-agent-architecture/assets/` inside the
   installed plugin, or `.agents/skills/org-agent-architecture/assets/` where the skill was added with
   the skills CLI. It holds `INSTRUCTIONS.md`, `prompts/`, `references/`, `templates/`, `oaa.mjs` and
   `README.template.md`. If you cannot find it, stop and say so.

4. **Create the layout:**

   ```
   <wrapper>/
   |-- CLAUDE.md          one line: "Read README.md."
   |-- README.md          the router, from README.template.md
   |-- .oaa/              copied verbatim from the skill, never edited, version-stamped
   |   |-- VERSION
   |   |-- INSTRUCTIONS.md
   |   |-- oaa.mjs
   |   |-- prompts/
   |   |-- references/
   |   `-- templates/
   |-- agents.lock        {"lockfileVersion": 1, "nodes": {}}
   `-- agents/  roles/  skills/  tools/
   ```

   - Copy `INSTRUCTIONS.md`, `oaa.mjs`, `prompts/`, `references/` and `templates/` **byte for byte**. Do not
     reword, shorten or "tidy" them: they are the same files in every company, and a local edit
     is the drift this layout exists to prevent.
   - `.oaa/VERSION` holds the OAA version, `0.8.0` (this prompt's `oaa-version`).
   - Make each of `agents/`, `roles/`, `skills/` and `tools/` empty.

5. **Write `README.md`** from `README.template.md`. Fill `{{company-name}}`, `{{domain}}` and
   `{{escalation-sink}}` from the answers. Leave the agents table with no rows. Do not leave any
   other `{{placeholder}}` outside the agents table.

6. **Write `CLAUDE.md`** with exactly one line: `Read README.md.`

7. **Check.** Run `node .oaa/oaa.mjs validate` from the wrapper root. A company with no agents
   reports "No AGENT.md or *.agent.md files found" as a warning. Any other finding is a mistake in
   the layout: fix it.

8. **Tell the user what comes next:** create tools first, then skills, then roles, then agents,
   using `create-node.prompt.md`. Nothing exists yet, so there is no authority to declare.

## Never

- Overwrite or merge into an existing file.
- Create a starter agent, role, skill or tool. An empty authority block is a defect, not a
  placeholder.
- Put a compile step, a schema or an authority rule in `CLAUDE.md` or `README.md`. They live in
  `.oaa/`.
- Edit anything under `.oaa/` after copying it.
