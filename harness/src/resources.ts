import { readFileSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { glob } from "glob";
import matter from "gray-matter";
import type { NodeFrontmatter } from "./types.js";

// ---------------------------------------------------------------------------
// OAA graph exposed as MCP Resources
//
// URI scheme: oaa://
//   oaa://index.json           — catalog of all nodes in the graph
//   oaa://node/<name>          — full content of a named node's typed root file
//   oaa://chain/<agent-name>   — resolved chain for a named agent (JSON)
//   oaa://lock                 — agents.lock contents
//   oaa://ontology             — ONTOLOGY.md contents (if present)
// ---------------------------------------------------------------------------

export interface OaaResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Build the list of available OAA resources from a rootDir.
 */
export function listResources(rootDir: string): OaaResource[] {
  const resources: OaaResource[] = [];

  // Always include the catalog
  resources.push({
    uri: "oaa://index.json",
    name: "OAA Node Catalog",
    description:
      "Catalog of all OAA nodes (agents, roles, skills, tools) in this workspace.",
    mimeType: "application/json",
  });

  // agents.lock
  if (existsSync(join(rootDir, "agents.lock"))) {
    resources.push({
      uri: "oaa://lock",
      name: "agents.lock",
      description: "Integrity lockfile for the OAA graph.",
      mimeType: "application/json",
    });
  }

  // ONTOLOGY.md
  if (existsSync(join(rootDir, "ONTOLOGY.md"))) {
    resources.push({
      uri: "oaa://ontology",
      name: "ONTOLOGY.md",
      description: "Shared vocabulary for the agent graph.",
      mimeType: "text/markdown",
    });
  }

  // Discover all typed root files
  const patterns = [
    "**/{AGENT.md,ROLE.md,SKILL.md,TOOL.md}",
    "**/*.{agent,role,skill,tool}.md",
  ];

  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });

    for (const f of files) {
      const raw = readFileSync(f, "utf-8");
      const { data } = matter(raw);
      const fm = data as NodeFrontmatter;
      const name =
        fm.name ||
        dirname(f).split("/").pop() ||
        f.split("/").pop()!.replace(/\.(agent|role|skill|tool)\.md$/, "");

      resources.push({
        uri: `oaa://node/${name}`,
        name: `${fm.kind || "node"}: ${name}`,
        description: fm.description || `OAA node: ${name}`,
        mimeType: "text/markdown",
      });

      // Also expose AGENTS.md if it exists
      const agentsPath = join(dirname(f), "AGENTS.md");
      if (existsSync(agentsPath) && fm.kind === "agent") {
        resources.push({
          uri: `oaa://chain/${name}`,
          name: `compiled chain: ${name}`,
          description: `Compiled AGENTS.md for agent "${name}".`,
          mimeType: "text/markdown",
        });
      }
    }
  }

  return resources;
}

/**
 * Read the content of a specific OAA resource by URI.
 */
export function readResource(
  uri: string,
  rootDir: string
): { mimeType: string; text: string } {
  if (uri === "oaa://index.json") {
    return {
      mimeType: "application/json",
      text: buildCatalog(rootDir),
    };
  }

  if (uri === "oaa://lock") {
    const lockPath = join(rootDir, "agents.lock");
    if (!existsSync(lockPath)) {
      throw new Error("agents.lock not found. Run compile_agent to generate it.");
    }
    return {
      mimeType: "application/json",
      text: readFileSync(lockPath, "utf-8"),
    };
  }

  if (uri === "oaa://ontology") {
    const ontologyPath = join(rootDir, "ONTOLOGY.md");
    if (!existsSync(ontologyPath)) {
      throw new Error("ONTOLOGY.md not found in workspace root.");
    }
    return {
      mimeType: "text/markdown",
      text: readFileSync(ontologyPath, "utf-8"),
    };
  }

  if (uri.startsWith("oaa://node/")) {
    const nodeName = uri.slice("oaa://node/".length);
    return readNodeByName(nodeName, rootDir);
  }

  if (uri.startsWith("oaa://chain/")) {
    const agentName = uri.slice("oaa://chain/".length);
    return readCompiledChain(agentName, rootDir);
  }

  throw new Error(`Unknown OAA resource URI: ${uri}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCatalog(rootDir: string): string {
  const patterns = [
    "**/{AGENT.md,ROLE.md,SKILL.md,TOOL.md}",
    "**/*.{agent,role,skill,tool}.md",
  ];

  const catalog: Array<{
    name: string;
    kind: string;
    description: string;
    path: string;
    uri: string;
  }> = [];

  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });

    for (const f of files) {
      const raw = readFileSync(f, "utf-8");
      const { data } = matter(raw);
      const fm = data as NodeFrontmatter;
      const name =
        fm.name ||
        dirname(f).split("/").pop() ||
        f.split("/").pop()!.replace(/\.(agent|role|skill|tool)\.md$/, "");

      catalog.push({
        name,
        kind: fm.kind || "unknown",
        description: fm.description || "",
        path: relative(rootDir, f).replace(/\\/g, "/"),
        uri: `oaa://node/${name}`,
      });
    }
  }

  return JSON.stringify(
    {
      catalogVersion: 1,
      rootDir,
      nodeCount: catalog.length,
      nodes: catalog,
    },
    null,
    2
  );
}

function readNodeByName(
  nodeName: string,
  rootDir: string
): { mimeType: string; text: string } {
  const patterns = [
    "**/{AGENT.md,ROLE.md,SKILL.md,TOOL.md}",
    "**/*.{agent,role,skill,tool}.md",
  ];

  for (const pattern of patterns) {
    const files = glob.sync(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });

    for (const f of files) {
      const raw = readFileSync(f, "utf-8");
      const { data } = matter(raw);
      const fm = data as NodeFrontmatter;
      const name =
        fm.name ||
        dirname(f).split("/").pop() ||
        f.split("/").pop()!.replace(/\.(agent|role|skill|tool)\.md$/, "");

      if (name === nodeName || name.toLowerCase() === nodeName.toLowerCase()) {
        return { mimeType: "text/markdown", text: raw };
      }
    }
  }

  throw new Error(`Node "${nodeName}" not found in OAA graph at ${rootDir}`);
}

function readCompiledChain(
  agentName: string,
  rootDir: string
): { mimeType: string; text: string } {
  const agentFiles = glob.sync("**/{AGENT.md,*.agent.md}", {
    cwd: rootDir,
    absolute: true,
  });

  for (const f of agentFiles) {
    const raw = readFileSync(f, "utf-8");
    const { data } = matter(raw);
    const fm = data as NodeFrontmatter;
    const name = fm.name || dirname(f).split("/").pop() || "";

    if (name === agentName || name.toLowerCase() === agentName.toLowerCase()) {
      const agentsPath = join(dirname(f), "AGENTS.md");
      if (!existsSync(agentsPath)) {
        throw new Error(
          `AGENTS.md not found for "${agentName}". Run compile_agent first.`
        );
      }
      return {
        mimeType: "text/markdown",
        text: readFileSync(agentsPath, "utf-8"),
      };
    }
  }

  throw new Error(`Agent "${agentName}" not found.`);
}
