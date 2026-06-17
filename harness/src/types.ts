// Core OAA node types

export type NodeKind = "agent" | "role" | "skill" | "tool" | "noun";

export interface Authority {
  owns?: string[];
  decides?: string[];
  escalates?: string[];
  never?: string[];
  watches?: string[];
}

export interface Provenance {
  source?: string;
  status?: "first-party" | "third-party" | string;
  vendored?: string;        // Path to where the REAL implementation lives,
                            // relative to the tool dir (or a file://... path
                            // into a sibling repo). Works for every tool
                            // type: a vendored third-party SDK copy for
                            // type: mcp, or a pointer to first-party backing
                            // code (e.g. the API endpoint files that actually
                            // enforce a never rule) for type: api / local.
  "pinned-in"?: string;     // e.g. "agents.lock"
  "enforcement-gap"?: EnforcementGap; // Acknowledged, justified absence of an
                            // enforcement anchor for this tool's
                            // authority.never rules. Documents the decision
                            // not to build a proxy/scripts/vendored backing
                            // yet, instead of leaving it as either a silent
                            // gap or a deleted (and now undocumented) never
                            // rule. See validateGraph's Tool Wiring check.
}

export interface EnforcementGap {
  reason: string;   // why no enforcement anchor exists yet — required;
                     // an empty/missing reason does not count as acknowledged
  owner?: string;    // who is accountable for closing this gap
  revisit?: string;  // ISO date (YYYY-MM-DD) to re-check whether it's closed;
                     // once past, the finding escalates from "gap" back to
                     // "warning" so it can't be acknowledged once and forgotten
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
  provenance?: Provenance;
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
