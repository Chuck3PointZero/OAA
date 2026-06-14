// Core OAA node types

export type NodeKind = "agent" | "role" | "skill" | "tool" | "noun";

export interface Authority {
  owns?: string[];
  decides?: string[];
  escalates?: string[];
  never?: string[];
  watches?: string[];
}

export interface NodeFrontmatter {
  kind: NodeKind;
  name: string;
  description: string;
  requires?: string[];
  fills?: string[];          // agent alias for requires
  "allowed-tools"?: string[]; // skill alias for requires (agentskills.io compat)
  authority?: Authority;
  metadata?: Record<string, unknown>;
  type?: "api" | "mcp" | "local";
  env?: string;
  auth?: string;
  layer?: string;
  models?: string;
}

export interface ResolvedNode {
  kind: NodeKind;
  name: string;
  path: string;        // absolute path to the typed root file
  frontmatter: NodeFrontmatter;
  body: string;
}

export interface ResolvedChain {
  agent: ResolvedNode;
  roles: ResolvedNode[];
  skills: ResolvedNode[];
  tools: ResolvedNode[];
}

export interface ComposedAuthority {
  never: string[];       // union of all tool/role never fields
  decides: string[];     // intersection of all role decides fields
  escalates: string[];   // union of all role/skill escalates fields
  owns: string[];        // union of all role owns fields
  doesNotOwn: string[];  // role never fields (non-ownership boundaries)
  envVars: string[];     // all env variable names from tools
}

export interface LockfileEntry {
  kind: NodeKind;
  resolved: string;
  integrity: string;
  requires: string[];
  upstream?: string;
  vendored?: string;
}

export interface Lockfile {
  lockfileVersion: number;
  nodes: Record<string, LockfileEntry>;
}

export interface ValidationFinding {
  severity: "error" | "warning" | "gap";
  check: string;
  file: string;
  message: string;
  fix?: string;
}

export interface ValidationResult {
  verdict: "VALID" | "VALID-WITH-WARNINGS" | "INVALID";
  findings: ValidationFinding[];
  resolvedChains?: ResolvedChain[];
}
