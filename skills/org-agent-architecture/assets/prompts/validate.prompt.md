---
name: validate
oaa-version: 0.8.0
job: "Validate an OAA graph: run the utility's structural checks, then the judgement checks in references/validation.md, and report only findings that cite a rule"
inputs: ["wrapper root", "optionally one node or one agent"]
reads: ["every node under the wrapper", ".oaa/references/validation.md", ".oaa/references/authority-model.md", "the utility's validate output"]
writes: []
never: ["report a finding that does not quote a rule", "invent a requirement and grade nodes against it", "fix a file the user did not ask you to fix", "claim a structural check proves correctness"]
---

# Validate

`references/validation.md` is the canonical checklist. This prompt says how to run it and how to
report. It does not restate the checklist.

## Steps

1. **Run the utility first.** Run `node .oaa/oaa.mjs validate --json` from the wrapper root. It
   answers the checks it implements, and each finding names its check: `Node Identity`, `Edges`,
   `Authority`, `Tool Wiring`, `Lockfile` and `Executor`. Take those findings as they are. Do not
   re-derive them, and do not drop one.

2. **Run the rest of the checklist yourself.** Read `references/validation.md` from the top, and
   `references/authority-model.md` for any authority question. For each line the utility did not
   answer, check the nodes against it. Most of what is left is judgement: overlapping `owns` between
   roles, a `never` restated in prose, a dead grant, an escalation with no target, a skill that
   contains organizational judgement.

3. **The gate: cite the rule or do not report it.** Every finding you add must name the specific
   line in `validation.md`, `authority-model.md` or `INSTRUCTIONS.md` that the node violates, and
   quote it. If you think something is wrong but cannot point to a line, it is not a finding. Either
   the checklist has a gap, in which case propose a new line item for the checklist separately and say
   it is a proposal, or the node is fine. A made-up rule is worse than a missed finding: the fix for
   it often breaks a real rule.

4. **Say what a check proves.** Most checks prove that a file exists, a path resolves or a string
   matches, not that the thing it describes is true. A vendored path that exists proves the path is
   real, not that the code enforces anything. Report those as structural, and say so.

5. **Do not fix anything** unless the user asked you to fix it. A validation run reports.

6. **Report** in the format of `validation.md` section 6, with the three classes kept apart:
   - **Errors (must fix):** the item, the file and a one-line fix.
   - **Warnings (should fix):** the item, the file and why it is fragile.
   - **Gaps (decide):** undeclared territory and the question the owner must answer.
   - **Verdict:** `VALID`, `VALID-WITH-WARNINGS` or `INVALID`.

   When everything passes, say so briefly and show each resolved chain as an indented tree, so the
   user sees what an agent inherits and not only a green light.

## Never

- Report a finding without its rule.
- Change a verdict the utility reached: you may add findings, and you may not remove one.
- Treat a lock finding as a content error. It means a node changed since the last compile, so run
  `compile-agent.prompt.md` for the agents that use it.
