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
    vendored?: string;
    "pinned-in"?: string;
    "enforcement-gap"?: EnforcementGap;
}
export interface EnforcementGap {
    reason: string;
    owner?: string;
    revisit?: string;
}
export interface NodeFrontmatter {
    kind: NodeKind;
    name: string;
    description: string;
    requires?: string[];
    fills?: string[];
    "allowed-tools"?: string[];
    authority?: Authority;
    metadata?: Record<string, unknown>;
    connector?: "api" | "mcp" | "local";
    env?: string;
    auth?: string;
    layer?: string;
    models?: string[];
    provenance?: Provenance;
}
export interface ResolvedNode {
    kind: NodeKind;
    name: string;
    path: string;
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
    never: string[];
    decides: string[];
    escalates: string[];
    owns: string[];
    doesNotOwn: string[];
    envVars: string[];
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
