import type { NodeKind, ResolvedNode, ResolvedChain, ComposedAuthority, Lockfile, ValidationResult } from "./types.js";
/**
 * Find the typed root file for a node at the given path.
 * Accepts either a directory (looks for AGENT.md etc.) or a flat file path.
 *
 * `baseDir` is the directory `nodePath` is resolved against — per the OAA
 * convention (see every AGENT/ROLE/SKILL template), `requires`/`fills`/
 * `allowed-tools` entries are written relative to the file that declares
 * them ("../../roles/foo" from an AGENT.md two levels under root), not
 * relative to the workspace root. Callers must pass the directory
 * containing the *requiring* node's own file, not the workspace root,
 * or sibling-kind paths one level down from root will resolve outside
 * the tree entirely.
 */
export declare function findNodeFile(nodePath: string, baseDir: string): {
    filePath: string;
    kind: NodeKind;
} | null;
/**
 * Parse a node file into a ResolvedNode.
 */
export declare function parseNode(filePath: string, kind: NodeKind): ResolvedNode;
/**
 * Resolve a node's requires chain recursively, up to the given depth limit.
 * Returns nodes in topological order (deepest dependency first).
 */
export declare function resolveRequires(node: ResolvedNode, rootDir: string, visited?: Set<string>, depth?: number): ResolvedNode[];
/**
 * Resolve the full chain for a named agent.
 * Searches the rootDir for an agent node matching the name.
 */
export declare function resolveChain(agentName: string, rootDir: string): ResolvedChain | null;
export declare function composeAuthority(chain: ResolvedChain): ComposedAuthority;
export declare function renderAgentsMd(chain: ResolvedChain, authority: ComposedAuthority, rootDir: string): string;
export interface McpConfigResult {
    config: {
        mcpServers: Record<string, unknown>;
    };
    missing: string[];
}
/**
 * Merge every required tool's server/mcp.json into one config object,
 * keyed by tool name. Tools without type: "mcp" are skipped (api/local
 * tools aren't launched as separate MCP servers). Tools of type "mcp"
 * missing a server/mcp.json are reported in `missing` rather than
 * silently dropped, since an incomplete --mcp-config breaks the agent
 * at run time without any compile-time signal otherwise.
 */
export declare function buildMcpConfig(chain: ResolvedChain, rootDir: string): McpConfigResult;
export declare function buildLockfile(chain: ResolvedChain, rootDir: string): Lockfile;
export interface CompileResult {
    agentsPath: string;
    lockPath: string;
    mcpConfigPath: string;
    missingMcpConfigs: string[];
    chain: ResolvedChain;
    authority: ComposedAuthority;
    compactNeeded: boolean;
    agentsOrigPath?: string;
}
export declare function compileAgent(agentName: string, rootDir: string): CompileResult;
export declare function validateGraph(rootDir: string): ValidationResult;
export declare function getAgentStatus(agentName: string, rootDir: string): Record<string, unknown>;
