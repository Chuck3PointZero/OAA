import { readFileSync, existsSync, writeFileSync, statSync } from "fs";
import { join, dirname, resolve, relative } from "path";
import { createHash } from "crypto";
import matter from "gray-matter";
import { glob } from "glob";
import type {
  NodeKind,
  NodeFrontmatter,
  ResolvedNode,
  ResolvedChain,
  ComposedAuthority,
  Lockfile,
  LockfileEntry,
  ValidationFinding,
  ValidationResult,
} from "./types.js";

// ---------------------------------------------------------------------------
// Node discovery
// ---------------------------------------------------------------------------

const TYPED_FILENAMES: Record<NodeKind, string> = {
  agent: "AGENT.md",
  role: "ROLE.md",
  skill: "SKILL.md",
  tool: "TOOL.md",
  noun: "NOUN.md",
};

const FLAT_EXTENSIONS: Record<NodeKind, string> = {
  agent: ".agent.md",
  role: ".role.md",
  skill: ".skill.md",
  tool: ".tool.md",
  noun: ".noun.md",
};

/**
 * Find the typed root file for a node at the given path.
 * Accepts either a directory (looks for AGENT.md etc.) or a flat file path.
 */
export function findNodeFile(
  nodePath: string,
  rootDir: string
): { filePath: string; kind: NodeKind } | null {
  const abs = resolve(rootDir, nodePath);

  // Try directory form first
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    for (const [kind, filename] of Object.entries(TYPED_FILENAMES)) {
      const candidate = join(abs, filename);
      if (existsSync(candidate)) {
        return { filePath: candidate, kind: kind as NodeKind };
      }
    }
  }

  // Try flat file form
  if (existsSync(abs) && existsSync(abs) && abs.endsWith(".md")) {
    for (const [kind, ext] of Object.entries(FLAT_EXTENSIONS)) {
      if (abs.endsWith(ext)) {
        return { filePath: abs, kind: kind as NodeKind };
      }
    }
  }

  // Try appending kind extensions to the path
  for (const [kind, ext] of Object.entries(FLAT_EXTENSIONS)) {
    const candidate = abs + ext;
    if (existsSync(candidate)) {
      return { filePath: candidate, kind: kind as NodeKind };
    }
  }

  // Try as a directory with the path as the name
  for (const [kind, filename] of Object.entries(TYPED_FILENAMES)) {
    const candidate = join(abs, filename);
    if (existsSync(candidate)) {
      return { filePath: candidate, kind: kind as NodeKind };
    }
  }

  return null;
}

/**
 * Parse a node file into a ResolvedNode.
 */
export function parseNode(filePath: string, kind: NodeKind): ResolvedNode {
  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const fm = data as NodeFrontmatter;

  // Infer name from directory or filename if not in frontmatter
  const name =
    fm.name ||
    (statSync(filePath).isFile()
      ? dirname(filePath).split("/").pop() ||
        filePath
          .split("/")
          .pop()!
          .replace(/\.(agent|role|skill|tool|noun)\.md$/, "")
          .toLowerCase()
      : "unknown");

  return {
    kind: fm.kind || kind,
    name,
    path: filePath,
    frontmatter: { ...fm, name },
    body: content.trim(),
  };
}

// ---------------------------------------------------------------------------
// Graph resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a node's requires chain recursively, up to the given depth limit.
 * Returns nodes in topological order (deepest dependency first).
 */
export function resolveRequires(
  node: ResolvedNode,
  rootDir: string,
  visited = new Set<string>(),
  depth = 0
): ResolvedNode[] {
  if (depth > 20) return []; // cycle guard

  const raw = node.frontmatter;
  const requires: string[] =
    raw.requires ||
    raw.fills ||
    raw["allowed-tools"] ||
    [];

  const resolved: ResolvedNode[] = [];

  for (const req of requires) {
    if (visited.has(req)) continue;
    visited.add(req);

    const found = findNodeFile(req, rootDir);
    if (!found) continue;

    const child = parseNode(found.filePath, found.kind);
    const descendants = resolveRequires(child, rootDir, visited, depth + 1);
    resolved.push(...descendants, child);
  }

  return resolved;
}

/**
 * Resolve the full chain for a named agent.
 * Searches the rootDir for an agent node matching the name.
 */
export function resolveChain(
  agentName: string,
  rootDir: string
): ResolvedChain | null {
  // Search for the agent node
  const candidates = glob.sync(
    `**/{AGENT.md,*.agent.md}`,
    { cwd: rootDir, absolute: true }
  );

  let agentFile: string | null = null;
  for (const c of candidates) {
    const raw = readFileSync(c, "utf-8");
    const { data } = matter(raw);
    const fm = data as NodeFrontmatter;
    const name = fm.name || dirname(c).split("/").pop() || "";
    if (name === agentName || name.toLowerCase() === agentName.toLowerCase()) {
      agentFile = c;
      break;
    }
  }

  if (!agentFile) return null;

  const agent = parseNode(agentFile, "agent");
  const allDeps = resolveRequires(agent, rootDir);

  const roles = allDeps.filter((n) => n.kind === "role");
  const skills = allDeps.filter((n) => n.kind === "skill");
  const tools = allDeps.filter((n) => n.kind === "tool");

  return { agent, roles, skills, tools };
}

// ---------------------------------------------------------------------------
// Authority composition
// ---------------------------------------------------------------------------

export function composeAuthority(chain: ResolvedChain): ComposedAuthority {
  const never = new Set<string>();
  const decideSets: string[][] = [];
  const escalates = new Set<string>();
  const owns = new Set<string>();
  const doesNotOwn = new Set<string>();
  const envVars = new Set<string>();

  // Tools contribute never constraints
  for (const tool of chain.tools) {
    const auth = tool.frontmatter.authority;
    if (auth?.never) auth.never.forEach((n) => never.add(n));
    if (tool.frontmatter.env) envVars.add(tool.frontmatter.env);
  }

  // Roles contribute decides (intersection), escalates (union), owns, never
  for (const role of chain.roles) {
    const auth = role.frontmatter.authority;
    if (!auth) continue;
    if (auth.never) auth.never.forEach((n) => never.add(n));
    if (auth.decides) decideSets.push(auth.decides);
    if (auth.escalates) auth.escalates.forEach((e) => escalates.add(e));
    if (auth.owns) auth.owns.forEach((o) => owns.add(o));
  }

  // Skills contribute escalates
  for (const skill of chain.skills) {
    const auth = skill.frontmatter.authority;
    if (auth?.escalates) auth.escalates.forEach((e) => escalates.add(e));
    if (auth?.never) auth.never.forEach((n) => never.add(n));
  }

  // Intersection of decides: only items present in ALL role decides lists
  let decidesResult: string[] = [];
  if (decideSets.length > 0) {
    decidesResult = decideSets[0].filter((item) =>
      decideSets.every((set) => set.includes(item))
    );
  }

  // never wins over decides
  const finalDecides = decidesResult.filter((d) => !never.has(d));
  const finalEscalates = [...escalates].filter((e) => !never.has(e));

  return {
    never: [...never],
    decides: finalDecides,
    escalates: finalEscalates,
    owns: [...owns],
    doesNotOwn: [...doesNotOwn],
    envVars: [...envVars],
  };
}

// ---------------------------------------------------------------------------
// AGENTS.md compilation
// ---------------------------------------------------------------------------

export function renderAgentsMd(
  chain: ResolvedChain,
  authority: ComposedAuthority,
  rootDir: string
): string {
  const { agent, roles, skills, tools } = chain;
  const now = new Date().toISOString();

  const lines: string[] = [];

  lines.push(`# ${agent.name}`);
  lines.push(`> ${agent.frontmatter.description}`);
  lines.push("");
  lines.push(
    `<!-- Generated by @oaa/harness on ${now}. Do not edit by hand. Source: ${relative(rootDir, agent.path)} -->`
  );
  lines.push("");

  // Identity
  lines.push("## Identity");
  lines.push("");
  lines.push(`**Agent:** ${agent.name}  `);
  lines.push(`**Description:** ${agent.frontmatter.description}  `);
  if (roles.length > 0) {
    lines.push(`**Fills:** ${roles.map((r) => r.name).join(", ")}  `);
  }
  lines.push("");

  // Roles
  if (roles.length > 0) {
    lines.push("## Roles");
    lines.push("");
    for (const role of roles) {
      lines.push(`### ${role.name}`);
      lines.push("");
      lines.push(role.frontmatter.description);
      lines.push("");
      if (role.body) {
        lines.push(role.body);
        lines.push("");
      }
    }
  }

  // Skills
  if (skills.length > 0) {
    lines.push("## Skills");
    lines.push("");
    for (const skill of skills) {
      lines.push(`### ${skill.name}`);
      lines.push("");
      lines.push(skill.frontmatter.description);
      lines.push("");
      if (skill.body) {
        lines.push(skill.body);
        lines.push("");
      }
    }
  }

  // Tools
  if (tools.length > 0) {
    lines.push("## Tools");
    lines.push("");
    for (const tool of tools) {
      lines.push(`### ${tool.name}`);
      lines.push("");
      lines.push(tool.frontmatter.description);
      if (tool.frontmatter.type) {
        lines.push(`**Type:** ${tool.frontmatter.type}  `);
      }
      if (tool.frontmatter.env) {
        lines.push(`**Env:** \`${tool.frontmatter.env}\`  `);
      }
      lines.push("");
    }
  }

  // Authority summary
  lines.push("## Authority");
  lines.push("");
  lines.push("The following boundaries apply to this agent:");
  lines.push("");

  if (authority.owns.length > 0) {
    lines.push(`**Owns:** ${authority.owns.join(", ")}  `);
  }
  if (authority.decides.length > 0) {
    lines.push(`**May decide autonomously:** ${authority.decides.join(", ")}  `);
  }
  if (authority.escalates.length > 0) {
    lines.push(`**Must escalate:** ${authority.escalates.join(", ")}  `);
  }
  if (authority.never.length > 0) {
    lines.push(`**Never:** ${authority.never.join(", ")}  `);
  }

  lines.push("");
  lines.push(
    "_Unlisted actions default to escalate. `never` overrides all other grants._"
  );
  lines.push("");

  // Required env vars
  if (authority.envVars.length > 0) {
    lines.push("## Required Environment");
    lines.push("");
    for (const ev of authority.envVars) {
      lines.push(`- \`${ev}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// agents.lock
// ---------------------------------------------------------------------------

function hashNode(filePath: string, dirPath: string): string {
  const hash = createHash("sha256");

  // Hash the typed root file
  if (existsSync(filePath)) {
    hash.update(readFileSync(filePath));
  }

  // Hash sub-folders: references/, scripts/, assets/, server/
  for (const sub of ["references", "scripts", "assets", "server"]) {
    const subDir = join(dirPath, sub);
    if (existsSync(subDir)) {
      const files = glob.sync(`${subDir}/**/*`, { nodir: true });
      for (const f of files.sort()) {
        hash.update(f);
        hash.update(readFileSync(f));
      }
    }
  }

  return `sha256-${hash.digest("base64")}`;
}

export function buildLockfile(chain: ResolvedChain, rootDir: string): Lockfile {
  const nodes: Record<string, LockfileEntry> = {};

  const all = [chain.agent, ...chain.roles, ...chain.skills, ...chain.tools];

  for (const node of all) {
    const dirPath = statSync(node.path).isFile() ? dirname(node.path) : node.path;
    const integrity = hashNode(node.path, dirPath);
    const rel = `file://./${relative(rootDir, dirPath).replace(/\\/g, "/")}`;

    const requires: string[] = (
      node.frontmatter.requires ||
      node.frontmatter.fills ||
      node.frontmatter["allowed-tools"] ||
      []
    );

    const entry: LockfileEntry = {
      kind: node.kind,
      resolved: rel,
      integrity,
      requires,
    };

    nodes[node.name] = entry;
  }

  return { lockfileVersion: 1, nodes };
}

// ---------------------------------------------------------------------------
// Public compile function
// ---------------------------------------------------------------------------

export interface CompileResult {
  agentsPath: string;
  lockPath: string;
  chain: ResolvedChain;
  authority: ComposedAuthority;
}

export function compileAgent(
  agentName: string,
  rootDir: string
): CompileResult {
  const chain = resolveChain(agentName, rootDir);
  if (!chain) {
    throw new Error(
      `Agent "${agentName}" not found. Searched for AGENT.md or *.agent.md under ${rootDir}`
    );
  }

  const authority = composeAuthority(chain);
  const content = renderAgentsMd(chain, authority, rootDir);

  // Write AGENTS.md next to the AGENT.md
  const agentDir = dirname(chain.agent.path);
  const agentsPath = join(agentDir, "AGENTS.md");
  writeFileSync(agentsPath, content, "utf-8");

  // Write agents.lock at rootDir
  const lockfile = buildLockfile(chain, rootDir);
  const lockPath = join(rootDir, "agents.lock");
  writeFileSync(lockPath, JSON.stringify(lockfile, null, 2), "utf-8");

  return { agentsPath, lockPath, chain, authority };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateGraph(rootDir: string): ValidationResult {
  const findings: ValidationFinding[] = [];

  // Discover all typed root files
  const agentFiles = glob.sync(`**/{AGENT.md,*.agent.md}`, {
    cwd: rootDir,
    absolute: true,
  });

  if (agentFiles.length === 0) {
    findings.push({
      severity: "warning",
      check: "Node Identity",
      file: rootDir,
      message: "No AGENT.md or *.agent.md files found.",
    });
  }

  const chains: ResolvedChain[] = [];

  for (const af of agentFiles) {
    const agent = parseNode(af, "agent");

    // Check required frontmatter
    for (const field of ["kind", "name", "description"] as const) {
      if (!agent.frontmatter[field]) {
        findings.push({
          severity: "error",
          check: "Node Identity",
          file: af,
          message: `Missing required frontmatter field: "${field}"`,
          fix: `Add "${field}:" to the YAML frontmatter in ${af}`,
        });
      }
    }

    if (agent.frontmatter.kind !== "agent") {
      findings.push({
        severity: "error",
        check: "Node Identity",
        file: af,
        message: `AGENT.md has kind: "${agent.frontmatter.kind}" — must be "agent"`,
        fix: `Set kind: agent in ${af}`,
      });
    }

    // Resolve chain
    let chain: ResolvedChain | null = null;
    try {
      chain = resolveChain(agent.name, rootDir);
    } catch (e) {
      findings.push({
        severity: "error",
        check: "Edges",
        file: af,
        message: `Failed to resolve chain for "${agent.name}": ${String(e)}`,
      });
    }

    if (!chain) continue;
    chains.push(chain);

    // Check that requires entries resolve
    const rawRequires =
      agent.frontmatter.requires ||
      agent.frontmatter.fills ||
      [];
    for (const req of rawRequires) {
      const found = findNodeFile(req, rootDir);
      if (!found) {
        findings.push({
          severity: "error",
          check: "Edges",
          file: af,
          message: `Unresolved requires: "${req}" — no node found at that path`,
          fix: `Create the node at ${req} or update the requires path`,
        });
      }
    }

    // Validate each role in chain
    for (const role of chain.roles) {
      if (role.frontmatter.kind !== "role") {
        findings.push({
          severity: "error",
          check: "Node Identity",
          file: role.path,
          message: `Expected kind: role but got "${role.frontmatter.kind}"`,
        });
      }

      // Check authority placement — agents should not declare decides/escalates
      if (agent.frontmatter.authority?.decides?.length) {
        findings.push({
          severity: "warning",
          check: "Authority",
          file: af,
          message:
            "Agent declares `decides` — authority should be declared at role level",
          fix: "Move `decides` into the role's authority section",
        });
      }
    }

    // Check authority composition for conflicts
    const authority = composeAuthority(chain);

    // Any item in both decides and never is an error
    for (const d of authority.decides) {
      if (authority.never.includes(d)) {
        findings.push({
          severity: "error",
          check: "Authority",
          file: chain.agent.path,
          message: `Authority conflict: "${d}" appears in both decides and never — never wins`,
        });
      }
    }

    // Warn about agents with no roles
    if (chain.roles.length === 0) {
      findings.push({
        severity: "gap",
        check: "Edges",
        file: af,
        message: `Agent "${agent.name}" has no roles — consider adding at least one ROLE.md`,
      });
    }

    // Check lockfile exists
    const lockPath = join(rootDir, "agents.lock");
    if (!existsSync(lockPath)) {
      findings.push({
        severity: "warning",
        check: "Lockfile",
        file: rootDir,
        message: "agents.lock not found — run compile_agent to generate it",
      });
    } else {
      // Check for stale entries
      const lock: Lockfile = JSON.parse(readFileSync(lockPath, "utf-8"));
      for (const node of [chain.agent, ...chain.roles, ...chain.skills, ...chain.tools]) {
        const entry = lock.nodes[node.name];
        if (!entry) {
          findings.push({
            severity: "warning",
            check: "Lockfile",
            file: lockPath,
            message: `Node "${node.name}" is not in agents.lock — run compile_agent to refresh`,
          });
        }
      }
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");

  const verdict =
    errors.length > 0
      ? "INVALID"
      : warnings.length > 0
      ? "VALID-WITH-WARNINGS"
      : "VALID";

  return { verdict, findings, resolvedChains: chains };
}

// ---------------------------------------------------------------------------
// Status reader
// ---------------------------------------------------------------------------

export function getAgentStatus(
  agentName: string,
  rootDir: string
): Record<string, unknown> {
  const chain = resolveChain(agentName, rootDir);
  if (!chain) {
    return { error: `Agent "${agentName}" not found` };
  }

  const agentDir = dirname(chain.agent.path);
  const memoryDir = join(agentDir, "memory");
  const agentsPath = join(agentDir, "AGENTS.md");

  const status: Record<string, unknown> = {
    name: agentName,
    compiled: existsSync(agentsPath),
    compiledAt: existsSync(agentsPath)
      ? statSync(agentsPath).mtime.toISOString()
      : null,
    roles: chain.roles.map((r) => r.name),
    skills: chain.skills.map((s) => s.name),
    tools: chain.tools.map((t) => t.name),
    memory: {},
  };

  if (existsSync(memoryDir)) {
    const memFiles = glob.sync(`${memoryDir}/*.md`, {});
    const memory: Record<string, string> = {};
    for (const f of memFiles.slice(0, 10)) {
      const key = f.split("/").pop()!.replace(".md", "");
      memory[key] = readFileSync(f, "utf-8").slice(0, 500);
    }
    status.memory = memory;
  }

  return status;
}
