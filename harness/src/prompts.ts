// OAA workflows exposed as MCP Prompts
// Each prompt corresponds to a workflow section in SKILL.md

export interface OaaPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}

export const promptDefinitions: OaaPrompt[] = [
  {
    name: "oaa_bootstrap",
    description:
      "Bootstrap a new OAA workspace. Creates the initial directory structure, a CLAUDE.md wrapper entry point, and a starter agent with one role.",
    arguments: [
      {
        name: "agentName",
        description: "Name for the first agent (lowercase-hyphenated).",
        required: true,
      },
      {
        name: "description",
        description: "One sentence describing what this agent does.",
        required: true,
      },
    ],
  },
  {
    name: "oaa_create_node",
    description:
      "Create a new OAA node (agent, role, skill, or tool) with correct frontmatter. Guides you through placement and wiring.",
    arguments: [
      {
        name: "kind",
        description: "Node kind: agent | role | skill | tool",
        required: true,
      },
      {
        name: "name",
        description: "Node name (lowercase-hyphenated).",
        required: true,
      },
      {
        name: "description",
        description: "One sentence describing the node.",
        required: true,
      },
    ],
  },
  {
    name: "oaa_author_authority",
    description:
      "Author the authority section for a role or tool. Guides you through decides/escalates/never placement following the composition algebra.",
    arguments: [
      {
        name: "nodeName",
        description: "Name of the role or tool.",
        required: true,
      },
      {
        name: "domain",
        description: "What domain or capability does this node own?",
        required: false,
      },
    ],
  },
  {
    name: "oaa_decompose",
    description:
      "Decompose an existing role or agent into smaller roles and shared skills. Use when a role is doing too much.",
    arguments: [
      {
        name: "nodeName",
        description: "Name of the agent or role to decompose.",
        required: true,
      },
    ],
  },
  {
    name: "oaa_compile",
    description:
      "Compile a named agent: walk AGENT.md → ROLE(s) → SKILL(s) → TOOL(s), compose authority algebra, write AGENTS.md, and update agents.lock.",
    arguments: [
      {
        name: "agentName",
        description: "Name of the agent to compile.",
        required: true,
      },
    ],
  },
  {
    name: "oaa_validate",
    description:
      "Validate the OAA graph for the current workspace. Check node identities, edge resolution, authority conflicts, lockfile integrity.",
    arguments: [],
  },
];

// ---------------------------------------------------------------------------
// Prompt content generators
// ---------------------------------------------------------------------------

export function getPromptContent(
  promptName: string,
  args: Record<string, string>
): { role: "user"; content: string } {
  switch (promptName) {
    case "oaa_bootstrap":
      return bootstrapPrompt(args);
    case "oaa_create_node":
      return createNodePrompt(args);
    case "oaa_author_authority":
      return authorAuthorityPrompt(args);
    case "oaa_decompose":
      return decomposePrompt(args);
    case "oaa_compile":
      return compilePrompt(args);
    case "oaa_validate":
      return validatePrompt();
    default:
      return { role: "user", content: `Unknown OAA prompt: ${promptName}` };
  }
}

function bootstrapPrompt(args: Record<string, string>): {
  role: "user";
  content: string;
} {
  const { agentName = "my-agent", description = "A new OAA agent." } = args;

  return {
    role: "user",
    content: `Bootstrap a new OAA workspace for an agent named "${agentName}".

Description: ${description}

Steps to follow:

1. Create CLAUDE.md at the workspace root with:
   - A brief intro saying OAA convention applies here
   - How to compile agents using compile_agent MCP tool or by following SKILL.md
   - Reference to agents.lock for integrity checking

2. Create the initial agent node at agents/${agentName}/AGENT.md:
\`\`\`yaml
---
kind: agent
name: ${agentName}
description: ${description}
requires:
  - roles/primary
---
\`\`\`

3. Create a starter role at roles/primary/ROLE.md:
\`\`\`yaml
---
kind: role
name: primary
description: Primary role for ${agentName}. Define what it owns and its decision rights.
requires: []
authority:
  owns: []
  decides: []
  escalates: []
  never: []
---
\`\`\`

4. Create agents.lock with empty nodes (will be populated by compile_agent).

5. Ask me what domains this agent should own, what it should decide autonomously, and what it should always escalate. Then fill in the authority section of roles/primary/ROLE.md.`,
  };
}

function createNodePrompt(args: Record<string, string>): {
  role: "user";
  content: string;
} {
  const { kind = "role", name = "new-node", description = "" } = args;

  const template = `---
kind: ${kind}
name: ${name}
description: ${description || "One sentence. What this is and when to use it."}
requires: []
${
  kind === "role" || kind === "agent"
    ? `authority:
  owns: []
  decides: []
  escalates: []
  never: []`
    : ""
}
---

<!-- Add ${kind} content here -->`;

  const placements: Record<string, string> = {
    agent: `agents/${name}/AGENT.md`,
    role: `roles/${name}/ROLE.md`,
    skill: `skills/${name}/SKILL.md`,
    tool: `tools/${name}/TOOL.md`,
  };

  const wiring: Record<string, string> = {
    agent: "Add `requires: [roles/<role-name>]` to point at the roles this agent fills.",
    role: "Add `requires: [skills/<skill-name>]` to point at the skills this role uses.",
    skill:
      "Add `requires: [tools/<tool-name>]` or `allowed-tools: [tool-name]` to point at the tools this skill needs.",
    tool:
      "No requires needed. The tool is the leaf node. Add `type: api|mcp|local`, `env: ENV_VAR_NAME` if applicable.",
  };

  return {
    role: "user",
    content: `Create a new OAA ${kind} node named "${name}".

Placement: ${placements[kind] || `${kind}s/${name}/${kind.toUpperCase()}.md`}

Template:
\`\`\`yaml
${template}
\`\`\`

Wiring: ${wiring[kind] || "Wire as appropriate for this kind."}

After creating the file:
- ${kind === "agent" ? "Run compile_agent to generate AGENTS.md." : `Reference this node from its parent in the chain using \`requires: [${placements[kind]}]\`.`}
- Run validate_graph to check for issues.`,
  };
}

function authorAuthorityPrompt(args: Record<string, string>): {
  role: "user";
  content: string;
} {
  const { nodeName = "my-role", domain = "" } = args;

  return {
    role: "user",
    content: `Author the authority section for "${nodeName}"${domain ? ` (domain: ${domain})` : ""}.

OAA authority composition algebra:
- **never** — hard prohibitions. Unions across all layers. Deny wins everywhere.
- **decides** — autonomous actions. Intersects across roles (autonomous only if ALL declaring roles permit it).
- **escalates** — actions requiring human approval. Unions across layers.
- **owns** — declares domain ownership for this role.
- Default for unlisted actions: **escalate**.

Placement discipline:
- Hard limits → **tool** \`never\` (e.g., \`delete-production-data\`, \`transfer-funds\`)
- Decision rights → **role** \`decides\`/\`escalates\`
- Failure handling → **skill** \`escalates\`
- Agents declare nothing (authority flows up from roles)

Questions to fill in the authority:
1. What domain does ${nodeName} own? (→ \`owns\`)
2. What can it decide without asking a human? (→ \`decides\`)
3. What must always get human approval? (→ \`escalates\`)
4. What is absolutely forbidden — no exceptions? (→ \`never\`)

Once you answer, I'll write the authority block and add it to ${nodeName}'s frontmatter.`,
  };
}

function decomposePrompt(args: Record<string, string>): {
  role: "user";
  content: string;
} {
  const { nodeName = "my-agent" } = args;

  return {
    role: "user",
    content: `Decompose "${nodeName}" into smaller, focused roles and shared skills.

Decomposition workflow:
1. Read the current ${nodeName} node and all its descendants.
2. Identify responsibilities — list everything the node currently does.
3. Cluster by domain — group related responsibilities (each cluster becomes a role candidate).
4. Extract shared capabilities — find behavior used by more than one role (each → a skill).
5. Identify tool needs — list external services, APIs, or local tools each skill touches (each → a tool).
6. Name the new nodes — lowercase-hyphenated, one sentence description each.
7. Wire the chain — roles reference skills via \`requires\`, skills reference tools via \`requires\`.
8. Author authority per role — place \`decides\`/\`escalates\`/\`never\` at the right layer.
9. Update the agent's \`requires\` list to reference the new roles.
10. Run compile_agent and validate_graph.

Connector/capability split for MCP tools:
- The MCP server connection details (URL, auth, env vars) → tool TOOL.md
- What to do with that connection (workflows, error handling) → skill SKILL.md
- A skill \`requires\` its tool; they stay independent layers.

Start by reading ${nodeName} and listing what it currently does.`,
  };
}

function compilePrompt(args: Record<string, string>): {
  role: "user";
  content: string;
} {
  const { agentName = "my-agent" } = args;

  return {
    role: "user",
    content: `Compile the OAA agent "${agentName}".

Use the compile_agent tool:
\`\`\`
compile_agent({ name: "${agentName}" })
\`\`\`

The compiler will:
1. Locate ${agentName}/AGENT.md (or ${agentName}.agent.md)
2. Follow \`requires\` edges to resolve ROLE(s) → SKILL(s) → TOOL(s)
3. Compose authority: never=union, decides=intersection, escalates=union, never>escalates>decides
4. Write AGENTS.md in the agent directory (runtime instruction file — never hand-edit)
5. Update agents.lock with SHA-256 hashes for integrity verification

If compile_agent is not available, follow these manual steps:
1. Read AGENT.md, then each required ROLE.md, then each required SKILL.md, then each required TOOL.md
2. Collect all \`never\` entries (union) — these are absolute prohibitions
3. Intersect all \`decides\` entries across roles — autonomous only if every role agrees
4. Union all \`escalates\` entries — anything in any layer's escalates requires human approval
5. Write AGENTS.md following the standard format (Identity → Roles → Skills → Tools → Authority → Required Environment)`,
  };
}

function validatePrompt(): { role: "user"; content: string } {
  return {
    role: "user",
    content: `Validate the OAA graph for this workspace.

Use the validate_graph tool:
\`\`\`
validate_graph({})
\`\`\`

The validator checks:

**Node Identity** — every node has kind, name, description in frontmatter; kind matches file type
**Edges** — all requires entries resolve to real nodes; no upward references (tool → skill → role → agent only)
**Authority** — no item appears in both decides and never; agents don't declare authority (belongs at role level)
**Tools and Implementations** — tool nodes have type declared; env vars are named
**Lockfile** — agents.lock exists and contains entries for all nodes in compiled chains

Reports:
- ERRORS — must fix before the graph is usable
- WARNINGS — should fix; won't block operation
- GAPS — judgment calls; the validator can't decide for you

Verdict: VALID | VALID-WITH-WARNINGS | INVALID`,
  };
}
