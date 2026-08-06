import type { Program } from "./ast.js";
import type { OntologySymbols } from "./checker.js";
export declare class OntologyStore {
    private db;
    private dbPath;
    private symbols;
    private programs;
    private rootDir;
    constructor(rootDir: string, symbols: OntologySymbols, programs: Program[]);
    open(schemaSQL: string): Promise<{
        ok: boolean;
        dbPath?: string;
        error?: string;
    }>;
    isOpen(): boolean;
    getDbPath(): string;
    writeEntity(kind: string, id: string, fields: Record<string, unknown>, source?: string): {
        ok: boolean;
        error?: string;
    };
    queryConcept(conceptName: string, filters?: Record<string, unknown>): {
        ok: boolean;
        rows?: Record<string, unknown>[];
        sql?: string;
        error?: string;
    };
}
