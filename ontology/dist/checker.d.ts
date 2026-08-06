import type { Program, EntityDecl, DerivedEntityDecl } from "./ast.js";
export interface CheckFinding {
    severity: "error" | "warning" | "gap";
    check: string;
    source: string;
    line: number;
    col: number;
    message: string;
    fix?: string;
}
export interface CheckResult {
    verdict: "VALID" | "VALID-WITH-WARNINGS" | "INVALID";
    findings: CheckFinding[];
}
export interface OntologySymbols {
    types: Map<string, {
        base: string;
        sourcePath: string;
    }>;
    enums: Map<string, {
        values: string[];
        sourcePath: string;
    }>;
    entities: Map<string, {
        decl: EntityDecl | DerivedEntityDecl;
        sourcePath: string;
    }>;
}
export declare function checkPrograms(programs: Program[]): {
    result: CheckResult;
    symbols: OntologySymbols;
};
